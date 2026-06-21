import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../shared/prisma'
import { authenticate } from '../../shared/auth.middleware'
import { AppError, NotFoundError } from '../../shared/errors'

const STATUS_FLOW: Record<string, string[]> = {
  RECEPCAO:              ['DIAGNOSTICO', 'CANCELADA'],
  DIAGNOSTICO:           ['AGUARDANDO_APROVACAO', 'CANCELADA'],
  AGUARDANDO_APROVACAO:  ['APROVADA', 'CANCELADA'],
  APROVADA:              ['EM_MANUTENCAO', 'CANCELADA'],
  EM_MANUTENCAO:         ['VALIDACAO'],
  VALIDACAO:             ['AGUARDANDO_RETIRADA', 'EM_MANUTENCAO'],
  AGUARDANDO_RETIRADA:   ['ENTREGUE'],
  ENTREGUE:              [],
  CANCELADA:             [],
}

export default async function osRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // Listar OS com filtros
  app.get('/', async (req) => {
    const { status, veiculoId } = req.query as { status?: string; veiculoId?: string }
    return prisma.ordemServico.findMany({
      where: {
        ...(status && { status: status as never }),
        ...(veiculoId && { veiculoId }),
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
        diagnostico: true,
        orcamento: { include: { itens: { include: { fornecedor: true } } } },
        itens: true,
        pagamentos: { include: { parcelas: true } },
        historico: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!os) throw new NotFoundError('OS')
    return os
  })

  // Abrir OS (a partir de agendamento ou direta)
  app.post('/', async (req, reply) => {
    const data = z.object({
      veiculoId: z.string().uuid(),
      agendamentoId: z.string().uuid().optional(),
      queixa: z.string().min(1),
      dataPrevista: z.string().datetime().optional(),
      observacoes: z.string().optional(),
    }).parse(req.body)

    const os = await prisma.ordemServico.create({
      data: {
        veiculoId: data.veiculoId,
        agendamentoId: data.agendamentoId,
        queixa: data.queixa,
        dataPrevista: data.dataPrevista ? new Date(data.dataPrevista) : undefined,
        observacoes: data.observacoes,
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

    const [osAtualizada] = await prisma.$transaction([
      prisma.ordemServico.update({
        where: { id },
        data: {
          status,
          ...(status === 'ENTREGUE' && { dataEntrega: new Date() }),
        },
      }),
      prisma.historicoOS.create({
        data: { osId: id, statusAntes: os.status, statusDepois: status, obs },
      }),
    ])

    return osAtualizada
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
