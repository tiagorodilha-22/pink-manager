import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { AppError, NotFoundError } from '../../../shared/errors'
import { storeFile, removeFile, fetchFile, publicUrl, fileExists } from '../../../shared/storage.service'
import dayjs from 'dayjs'

const DEFAULTS: Record<string, { meses?: number; km?: number }> = {
  TROCA_OLEO:          { meses: 6,  km: 5000  },
  CORREIA_DENTADA:     { meses: 48, km: 60000 },
  FILTRO_AR:           { meses: 12, km: 15000 },
  FILTRO_COMBUSTIVEL:  { meses: 12, km: 15000 },
  FLUIDO_FREIO:        { meses: 24, km: 40000 },
  VELA_IGNICAO:        { meses: 24, km: 20000 },
  REVISAO_GERAL:       { meses: 12, km: 10000 },
  OUTRO:               {},
}

export const TIPOS_MANUTENCAO = Object.keys(DEFAULTS)

export const TIPO_LABEL: Record<string, string> = {
  TROCA_OLEO:          'Troca de óleo',
  CORREIA_DENTADA:     'Correia dentada',
  FILTRO_AR:           'Filtro de ar',
  FILTRO_COMBUSTIVEL:  'Filtro de combustível',
  FLUIDO_FREIO:        'Fluido de freio',
  VELA_IGNICAO:        'Vela de ignição',
  REVISAO_GERAL:       'Revisão geral',
  OUTRO:               'Outro',
}

export default async function manutencaoRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // ── Listar histórico de um veículo (inclui fotos) ────────────
  app.get('/veiculo/:veiculoId', async (req) => {
    const { veiculoId } = req.params as { veiculoId: string }
    return prisma.manutencaoVeiculo.findMany({
      where:   { veiculoId },
      include: { fotos: { orderBy: { createdAt: 'asc' } } },
      orderBy: { dataRealizado: 'desc' },
    })
  })

  // ── Registrar manutenção ─────────────────────────────────────
  app.post('/veiculo/:veiculoId', async (req, reply) => {
    const { veiculoId } = req.params as { veiculoId: string }

    const veiculo = await prisma.veiculo.findUnique({ where: { id: veiculoId } })
    if (!veiculo) throw new NotFoundError('Veículo')

    const body = z.object({
      tipo:          z.enum(TIPOS_MANUTENCAO as [string, ...string[]]),
      descricao:     z.string().optional(),
      kmRealizado:   z.number().int().min(0).optional(),
      dataRealizado: z.string(),
      kmProxima:     z.number().int().min(0).optional(),
      dataProxima:   z.string().optional(),
      osNumero:      z.number().int().optional(),
    }).parse(req.body)

    const defaults = DEFAULTS[body.tipo] ?? {}
    const dataRef  = dayjs(body.dataRealizado)

    const kmProxima   = body.kmProxima   ?? (body.kmRealizado && defaults.km   ? body.kmRealizado + defaults.km   : undefined)
    const dataProxima = body.dataProxima ? new Date(body.dataProxima)
                      : defaults.meses   ? dataRef.add(defaults.meses, 'month').toDate()
                      : undefined

    const m = await prisma.manutencaoVeiculo.create({
      data: {
        veiculoId,
        tipo:          body.tipo,
        descricao:     body.descricao,
        kmRealizado:   body.kmRealizado,
        dataRealizado: new Date(body.dataRealizado),
        kmProxima,
        dataProxima,
        osNumero:      body.osNumero,
      },
      include: { fotos: true },
    })
    return reply.status(201).send(m)
  })

  // ── Upload de foto (ANTES / DEPOIS / GERAL) ──────────────────
  app.post('/:id/foto', async (req, reply) => {
    const { id } = req.params as { id: string }
    const m = await prisma.manutencaoVeiculo.findUnique({ where: { id } })
    if (!m) throw new NotFoundError('Manutenção')

    const parts = (req as unknown as { parts(): AsyncIterable<{ type: string; fieldname: string; value?: string; filename?: string; mimetype?: string; toBuffer?: () => Promise<Buffer> }> }).parts()

    let tipo     = 'GERAL'
    let fileData: { filename: string; mimetype: string; buffer: Buffer } | null = null

    for await (const part of parts) {
      if (part.type === 'field' && part.fieldname === 'tipo' && part.value) {
        tipo = part.value
      } else if (part.type === 'file' && part.toBuffer) {
        const buffer = await part.toBuffer()
        fileData = { filename: part.filename ?? 'foto.jpg', mimetype: part.mimetype ?? 'image/jpeg', buffer }
      }
    }

    if (!fileData) throw new AppError('Nenhum arquivo enviado', 400)

    const TIPOS_FOTO = ['ANTES', 'DEPOIS', 'GERAL']
    if (!TIPOS_FOTO.includes(tipo)) tipo = 'GERAL'

    const ext      = fileData.filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filename = `manut-${id}-${crypto.randomUUID()}.${ext}`

    await storeFile(filename, fileData.buffer)

    const foto = await prisma.fotoManutencao.create({
      data: { manutencaoId: id, tipo, filename },
    })

    return reply.status(201).send(foto)
  })

  // ── Servir foto ──────────────────────────────────────────────
  app.get('/foto/:fotoId', async (req, reply) => {
    const { fotoId } = req.params as { fotoId: string }
    const foto = await prisma.fotoManutencao.findUnique({ where: { id: fotoId } })
    if (!foto) throw new NotFoundError('Foto')

    const url = publicUrl(foto.filename)
    if (url) return reply.redirect(url)

    if (!fileExists(foto.filename)) throw new NotFoundError('Arquivo')
    const buffer = await fetchFile(foto.filename)
    const ext    = foto.filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    reply.header('Content-Type', `image/${ext === 'jpg' ? 'jpeg' : ext}`)
    reply.header('Cache-Control', 'public, max-age=86400')
    return reply.send(buffer)
  })

  // ── Deletar foto ─────────────────────────────────────────────
  app.delete('/foto/:fotoId', async (req, reply) => {
    const { fotoId } = req.params as { fotoId: string }
    const foto = await prisma.fotoManutencao.findUnique({ where: { id: fotoId } })
    if (!foto) throw new NotFoundError('Foto')
    await prisma.fotoManutencao.delete({ where: { id: fotoId } })
    await removeFile(foto.filename)
    return reply.status(204).send()
  })

  // ── Deletar manutenção ───────────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const m = await prisma.manutencaoVeiculo.findUnique({ where: { id } })
    if (!m) throw new NotFoundError('Manutenção')
    await prisma.manutencaoVeiculo.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ── Alertas: veículos com manutenção vencida ou próxima ──────
  app.get('/alertas', async (req) => {
    const { dias = '30' } = req.query as { dias?: string }
    const limite = dayjs().add(Number(dias), 'day').toDate()
    const hoje   = new Date()

    const alertas = await prisma.manutencaoVeiculo.findMany({
      where: { OR: [{ dataProxima: { lte: limite } }] },
      include: {
        veiculo: {
          select: {
            id: true, placa: true, marca: true, modelo: true, km: true,
            cliente: { select: { id: true, nome: true, telefone: true } },
          },
        },
      },
      orderBy: { dataProxima: 'asc' },
    })

    return alertas.map(a => ({
      ...a,
      vencido:       a.dataProxima ? a.dataProxima < hoje : false,
      diasRestantes: a.dataProxima ? Math.ceil((a.dataProxima.getTime() - hoje.getTime()) / 86400000) : null,
      kmRestantes:   a.kmProxima && a.veiculo.km ? a.kmProxima - a.veiculo.km : null,
    }))
  })

  // ── Defaults de intervalo ─────────────────────────────────────
  app.get('/defaults', async () => ({ defaults: DEFAULTS, labels: TIPO_LABEL }))
}
