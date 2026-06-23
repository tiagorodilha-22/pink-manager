import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../shared/prisma'
import { AppError, NotFoundError } from '../../shared/errors'

export default async function portalRoutes(app: FastifyInstance) {
  // ── Dados públicos da OS pelo token ─────────────────────────
  app.get('/:token', async (req) => {
    const { token } = req.params as { token: string }

    const os = await prisma.ordemServico.findUnique({
      where: { portalToken: token },
      include: {
        veiculo: {
          include: {
            cliente: { select: { nome: true, telefone: true, genero: true } },
          },
        },
        orcamento: { include: { itens: true } },
        historico: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!os) throw new NotFoundError('Link inválido ou expirado')

    const manutencoes = await prisma.manutencaoVeiculo.findMany({
      where:   { veiculoId: os.veiculoId, osNumero: os.numero },
      include: { fotos: { orderBy: { createdAt: 'asc' } } },
    })

    // Não expõe campos internos desnecessários
    return {
      numero:       os.numero,
      status:       os.status,
      dataEntrada:  os.dataEntrada,
      dataEntrega:  os.dataEntrega,
      queixa:       os.queixa,
      observacoes:  os.observacoes,
      veiculo: {
        marca:    os.veiculo.marca,
        modelo:   os.veiculo.modelo,
        ano:      os.veiculo.ano,
        placa:    os.veiculo.placa,
        cor:      os.veiculo.cor,
        cliente: {
          nome:    os.veiculo.cliente.nome,
          genero:  os.veiculo.cliente.genero,
        },
      },
      orcamento:    os.orcamento,
      historico:    os.historico,
      manutencoes,
    }
  })

  // ── Aprovar / recusar orçamento pelo cliente ─────────────────
  app.post('/:token/aprovar', async (req) => {
    const { token } = req.params as { token: string }
    const { aprovado, obs } = z.object({
      aprovado: z.boolean(),
      obs:      z.string().optional(),
    }).parse(req.body)

    const os = await prisma.ordemServico.findUnique({
      where:   { portalToken: token },
      include: { orcamento: true },
    })
    if (!os)         throw new NotFoundError('Link inválido ou expirado')
    if (!os.orcamento) throw new AppError('OS sem orçamento', 400)
    if (os.status !== 'AGUARDANDO_APROVACAO') {
      throw new AppError('Este orçamento não está mais aguardando aprovação', 400)
    }

    const statusOrc = aprovado ? 'APROVADO'  : 'REPROVADO'
    const statusOS  = aprovado ? 'APROVADA'  : 'AGUARDANDO_APROVACAO'
    const obsAuto   = aprovado
      ? 'Orçamento aprovado pelo cliente via portal'
      : (obs || 'Orçamento recusado pelo cliente via portal')

    await prisma.$transaction([
      prisma.orcamento.update({ where: { id: os.orcamento.id }, data: { status: statusOrc } }),
      prisma.ordemServico.update({ where: { id: os.id }, data: { status: statusOS } }),
      prisma.historicoOS.create({ data: { osId: os.id, statusAntes: os.status, statusDepois: statusOS, obs: obsAuto } }),
    ])

    return { aprovado, statusOS }
  })
}
