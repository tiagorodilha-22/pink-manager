import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { NotFoundError } from '../../../shared/errors'

const CATEGORIAS = ['FORNECEDOR', 'ALUGUEL', 'SALARIO', 'UTILIDADE', 'IMPOSTO', 'OUTROS'] as const

const contaSchema = z.object({
  descricao:      z.string().min(1),
  categoria:      z.enum(CATEGORIAS).default('OUTROS'),
  valor:          z.number().positive(),
  dataVencimento: z.string().datetime(),
  observacoes:    z.string().optional(),
})

function computarStatus(conta: { dataVencimento: Date; dataPagamento: Date | null; status: string }) {
  if (conta.status === 'CANCELADO') return 'CANCELADO'
  if (conta.dataPagamento) return 'PAGO'
  return conta.dataVencimento < new Date() ? 'VENCIDO' : 'PENDENTE'
}

export default async function contasPagarRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const { status, categoria } = req.query as { status?: string; categoria?: string }

    const contas = await prisma.contaPagar.findMany({
      where: {
        ...(categoria && { categoria }),
      },
      orderBy: { dataVencimento: 'asc' },
    })

    const comStatus = contas.map(c => ({ ...c, status: computarStatus(c) }))

    return status ? comStatus.filter(c => c.status === status) : comStatus
  })

  app.post('/', async (req, reply) => {
    const data = contaSchema.parse(req.body)
    const conta = await prisma.contaPagar.create({
      data: {
        ...data,
        dataVencimento: new Date(data.dataVencimento),
      },
    })
    return reply.status(201).send({ ...conta, status: computarStatus(conta) })
  })

  app.put('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = contaSchema.partial().parse(req.body)
    const conta = await prisma.contaPagar.update({
      where: { id },
      data: {
        ...data,
        ...(data.dataVencimento && { dataVencimento: new Date(data.dataVencimento) }),
      },
    })
    return { ...conta, status: computarStatus(conta) }
  })

  app.patch('/:id/pagar', async (req) => {
    const { id } = req.params as { id: string }
    const { dataPagamento } = z.object({
      dataPagamento: z.string().datetime().optional(),
    }).parse(req.body)

    const conta = await prisma.contaPagar.findUnique({ where: { id } })
    if (!conta) throw new NotFoundError('Conta a pagar')

    const updated = await prisma.contaPagar.update({
      where: { id },
      data: {
        dataPagamento: dataPagamento ? new Date(dataPagamento) : new Date(),
        status: 'PAGO',
      },
    })
    return { ...updated, status: 'PAGO' }
  })

  app.patch('/:id/cancelar', async (req) => {
    const { id } = req.params as { id: string }
    const updated = await prisma.contaPagar.update({
      where: { id },
      data: { status: 'CANCELADO' },
    })
    return { ...updated, status: 'CANCELADO' }
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.contaPagar.delete({ where: { id } })
    return reply.status(204).send()
  })
}
