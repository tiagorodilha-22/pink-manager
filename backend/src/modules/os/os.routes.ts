import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import prisma from '../../shared/prisma'
import { authenticate } from '../../shared/auth.middleware'
import { AppError, NotFoundError } from '../../shared/errors'
import { disparar } from '../notificacoes/notificacoes.service'
import { storeFile, removeFile, fetchFile, publicUrl, fileExists } from '../../shared/storage.service'

const STATUS_FLOW: Record<string, string[]> = {
  RECEPCAO:              ['DIAGNOSTICO', 'CANCELADA'],
  DIAGNOSTICO:           ['AGUARDANDO_APROVACAO', 'RECEPCAO', 'CANCELADA'],
  AGUARDANDO_APROVACAO:  ['APROVADA', 'DIAGNOSTICO', 'CANCELADA'],
  APROVADA:              ['EM_MANUTENCAO', 'AGUARDANDO_APROVACAO', 'CANCELADA'],
  EM_MANUTENCAO:         ['VALIDACAO', 'APROVADA'],
  VALIDACAO:             ['AGUARDANDO_RETIRADA', 'EM_MANUTENCAO'],
  AGUARDANDO_RETIRADA:   ['ENTREGUE', 'VALIDACAO'],
  ENTREGUE:              [],
  CANCELADA:             [],
}

export default async function osRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // Listar OS com filtros
  app.get('/', async (req) => {
    const { status, veiculoId } = req.query as { status?: string; veiculoId?: string }
    const filialId = req.user.filialId
    return prisma.ordemServico.findMany({
      where: {
        ...(status && { status: status as never }),
        ...(veiculoId && { veiculoId }),
        ...(filialId && { filialId }),
      },
      include: {
        veiculo: { include: { cliente: { select: { nome: true, telefone: true } } } },
        pagamentos: { select: { id: true, valor: true, metodo: true, statusConcil: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  // Detalhe da OS
  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        veiculo: { include: { cliente: true } },
        checklist: true,
        diagnostico: { include: { fotos: { orderBy: { createdAt: 'asc' } } } },
        orcamento: { include: { itens: { include: { fornecedor: true } } } },
        itens: true,
        pagamentos: { include: { parcelas: true } },
        historico:   { orderBy: { createdAt: 'desc' } },
        sugestoesIA: { orderBy: { ordem: 'asc' } },
      },
    })
    if (!os) throw new NotFoundError('OS')
    return os
  })

  // Abrir OS (a partir de agendamento ou direta)
  app.post('/', async (req, reply) => {
    const data = z.object({
      veiculoId:     z.string().uuid(),
      agendamentoId: z.string().uuid().optional(),
      servicoId:     z.string().uuid().optional(),
      queixa:        z.string().min(1),
      dataPrevista:  z.string().datetime().optional(),
      observacoes:   z.string().optional(),
    }).parse(req.body)

    const ultimo = await prisma.ordemServico.findFirst({ orderBy: { numero: 'desc' }, select: { numero: true } })
    const proximoNumero = (ultimo?.numero ?? 0) + 1

    let valorTotalInicial = 0
    if (data.servicoId) {
      const servico = await prisma.servico.findUnique({ where: { id: data.servicoId } })
      if (servico) valorTotalInicial = servico.precoBase + servico.precoHora * servico.duracaoHoras
    }

    const os = await prisma.ordemServico.create({
      data: {
        numero:        proximoNumero,
        veiculoId:     data.veiculoId,
        agendamentoId: data.agendamentoId,
        servicoId:     data.servicoId,
        filialId:      req.user.filialId ?? undefined,
        queixa:        data.queixa,
        dataPrevista:  data.dataPrevista ? new Date(data.dataPrevista) : undefined,
        observacoes:   data.observacoes,
        valorTotal:    valorTotalInicial,
        historico: { create: { statusDepois: 'RECEPCAO' } },
      },
      include: { veiculo: { include: { cliente: true } } },
    })

    if (data.agendamentoId) {
      await prisma.agendamento.update({
        where: { id: data.agendamentoId },
        data: { status: 'EM_ANDAMENTO' },
      })
    }

    return reply.status(201).send(os)
  })

  // Avançar status
  app.patch('/:id/status', async (req) => {
    const { id } = req.params as { id: string }
    const { status, obs } = z.object({
      status: z.enum(['RECEPCAO','DIAGNOSTICO','AGUARDANDO_APROVACAO','APROVADA','EM_MANUTENCAO','VALIDACAO','AGUARDANDO_RETIRADA','ENTREGUE','CANCELADA']),
      obs: z.string().optional(),
    }).parse(req.body)

    const os = await prisma.ordemServico.findUnique({ where: { id } })
    if (!os) throw new NotFoundError('OS')

    const permitidos = STATUS_FLOW[os.status] ?? []
    if (!permitidos.includes(status)) {
      throw new AppError(`Transição ${os.status} → ${status} não permitida`)
    }

    // Auto-gera portal token quando entra em AGUARDANDO_APROVACAO
    const novoPortalToken = (status === 'AGUARDANDO_APROVACAO' && !os.portalToken)
      ? crypto.randomUUID()
      : undefined

    const [osAtualizada] = await prisma.$transaction([
      prisma.ordemServico.update({
        where: { id },
        data: {
          status,
          ...(status === 'ENTREGUE'              && { dataEntrega: new Date() }),
          ...(novoPortalToken                    && { portalToken: novoPortalToken }),
        },
      }),
      prisma.historicoOS.create({
        data: { osId: id, statusAntes: os.status, statusDepois: status, obs },
      }),
    ])

    // Notificação automática — fire-and-forget
    ;(async () => {
      try {
        const osFull = await prisma.ordemServico.findUnique({
          where:   { id },
          include: {
            veiculo:   { include: { cliente: true } },
            avaliacao: { select: { token: true } },
          },
        })
        if (!osFull) return

        const frontUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
        const portalTk = novoPortalToken ?? osFull.portalToken
        await disparar(status, {
          clienteNome:      osFull.veiculo.cliente.nome,
          clienteTelefone:  osFull.veiculo.cliente.telefone,
          clienteEmail:     osFull.veiculo.cliente.email,
          veiculoMarca:     osFull.veiculo.marca,
          veiculoModelo:    osFull.veiculo.modelo,
          veiculoPlaca:     osFull.veiculo.placa,
          osNumero:         osFull.numero,
          osValorTotal:     Number(osFull.valorTotal),
          nomeOficina:      process.env.NOME_OFICINA ?? 'Pink Manager',
          portalLink:       portalTk       ? `${frontUrl}/portal/${portalTk}`          : undefined,
          avaliacaoLink:    osFull.avaliacao?.token ? `${frontUrl}/avaliar/${osFull.avaliacao.token}` : undefined,
        })
      } catch { /* notificação nunca bloqueia o fluxo */ }
    })()

    return osAtualizada
  })

  // ── Gerar token do portal do cliente ───────────────────────
  app.post('/:id/portal/gerar', async (req) => {
    const { id } = req.params as { id: string }
    const os = await prisma.ordemServico.findUnique({ where: { id }, select: { portalToken: true } })
    if (!os) throw new NotFoundError('OS')
    if (os.portalToken) return { token: os.portalToken }
    const token = crypto.randomUUID()
    await prisma.ordemServico.update({ where: { id }, data: { portalToken: token } })
    return { token }
  })

  // Checklist de entrada
  app.put('/:id/checklist', async (req) => {
    const { id } = req.params as { id: string }
    const { itens } = z.object({
      itens: z.array(z.object({ campo: z.string(), valor: z.boolean(), obs: z.string().optional() })),
    }).parse(req.body)

    await prisma.checklistItem.deleteMany({ where: { osId: id } })
    await prisma.checklistItem.createMany({ data: itens.map(i => ({ ...i, osId: id })) })
    return prisma.checklistItem.findMany({ where: { osId: id } })
  })

  // ── Sugestões IA ─────────────────────────────────────────
  app.post('/:id/sugestoes-ia', async (req, reply) => {
    const { id } = req.params as { id: string }
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: { veiculo: true },
    })
    if (!os) throw new NotFoundError('OS')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new AppError('ANTHROPIC_API_KEY não configurada', 503)

    const anthropic = new Anthropic({ apiKey })
    const veiculo = `${os.veiculo.marca} ${os.veiculo.modelo} ${os.veiculo.ano}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `Você é um mecânico especialista no Brasil. Ao receber a queixa de um cliente sobre seu veículo, gere uma lista objetiva de verificações técnicas que o técnico deve realizar para diagnosticar e resolver o problema. Seja prático e específico. Retorne entre 5 e 10 itens.`,
      tools: [{
        name: 'listar_verificacoes',
        description: 'Lista as verificações técnicas a realizar',
        input_schema: {
          type: 'object' as const,
          properties: {
            verificacoes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  descricao:  { type: 'string', description: 'O que verificar — direto e claro para o técnico' },
                  prioridade: { type: 'string', enum: ['ALTA', 'MEDIA', 'BAIXA'], description: 'ALTA = causa provável, MEDIA = verificar em seguida, BAIXA = descartar' },
                },
                required: ['descricao', 'prioridade'],
              },
              minItems: 5,
              maxItems: 10,
            },
          },
          required: ['verificacoes'],
        },
      }],
      tool_choice: { type: 'tool', name: 'listar_verificacoes' },
      messages: [{ role: 'user', content: `Queixa do cliente: "${os.queixa}"\nVeículo: ${veiculo}` }],
    })

    const toolUse = response.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') throw new AppError('IA não retornou resultado')

    const { verificacoes } = toolUse.input as { verificacoes: { descricao: string; prioridade: string }[] }

    await prisma.sugestaoIA.deleteMany({ where: { osId: id } })
    const criadas = await prisma.$transaction(
      verificacoes.map((v, i) =>
        prisma.sugestaoIA.create({ data: { osId: id, descricao: v.descricao, prioridade: v.prioridade, ordem: i } })
      )
    )

    return reply.status(201).send(criadas)
  })

  app.patch('/sugestoes-ia/:sugestaoId', async (req) => {
    const { sugestaoId } = req.params as { sugestaoId: string }
    const s = await prisma.sugestaoIA.findUnique({ where: { id: sugestaoId } })
    if (!s) throw new NotFoundError('Sugestão')
    return prisma.sugestaoIA.update({ where: { id: sugestaoId }, data: { feito: !s.feito } })
  })

  // ── Fotos do diagnóstico ──────────────────────────────────────

  // Servir foto (rota estática antes do param genérico)
  app.get('/diagnostico/foto/:fotoId', { onRequest: [] }, async (req, reply) => {
    const { fotoId } = req.params as { fotoId: string }
    const foto = await prisma.fotoDiagnostico.findUnique({ where: { id: fotoId } })
    if (!foto) throw new NotFoundError('Foto')

    const url = publicUrl(foto.filename)
    if (url) return reply.redirect(url)

    if (!fileExists(foto.filename)) throw new NotFoundError('Arquivo')
    const buffer = await fetchFile(foto.filename)
    const ext    = foto.filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    reply.header('Content-Type', `image/${ext === 'jpg' ? 'jpeg' : ext}`)
    reply.header('Cache-Control', 'public, max-age=86400')
    return reply.send(buffer)
  })

  // Upload de foto no diagnóstico
  app.post('/:id/diagnostico/foto', async (req, reply) => {
    const { id } = req.params as { id: string }
    let diag = await prisma.diagnostico.findUnique({ where: { osId: id } })
    if (!diag) {
      const os = await prisma.ordemServico.findUnique({ where: { id } })
      if (!os) throw new NotFoundError('OS')
      diag = await prisma.diagnostico.create({ data: { osId: id, descricao: '' } })
    }

    type MultipartPart = {
      type: string; fieldname: string; value?: string
      filename?: string; mimetype?: string; toBuffer?: () => Promise<Buffer>
    }
    const parts = (req as unknown as { parts(): AsyncIterable<MultipartPart> }).parts()

    let fileData: { filename: string; buffer: Buffer } | null = null
    for await (const part of parts) {
      if (part.type === 'file' && part.toBuffer) {
        const buffer = await part.toBuffer()
        fileData = { filename: part.filename ?? 'foto.jpg', buffer }
      }
    }

    if (!fileData) throw new AppError('Nenhum arquivo enviado', 400)

    const ext      = fileData.filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filename = `diag-${diag.id}-${crypto.randomUUID()}.${ext}`
    await storeFile(filename, fileData.buffer)

    const foto = await prisma.fotoDiagnostico.create({ data: { diagnosticoId: diag.id, filename } })
    return reply.status(201).send(foto)
  })

  // Deletar foto do diagnóstico
  app.delete('/diagnostico/foto/:fotoId', async (req, reply) => {
    const { fotoId } = req.params as { fotoId: string }
    const foto = await prisma.fotoDiagnostico.findUnique({ where: { id: fotoId } })
    if (!foto) throw new NotFoundError('Foto')
    await prisma.fotoDiagnostico.delete({ where: { id: fotoId } })
    await removeFile(foto.filename)
    return reply.status(204).send()
  })

  // Diagnóstico
  app.put('/:id/diagnostico', async (req) => {
    const { id } = req.params as { id: string }
    const data = z.object({ descricao: z.string().min(1), tecnicoNome: z.string().optional() }).parse(req.body)
    return prisma.diagnostico.upsert({
      where: { osId: id },
      update: data,
      create: { ...data, osId: id },
    })
  })

  // Orçamento
  app.put('/:id/orcamento', async (req) => {
    const { id } = req.params as { id: string }
    const body = z.object({
      prazoEntrega: z.string().datetime().optional(),
      observacoes: z.string().optional(),
      itens: z.array(z.object({
        tipo: z.enum(['PECA', 'MAO_OBRA', 'OUTROS']),
        descricao: z.string(),
        quantidade: z.number().positive(),
        valorUnit: z.number().positive(),
        fornecedorId: z.string().uuid().optional(),
      })),
    }).parse(req.body)

    const itensComTotal = body.itens.map(i => ({
      ...i,
      valorTotal: i.quantidade * i.valorUnit,
    }))

    const valorPecas = itensComTotal
      .filter(i => i.tipo === 'PECA')
      .reduce((s, i) => s + i.valorTotal, 0)
    const valorMO = itensComTotal
      .filter(i => i.tipo === 'MAO_OBRA')
      .reduce((s, i) => s + i.valorTotal, 0)
    const valorTotal = valorPecas + valorMO +
      itensComTotal.filter(i => i.tipo === 'OUTROS').reduce((s, i) => s + i.valorTotal, 0)

    return prisma.$transaction(async (tx) => {
      const orcamento = await tx.orcamento.upsert({
        where: { osId: id },
        update: { valorPecas, valorMO, valorTotal, prazoEntrega: body.prazoEntrega ? new Date(body.prazoEntrega) : undefined, observacoes: body.observacoes, status: 'PENDENTE' },
        create: { osId: id, valorPecas, valorMO, valorTotal, prazoEntrega: body.prazoEntrega ? new Date(body.prazoEntrega) : undefined, observacoes: body.observacoes },
      })
      await tx.itemOrcamento.deleteMany({ where: { orcamentoId: orcamento.id } })
      await tx.itemOrcamento.createMany({
        data: itensComTotal.map(i => ({ ...i, orcamentoId: orcamento.id })),
      })
      await tx.ordemServico.update({ where: { id }, data: { valorTotal } })
      return tx.orcamento.findUnique({ where: { id: orcamento.id }, include: { itens: true } })
    })
  })

  // Aprovação do orçamento
  app.patch('/:id/orcamento/aprovacao', async (req) => {
    const { id } = req.params as { id: string }
    const { aprovado } = z.object({ aprovado: z.boolean() }).parse(req.body)
    const os = await prisma.ordemServico.findUnique({ where: { id }, include: { orcamento: true } })
    if (!os?.orcamento) throw new AppError('OS sem orçamento')

    const statusOrc = aprovado ? 'APROVADO' : 'REPROVADO'
    const statusOS = aprovado ? 'APROVADA' : 'AGUARDANDO_APROVACAO'

    await prisma.$transaction([
      prisma.orcamento.update({ where: { id: os.orcamento.id }, data: { status: statusOrc } }),
      prisma.ordemServico.update({ where: { id }, data: { status: statusOS } }),
      prisma.historicoOS.create({ data: { osId: id, statusAntes: os.status, statusDepois: statusOS, obs: aprovado ? 'Orçamento aprovado pelo cliente' : 'Orçamento reprovado pelo cliente' } }),
    ])

    return { aprovado, statusOS }
  })
}
