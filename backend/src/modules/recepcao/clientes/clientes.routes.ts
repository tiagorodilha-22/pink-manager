import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { NotFoundError } from '../../../shared/errors'

const clienteSchema = z.object({
  nome:     z.string().min(2),
  cpfCnpj:  z.string().optional(),
  telefone: z.string().min(8),
  email:    z.string().email().optional(),
  genero:   z.enum(['M', 'F']).optional(),
})

export default async function clientesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const { q } = req.query as { q?: string }
    return prisma.cliente.findMany({
      where: q ? { nome: { contains: q } } : undefined,
      include: { veiculos: { select: { id: true, placa: true, modelo: true } } },
      orderBy: { nome: 'asc' },
    })
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        veiculos: true,
        agendamentos: { orderBy: { dataHora: 'desc' }, take: 5 },
      },
    })
    if (!cliente) throw new NotFoundError('Cliente')
    return cliente
  })

  app.post('/', async (req, reply) => {
    const data = clienteSchema.parse(req.body)
    const cliente = await prisma.cliente.create({ data })
    return reply.status(201).send(cliente)
  })

  app.put('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = clienteSchema.partial().parse(req.body)
    return prisma.cliente.update({ where: { id }, data })
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.cliente.delete({ where: { id } })
    return reply.status(204).send()
  })
}
