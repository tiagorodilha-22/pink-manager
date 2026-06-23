import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { NotFoundError } from '../../../shared/errors'

export default async function tecnicosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const { q } = req.query as { q?: string }
    return prisma.tecnico.findMany({
      where: {
        ativo: true,
        ...(q && { nome: { contains: q } }),
      },
      orderBy: { nome: 'asc' },
    })
  })

  app.get('/todos', async () => {
    return prisma.tecnico.findMany({ orderBy: { nome: 'asc' } })
  })

  app.post('/', async (req, reply) => {
    const data = z.object({
      nome:      z.string().min(2),
      matricula: z.string().optional(),
      cargo:     z.string().optional(),
      telefone:  z.string().optional(),
    }).parse(req.body)

    const tecnico = await prisma.tecnico.create({ data })
    return reply.status(201).send(tecnico)
  })

  app.patch('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = z.object({
      nome:      z.string().min(2).optional(),
      matricula: z.string().optional(),
      cargo:     z.string().optional(),
      telefone:  z.string().optional(),
    }).parse(req.body)

    const t = await prisma.tecnico.findUnique({ where: { id } })
    if (!t) throw new NotFoundError('Técnico')
    return prisma.tecnico.update({ where: { id }, data })
  })

  app.patch('/:id/toggle', async (req) => {
    const { id } = req.params as { id: string }
    const t = await prisma.tecnico.findUnique({ where: { id } })
    if (!t) throw new NotFoundError('Técnico')
    return prisma.tecnico.update({ where: { id }, data: { ativo: !t.ativo } })
  })
}
