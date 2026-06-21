import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { NotFoundError } from '../../../shared/errors'

const agendamentoSchema = z.object({
  clienteId: z.string().uuid(),
  veiculoId: z.string().uuid(),
  dataHora: z.string().datetime(),
  tipoServico: z.string().min(1),
  queixa: z.string().optional(),
})

export default async function agendamentosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const { data, status } = req.query as { data?: string; status?: string }
    const where: Record<string, unknown> = {}
    if (data) {
      const inicio = new Date(data)
      const fim = new Date(data)
      fim.setDate(fim.getDate() + 1)
      where.dataHora = { gte: inicio, lt: fim }
    }
    if (status) where.status = status
    return prisma.agendamento.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        veiculo: { select: { id: true, placa: true, modelo: true, marca: true } },
      },
      orderBy: { dataHora: 'asc' },
    })
  })

  app.post('/', async (req, reply) => {
    const data = agendamentoSchema.parse(req.body)
    const agendamento = await prisma.agendamento.create({
      data: { ...data, dataHora: new Date(data.dataHora) },
      include: {
        cliente: { select: { nome: true } },
        veiculo: { select: { placa: true, modelo: true } },
      },
    })
    return reply.status(201).send(agendamento)
  })

  app.patch('/:id/status', async (req) => {
    const { id } = req.params as { id: string }
    const { status } = z.object({
      status: z.enum(['PENDENTE', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']),
    }).parse(req.body)
    const agendamento = await prisma.agendamento.findUnique({ where: { id } })
    if (!agendamento) throw new NotFoundError('Agendamento')
    return prisma.agendamento.update({ where: { id }, data: { status } })
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.agendamento.update({ where: { id }, data: { status: 'CANCELADO' } })
    return reply.status(204).send()
  })
}
