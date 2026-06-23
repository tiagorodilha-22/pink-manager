import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { NotFoundError } from '../../../shared/errors'

const fornecedorSchema = z.object({
  nome:     z.string().min(2),
  cnpj:     z.string().optional(),
  contato:  z.string().optional(),
  telefone: z.string().optional(),
  email:    z.string().email().optional().or(z.literal('')),
})

export default async function fornecedoresRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const { q, ativo } = req.query as { q?: string; ativo?: string }
    return prisma.fornecedor.findMany({
      where: {
        ...(q && { nome: { contains: q } }),
        ...(ativo !== undefined && { ativo: ativo === 'true' }),
      },
      include: { _count: { select: { itens: true } } },
      orderBy: { nome: 'asc' },
    })
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const f = await prisma.fornecedor.findUnique({
      where: { id },
      include: {
        itens: {
          include: { orcamento: { include: { os: { select: { numero: true, status: true } } } } },
          orderBy: { orcamento: { createdAt: 'desc' } },
          take: 10,
        },
        _count: { select: { itens: true } },
      },
    })
    if (!f) throw new NotFoundError('Fornecedor')
    return f
  })

  app.post('/', async (req, reply) => {
    const data = fornecedorSchema.parse(req.body)
    const f = await prisma.fornecedor.create({ data: { ...data, email: data.email || undefined } })
    return reply.status(201).send(f)
  })

  app.put('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = fornecedorSchema.partial().parse(req.body)
    return prisma.fornecedor.update({ where: { id }, data: { ...data, email: data.email || undefined } })
  })

  app.patch('/:id/toggle-ativo', async (req) => {
    const { id } = req.params as { id: string }
    const f = await prisma.fornecedor.findUnique({ where: { id } })
    if (!f) throw new NotFoundError('Fornecedor')
    return prisma.fornecedor.update({ where: { id }, data: { ativo: !f.ativo } })
  })
}
