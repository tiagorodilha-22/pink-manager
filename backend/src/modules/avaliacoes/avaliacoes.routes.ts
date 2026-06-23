import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import prisma from '../../shared/prisma'
import { authenticate } from '../../shared/auth.middleware'
import { AppError, NotFoundError } from '../../shared/errors'

export default async function avaliacoesRoutes(app: FastifyInstance) {

  // ── Rotas públicas (sem autenticação) ───────────────────────────────────────

  // Dados da OS para o cliente preencher a avaliação
  app.get('/publica/:token', async (req, reply) => {
    const { token } = req.params as { token: string }
    const av = await prisma.avaliacao.findUnique({
      where: { token },
      include: {
        os: {
          select: {
            numero: true,
            status: true,
            veiculo: { select: { marca: true, modelo: true, placa: true } },
          },
        },
      },
    })
    if (!av) return reply.status(404).send({ error: 'Avaliação não encontrada' })
    return {
      respondido: !!av.respondidoEm,
      nota:       av.nota,
      os: {
        numero:  av.os.numero,
        veiculo: `${av.os.veiculo.marca} ${av.os.veiculo.modelo} — ${av.os.veiculo.placa}`,
      },
    }
  })

  // Cliente submete a avaliação
  app.post('/publica/:token', async (req, reply) => {
    const { token } = req.params as { token: string }
    const { nota, comentario } = z.object({
      nota:       z.number().int().min(0).max(10),
      comentario: z.string().max(500).optional(),
    }).parse(req.body)

    const av = await prisma.avaliacao.findUnique({ where: { token } })
    if (!av) return reply.status(404).send({ error: 'Avaliação não encontrada' })
    if (av.respondidoEm) throw new AppError('Esta avaliação já foi respondida', 400)

    await prisma.avaliacao.update({
      where: { token },
      data:  { nota, comentario, respondidoEm: new Date() },
    })
    return reply.status(200).send({ ok: true })
  })

  // ── Rotas autenticadas ───────────────────────────────────────────────────────

  app.addHook('onRequest', async (req, reply) => {
    // Ignora as rotas públicas
    if (req.url.includes('/publica/')) return
    return authenticate(req, reply)
  })

  // Gerar/obter link de avaliação para uma OS
  app.post('/os/:osId/gerar', async (req, reply) => {
    const { osId } = req.params as { osId: string }
    const os = await prisma.ordemServico.findUnique({ where: { id: osId } })
    if (!os) throw new NotFoundError('OS')

    const existente = await prisma.avaliacao.findUnique({ where: { osId } })
    if (existente) return { token: existente.token, respondido: !!existente.respondidoEm }

    const av = await prisma.avaliacao.create({
      data: { osId, token: randomUUID() },
    })
    return reply.status(201).send({ token: av.token, respondido: false })
  })

  // Listar avaliações respondidas
  app.get('/', async (req) => {
    const { pagina = '1', porPagina = '20' } = req.query as Record<string, string>
    const skip = (Number(pagina) - 1) * Number(porPagina)

    const [avaliacoes, total] = await Promise.all([
      prisma.avaliacao.findMany({
        where:   { respondidoEm: { not: null } },
        include: {
          os: {
            select: {
              numero: true,
              veiculo: { select: { marca: true, modelo: true, placa: true } },
            },
          },
        },
        orderBy: { respondidoEm: 'desc' },
        skip,
        take: Number(porPagina),
      }),
      prisma.avaliacao.count({ where: { respondidoEm: { not: null } } }),
    ])
    return { avaliacoes, total }
  })

  // Resumo NPS
  app.get('/resumo', async () => {
    const respondidas = await prisma.avaliacao.findMany({
      where: { respondidoEm: { not: null }, nota: { not: null } },
      select: { nota: true },
    })

    if (!respondidas.length) return { nps: null, total: 0, promotores: 0, neutros: 0, detratores: 0, distribuicao: [] }

    const total      = respondidas.length
    const promotores = respondidas.filter(a => (a.nota ?? 0) >= 9).length
    const neutros    = respondidas.filter(a => (a.nota ?? 0) >= 7 && (a.nota ?? 0) <= 8).length
    const detratores = respondidas.filter(a => (a.nota ?? 0) <= 6).length
    const nps        = Math.round(((promotores - detratores) / total) * 100)

    // Distribuição 0-10
    const distribuicao = Array.from({ length: 11 }, (_, i) => ({
      nota:  i,
      total: respondidas.filter(a => a.nota === i).length,
    }))

    return { nps, total, promotores, neutros, detratores, distribuicao }
  })
}
