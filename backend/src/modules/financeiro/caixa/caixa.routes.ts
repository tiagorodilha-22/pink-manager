import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'

export default async function caixaRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // Saldo e lançamentos do dia
  app.get('/dia', async (req) => {
    const { data } = req.query as { data?: string }
    const dia = data ? new Date(data) : new Date()
    const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate())
    const fim = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1)

    const lancamentos = await prisma.lancamentoCaixa.findMany({
      where: { data: { gte: inicio, lt: fim } },
      orderBy: { data: 'asc' },
    })

    const entradas = lancamentos
      .filter(l => l.tipo === 'ENTRADA')
      .reduce((s, l) => s + Number(l.valor), 0)
    const saidas = lancamentos
      .filter(l => ['SAIDA', 'SANGRIA'].includes(l.tipo))
      .reduce((s, l) => s + Number(l.valor), 0)

    return { lancamentos, entradas, saidas, saldo: entradas - saidas }
  })

  // Lançamento manual (sangria, despesa, depósito)
  app.post('/', async (req, reply) => {
    const data = z.object({
      tipo: z.enum(['ENTRADA', 'SAIDA', 'SANGRIA', 'DEPOSITO']),
      valor: z.number().positive(),
      descricao: z.string().min(1),
      osId: z.string().uuid().optional(),
    }).parse(req.body)

    const lancamento = await prisma.lancamentoCaixa.create({ data })
    return reply.status(201).send(lancamento)
  })
}
