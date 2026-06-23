import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { NotFoundError } from '../../../shared/errors'

const servicoSchema = z.object({
  nome:         z.string().min(2),
  descricao:    z.string().optional(),
  duracaoHoras: z.number().positive().default(1),
  precoBase:    z.number().min(0).default(0),
  precoHora:    z.number().min(0).default(0),
})

export default async function servicosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const { ativo } = req.query as { ativo?: string }
    const where = ativo === 'false' ? {} : { ativo: true }
    return prisma.servico.findMany({ where, orderBy: { nome: 'asc' } })
  })

  app.post('/', async (req, reply) => {
    const data = servicoSchema.parse(req.body)
    const servico = await prisma.servico.create({ data })
    return reply.status(201).send(servico)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const data = servicoSchema.partial().parse(req.body)
    const exists = await prisma.servico.findUnique({ where: { id } })
    if (!exists) throw new NotFoundError('Serviço')
    const servico = await prisma.servico.update({ where: { id }, data })
    return reply.send(servico)
  })

  app.patch('/:id/toggle', async (req) => {
    const { id } = req.params as { id: string }
    const exists = await prisma.servico.findUnique({ where: { id } })
    if (!exists) throw new NotFoundError('Serviço')
    return prisma.servico.update({ where: { id }, data: { ativo: !exists.ativo } })
  })

  app.delete('/:id', async (_req, reply) => {
    const { id } = _req.params as { id: string }
    const exists = await prisma.servico.findUnique({ where: { id } })
    if (!exists) throw new NotFoundError('Serviço')
    await prisma.servico.delete({ where: { id } })
    return reply.status(204).send()
  })
}
