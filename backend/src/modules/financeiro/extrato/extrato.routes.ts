import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { parseOfx } from './parsers/ofx.parser'
import { parseRede, parseStone } from './parsers/csv.parser'
import { parsePdf } from './parsers/pdf.parser'

export default async function extratoRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // Listar lançamentos importados
  app.get('/', async (req) => {
    const { conciliado, origem, de, ate } = req.query as Record<string, string>
    return prisma.lancamentoExtrato.findMany({
      where: {
        ...(conciliado !== undefined && { conciliado: conciliado === 'true' }),
        ...(origem && { origem: origem as never }),
        ...(de && ate && { data: { gte: new Date(de), lte: new Date(ate) } }),
      },
      include: {
        conciliacoes: {
          include: {
            pagamento: { include: { os: { select: { numero: true } } } },
          },
        },
      },
      orderBy: { data: 'desc' },
    })
  })

  // Importar OFX do Inter
  app.post('/importar/ofx', async (req, reply) => {
    const { conteudo } = z.object({ conteudo: z.string() }).parse(req.body)

    const lancamentos = await parseOfx(conteudo)
    const resultados = await importarLancamentos(lancamentos, 'INTER_OFX')

    return reply.send(resultados)
  })

  // Importar CSV da Rede
  app.post('/importar/rede', async (req, reply) => {
    const { conteudo } = z.object({ conteudo: z.string() }).parse(req.body)

    const lancamentos = await parseRede(conteudo)
    const resultados = await importarLancamentos(lancamentos, 'REDE_CSV')

    return reply.send(resultados)
  })

  // Importar CSV da Stone
  app.post('/importar/stone', async (req, reply) => {
    const { conteudo } = z.object({ conteudo: z.string() }).parse(req.body)

    const lancamentos = await parseStone(conteudo)
    const resultados = await importarLancamentos(lancamentos, 'STONE_CSV')

    return reply.send(resultados)
  })

  // Importar PDF ou imagem via IA
  app.post('/importar/pdf', async (req, reply) => {
    const { conteudo, mimeType } = z.object({
      conteudo: z.string().min(1),
      mimeType: z.string().min(1),
    }).parse(req.body)

    const lancamentos = await parsePdf(conteudo, mimeType)
    const resultados = await importarLancamentos(lancamentos, 'PDF_IA')

    return reply.send(resultados)
  })

  // Lançamento manual
  app.post('/manual', async (req, reply) => {
    const data = z.object({
      data: z.string().datetime(),
      descricao: z.string().min(1),
      valor: z.number().positive(),
      nsuRef: z.string().optional(),
    }).parse(req.body)

    const hash = crypto
      .createHash('md5')
      .update(`MANUAL-${data.data}-${data.descricao}-${data.valor}`)
      .digest('hex')

    const lancamento = await prisma.lancamentoExtrato.upsert({
      where: { hashUnico: hash },
      update: {},
      create: {
        origem: 'MANUAL',
        data: new Date(data.data),
        descricao: data.descricao,
        valor: data.valor,
        nsuRef: data.nsuRef,
        hashUnico: hash,
      },
    })

    return reply.status(201).send(lancamento)
  })
}

interface LancamentoRaw {
  data: Date
  descricao: string
  valor: number
  nsuRef?: string
}

async function importarLancamentos(lancamentos: LancamentoRaw[], origem: string) {
  let novos = 0
  let duplicados = 0

  for (const l of lancamentos) {
    const hash = crypto
      .createHash('md5')
      .update(`${origem}-${l.data.toISOString()}-${l.descricao}-${l.valor}`)
      .digest('hex')

    const existe = await prisma.lancamentoExtrato.findUnique({ where: { hashUnico: hash } })
    if (existe) { duplicados++; continue }

    await prisma.lancamentoExtrato.create({
      data: { origem: origem as never, data: l.data, descricao: l.descricao, valor: l.valor, nsuRef: l.nsuRef, hashUnico: hash },
    })
    novos++
  }

  return { novos, duplicados, total: lancamentos.length }
}
