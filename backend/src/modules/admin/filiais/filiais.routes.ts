import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { AppError, NotFoundError } from '../../../shared/errors'

const filialSchema = z.object({
  nome:     z.string().min(2),
  cnpj:     z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
})

export default async function filiaisRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async () => {
    return prisma.filial.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { usuarios: true, ordens: true } } },
    })
  })

  app.post('/', async (req, reply) => {
    if (req.user.perfil !== 'ADMIN') throw new AppError('Apenas administradores podem criar filiais', 403)
    const data = filialSchema.parse(req.body)
    const filial = await prisma.filial.create({ data })
    return reply.status(201).send(filial)
  })

  app.patch('/:id', async (req, reply) => {
    if (req.user.perfil !== 'ADMIN') throw new AppError('Apenas administradores podem editar filiais', 403)
    const { id } = req.params as { id: string }
    const data = filialSchema.partial().parse(req.body)
    const exists = await prisma.filial.findUnique({ where: { id } })
    if (!exists) throw new NotFoundError('Filial')
    const filial = await prisma.filial.update({ where: { id }, data })
    return reply.send(filial)
  })

  app.patch('/:id/toggle', async (req) => {
    if (req.user.perfil !== 'ADMIN') throw new AppError('Apenas administradores podem editar filiais', 403)
    const { id } = req.params as { id: string }
    const exists = await prisma.filial.findUnique({ where: { id } })
    if (!exists) throw new NotFoundError('Filial')
    return prisma.filial.update({ where: { id }, data: { ativo: !exists.ativo } })
  })
}
