import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { NotFoundError } from '../../../shared/errors'

const veiculoSchema = z.object({
  clienteId: z.string().uuid(),
  placa: z.string().min(7).max(8).toUpperCase(),
  marca: z.string().min(1),
  modelo: z.string().min(1),
  ano: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  cor: z.string().optional(),
  km: z.number().int().optional(),
})

export default async function veiculosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const { placa, clienteId } = req.query as { placa?: string; clienteId?: string }
    return prisma.veiculo.findMany({
      where: {
        ...(placa && { placa: { contains: placa.toUpperCase() } }),
        ...(clienteId && { clienteId }),
      },
      include: { cliente: { select: { id: true, nome: true, telefone: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const veiculo = await prisma.veiculo.findUnique({
      where: { id },
      include: {
        cliente: true,
        ordens: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, numero: true, status: true, createdAt: true } },
      },
    })
    if (!veiculo) throw new NotFoundError('Veículo')
    return veiculo
  })

  app.post('/', async (req, reply) => {
    const data = veiculoSchema.parse(req.body)
    const veiculo = await prisma.veiculo.create({ data })
    return reply.status(201).send(veiculo)
  })

  app.put('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = veiculoSchema.partial().omit({ clienteId: true }).parse(req.body)
    return prisma.veiculo.update({ where: { id }, data })
  })
}
