import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import dayjs from 'dayjs'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { AppError } from '../../../shared/errors'

// Janela de tolerância para matching por valor+data
const JANELA_DIAS = 3
const TOLERANCIA_VALOR = 0.01

export default async function conciliacaoRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // Dashboard de conciliação
  app.get('/dashboard', async () => {
    const [pendentes, conciliados, naoIdentificados] = await Promise.all([
      prisma.pagamento.count({ where: { statusConcil: 'PENDENTE', metodo: { not: 'DINHEIRO' } } }),
      prisma.pagamento.count({ where: { statusConcil: 'CONCILIADO' } }),
      prisma.pagamento.count({ where: { statusConcil: 'NAO_IDENTIFICADO' } }),
    ])
    const extratoNaoConciliado = await prisma.lancamentoExtrato.count({ where: { conciliado: false } })
    const recebiveis = await prisma.parcelaReceber.aggregate({
      where: { conciliado: false },
      _sum: { valor: true },
    })

    return { pendentes, conciliados, naoIdentificados, extratoNaoConciliado, totalReceber: recebiveis._sum.valor ?? 0 }
  })

  // Executar conciliação automática
  app.post('/executar', async (_req, reply) => {
    const resultado = await executarConciliacao()
    return reply.send(resultado)
  })

  // Conciliação manual — liga um pagamento a um lançamento do extrato
  app.post('/manual', async (req, reply) => {
    const { pagamentoId, lancamentoId } = z.object({
      pagamentoId: z.string().uuid(),
      lancamentoId: z.string().uuid(),
    }).parse(req.body)

    const [pagamento, lancamento] = await Promise.all([
      prisma.pagamento.findUnique({ where: { id: pagamentoId } }),
      prisma.lancamentoExtrato.findUnique({ where: { id: lancamentoId } }),
    ])

    if (!pagamento) throw new AppError('Pagamento não encontrado', 404)
    if (!lancamento) throw new AppError('Lançamento não encontrado', 404)

    await prisma.$transaction([
      prisma.conciliacao.create({
        data: {
          pagamentoId,
          lancamentoId,
          valorConcil: pagamento.valor,
          tipoMatch: 'MANUAL',
        },
      }),
      prisma.pagamento.update({ where: { id: pagamentoId }, data: { statusConcil: 'CONCILIADO' } }),
      prisma.lancamentoExtrato.update({ where: { id: lancamentoId }, data: { conciliado: true } }),
      prisma.parcelaReceber.updateMany({
        where: { pagamentoId, conciliado: false },
        data: { conciliado: true, dataRecebida: new Date(), lancamentoId },
      }),
    ])

    return reply.status(201).send({ conciliado: true, tipoMatch: 'MANUAL' })
  })

  // Pagamentos pendentes de conciliação
  app.get('/pendentes', async () => {
    return prisma.pagamento.findMany({
      where: { statusConcil: { in: ['PENDENTE', 'PARCIAL'] }, metodo: { not: 'DINHEIRO' } },
      include: {
        os: { select: { numero: true, veiculo: { include: { cliente: { select: { nome: true } } } } } },
        parcelas: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  })

  // Lançamentos do extrato não conciliados
  app.get('/extrato-pendente', async () => {
    return prisma.lancamentoExtrato.findMany({
      where: { conciliado: false },
      orderBy: { data: 'desc' },
    })
  })
}

// ─── Conciliação automática ──────────────────────────────────────────────────

async function executarConciliacao() {
  let automaticos = 0
  let semMatch = 0

  // Busca parcelas não conciliadas
  const parcelas = await prisma.parcelaReceber.findMany({
    where: { conciliado: false },
    include: { pagamento: true },
  })

  for (const parcela of parcelas) {
    const { pagamento } = parcela

    // 1. Match por NSU (mais confiável)
    if (pagamento.nsu) {
      const lancamento = await prisma.lancamentoExtrato.findFirst({
        where: { nsuRef: pagamento.nsu, conciliado: false },
      })
      if (lancamento) {
        await conciliar(parcela.pagamentoId, lancamento.id, pagamento.valor, parcela.id)
        automaticos++
        continue
      }
    }

    // 2. Match por valor + janela de data (PIX e transferências)
    if (['PIX', 'TRANSFERENCIA'].includes(pagamento.metodo)) {
      const dataInicio = dayjs(parcela.dataPrevista).subtract(JANELA_DIAS, 'day').toDate()
      const dataFim = dayjs(parcela.dataPrevista).add(JANELA_DIAS, 'day').toDate()
      const valorMin = Number(pagamento.valor) - TOLERANCIA_VALOR
      const valorMax = Number(pagamento.valor) + TOLERANCIA_VALOR

      const lancamento = await prisma.lancamentoExtrato.findFirst({
        where: {
          conciliado: false,
          origem: 'INTER_OFX',
          data: { gte: dataInicio, lte: dataFim },
          valor: { gte: valorMin, lte: valorMax },
        },
      })

      if (lancamento) {
        await conciliar(parcela.pagamentoId, lancamento.id, pagamento.valor, parcela.id)
        automaticos++
        continue
      }
    }

    semMatch++
  }

  return { automaticos, semMatch, total: parcelas.length }
}

async function conciliar(pagamentoId: string, lancamentoId: string, valor: unknown, parcelaId: string) {
  await prisma.$transaction([
    prisma.conciliacao.create({
      data: { pagamentoId, lancamentoId, valorConcil: valor as never, tipoMatch: 'AUTOMATICO' },
    }),
    prisma.pagamento.update({ where: { id: pagamentoId }, data: { statusConcil: 'CONCILIADO' } }),
    prisma.lancamentoExtrato.update({ where: { id: lancamentoId }, data: { conciliado: true } }),
    prisma.parcelaReceber.update({
      where: { id: parcelaId },
      data: { conciliado: true, dataRecebida: new Date(), lancamentoId },
    }),
  ])
}
