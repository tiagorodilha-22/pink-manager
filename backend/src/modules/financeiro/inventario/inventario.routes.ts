import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { NotFoundError } from '../../../shared/errors'

const CATEGORIAS = ['FREIOS','MOTOR','SUSPENSAO','ELETRICA','FILTROS','PNEUS','TRANSMISSAO','CARROCERIA','FLUIDOS','OUTROS'] as const

const itemSchema = z.object({
  nome:             z.string().min(1),
  codigoInterno:    z.string().optional(),
  codigoFabricante: z.string().optional(),
  codigoBarras:     z.string().optional(),
  categoria:        z.enum(CATEGORIAS).default('OUTROS'),
  marca:            z.string().optional(),
  compatibilidade:  z.string().optional(),
  descricao:        z.string().optional(),
  unidade:          z.string().default('UN'),
  quantidade:       z.number().int().min(0).default(0),
  qtdMinima:        z.number().int().min(0).default(1),
  custoUnitario:    z.number().min(0).default(0),
  precoVenda:       z.number().min(0).default(0),
  localizacao:      z.string().optional(),
})

export default async function inventarioRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const { q, categoria, alerta } = req.query as { q?: string; categoria?: string; alerta?: string }
    const itens = await prisma.itemInventario.findMany({
      where: {
        ativo: true,
        ...(q && { nome: { contains: q } }),
        ...(categoria && { categoria }),
      },
      orderBy: { nome: 'asc' },
    })
    if (alerta === 'true') return itens.filter(i => i.quantidade <= i.qtdMinima)
    return itens
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const item = await prisma.itemInventario.findUnique({
      where: { id },
      include: { movimentacoes: { orderBy: { createdAt: 'desc' }, take: 20 } },
    })
    if (!item) throw new NotFoundError('Item')
    return item
  })

  app.post('/', async (req, reply) => {
    const data = itemSchema.parse(req.body)
    const item = await prisma.itemInventario.create({ data })
    return reply.status(201).send(item)
  })

  app.put('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = itemSchema.partial().parse(req.body)
    return prisma.itemInventario.update({ where: { id }, data })
  })

  // Entrada de estoque
  app.post('/:id/entrada', async (req) => {
    const { id } = req.params as { id: string }
    const { quantidade, custo, motivo } = z.object({
      quantidade: z.number().int().positive(),
      custo:      z.number().min(0).optional(),
      motivo:     z.string().optional(),
    }).parse(req.body)

    const item = await prisma.itemInventario.findUnique({ where: { id } })
    if (!item) throw new NotFoundError('Item')

    await prisma.$transaction([
      prisma.itemInventario.update({
        where: { id },
        data: {
          quantidade: item.quantidade + quantidade,
          ...(custo !== undefined && { custoUnitario: custo }),
        },
      }),
      prisma.movimentacaoEstoque.create({
        data: { itemId: id, tipo: 'ENTRADA', quantidade, custo: custo ?? 0, motivo },
      }),
    ])

    return prisma.itemInventario.findUnique({ where: { id } })
  })

  // Saída de estoque
  app.post('/:id/saida', async (req) => {
    const { id } = req.params as { id: string }
    const { quantidade, osId, motivo } = z.object({
      quantidade: z.number().int().positive(),
      osId:       z.string().optional(),
      motivo:     z.string().optional(),
    }).parse(req.body)

    const item = await prisma.itemInventario.findUnique({ where: { id } })
    if (!item) throw new NotFoundError('Item')
    if (item.quantidade < quantidade) {
      throw new Error(`Estoque insuficiente. Disponível: ${item.quantidade}`)
    }

    await prisma.$transaction([
      prisma.itemInventario.update({
        where: { id },
        data: { quantidade: item.quantidade - quantidade },
      }),
      prisma.movimentacaoEstoque.create({
        data: { itemId: id, tipo: 'SAIDA', quantidade, custo: item.custoUnitario, osId, motivo },
      }),
    ])

    return prisma.itemInventario.findUnique({ where: { id } })
  })

  // Desativar
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.itemInventario.update({ where: { id }, data: { ativo: false } })
    return reply.status(204).send()
  })
}
