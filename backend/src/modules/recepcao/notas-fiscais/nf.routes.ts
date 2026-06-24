import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'
import { AppError, NotFoundError } from '../../../shared/errors'
import { storeFile, fetchFile, publicUrl, fileExists } from '../../../shared/storage.service'

export default async function nfRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // ── Listar NFs ──────────────────────────────────────────────
  app.get('/', async (req) => {
    const { q, status } = req.query as { q?: string; status?: string }
    return prisma.notaFiscal.findMany({
      where: {
        ...(q      && { OR: [{ numero: { contains: q } }, { fornecedor: { nome: { contains: q } } }] }),
        ...(status && { status }),
      },
      include: {
        fornecedor: { select: { id: true, nome: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  // ── Detalhe ──────────────────────────────────────────────────
  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const nf = await prisma.notaFiscal.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        itens: { include: { itemInventario: { select: { id: true, nome: true, quantidade: true } } } },
      },
    })
    if (!nf) throw new NotFoundError('Nota Fiscal')
    return nf
  })

  // ── Criar NF (JSON header, foto depois) ─────────────────────
  app.post('/', async (req, reply) => {
    const body = z.object({
      numero:      z.string().min(1),
      serie:       z.string().optional(),
      fornecedorId: z.string().uuid().optional(),
      dataEmissao: z.string(),
      valorTotal:  z.number().min(0).optional(),
      observacoes: z.string().optional(),
    }).parse(req.body)

    const nf = await prisma.notaFiscal.create({
      data: {
        numero:      body.numero,
        serie:       body.serie,
        fornecedorId: body.fornecedorId,
        dataEmissao: new Date(body.dataEmissao),
        valorTotal:  body.valorTotal ?? 0,
        observacoes: body.observacoes,
      },
    })
    return reply.status(201).send(nf)
  })

  // ── Upload de foto ───────────────────────────────────────────
  app.post('/:id/foto', async (req, reply) => {
    const { id } = req.params as { id: string }
    const nf = await prisma.notaFiscal.findUnique({ where: { id } })
    if (!nf) throw new NotFoundError('Nota Fiscal')

    const data = await (req as unknown as { file(): Promise<{ filename: string; mimetype: string; toBuffer(): Promise<Buffer> }> }).file()
    if (!data) throw new AppError('Nenhum arquivo enviado', 400)

    const ext      = data.filename.split('.').pop() ?? 'jpg'
    const filename = `nf-${id}.${ext}`
    const buffer   = await data.toBuffer()
    await storeFile(filename, buffer)

    const updated = await prisma.notaFiscal.update({ where: { id }, data: { fotoPath: filename } })
    return reply.status(200).send({ fotoPath: updated.fotoPath })
  })

  // ── Servir foto ─────────────────────────────────────────────
  app.get('/:id/foto', async (req, reply) => {
    const { id } = req.params as { id: string }
    const nf = await prisma.notaFiscal.findUnique({ where: { id }, select: { fotoPath: true } })
    if (!nf?.fotoPath) throw new NotFoundError('Foto')

    const url = publicUrl(nf.fotoPath)
    if (url) return reply.redirect(url)

    if (!fileExists(nf.fotoPath)) throw new NotFoundError('Arquivo')
    const buffer = await fetchFile(nf.fotoPath)
    const ext    = nf.fotoPath.split('.').pop()?.toLowerCase() ?? 'jpg'
    const mime   = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    reply.header('Content-Type', mime)
    return reply.send(buffer)
  })

  // ── Salvar / atualizar itens ─────────────────────────────────
  app.put('/:id/itens', async (req) => {
    const { id } = req.params as { id: string }
    const nf = await prisma.notaFiscal.findUnique({ where: { id } })
    if (!nf) throw new NotFoundError('Nota Fiscal')
    if (nf.status === 'PROCESSADA') throw new AppError('NF já processada — não é possível editar', 400)

    const { itens } = z.object({
      itens: z.array(z.object({
        descricao:        z.string().min(1),
        quantidade:       z.number().positive(),
        valorUnitario:    z.number().min(0),
        codigoFabricante: z.string().optional(),
        itemInventarioId: z.string().uuid().optional(),
      })),
    }).parse(req.body)

    const valorTotal = itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)

    await prisma.$transaction([
      prisma.itemNotaFiscal.deleteMany({ where: { notaFiscalId: id } }),
      prisma.itemNotaFiscal.createMany({
        data: itens.map(i => ({ ...i, notaFiscalId: id })),
      }),
      prisma.notaFiscal.update({ where: { id }, data: { valorTotal } }),
    ])

    return prisma.notaFiscal.findUnique({
      where: { id },
      include: { itens: { include: { itemInventario: { select: { id: true, nome: true } } } } },
    })
  })

  // ── Processar NF → criar entradas no estoque ────────────────
  app.post('/:id/processar', async (req, reply) => {
    const { id } = req.params as { id: string }
    const nf = await prisma.notaFiscal.findUnique({
      where: { id },
      include: { itens: true },
    })
    if (!nf) throw new NotFoundError('Nota Fiscal')
    if (nf.status === 'PROCESSADA') throw new AppError('NF já foi processada', 400)
    if (!nf.itens.length)           throw new AppError('Adicione itens antes de processar', 400)

    await prisma.$transaction(async (tx) => {
      for (const item of nf.itens) {
        let inventarioId = item.itemInventarioId

        // Cria item no inventário se não vinculado
        if (!inventarioId) {
          const criado = await tx.itemInventario.create({
            data: {
              nome:             item.descricao,
              codigoFabricante: item.codigoFabricante ?? undefined,
              quantidade:       0,
              custoUnitario:    item.valorUnitario,
            },
          })
          inventarioId = criado.id

          // Atualiza o item da NF com o vínculo criado
          await tx.itemNotaFiscal.update({
            where: { id: item.id },
            data:  { itemInventarioId: inventarioId },
          })
        }

        // Busca item atual para calcular nova quantidade
        const inv = await tx.itemInventario.findUnique({ where: { id: inventarioId } })
        if (!inv) continue

        const qtd = Math.round(Number(item.quantidade))
        await tx.itemInventario.update({
          where: { id: inventarioId },
          data:  {
            quantidade:   inv.quantidade + qtd,
            custoUnitario: item.valorUnitario,
          },
        })

        await tx.movimentacaoEstoque.create({
          data: {
            itemId:    inventarioId,
            tipo:      'ENTRADA',
            quantidade: qtd,
            custo:     item.valorUnitario,
            motivo:    `NF ${nf.numero}${nf.serie ? '/' + nf.serie : ''}`,
          },
        })
      }

      await tx.notaFiscal.update({ where: { id }, data: { status: 'PROCESSADA' } })
    })

    return reply.status(200).send({ ok: true, mensagem: `${nf.itens.length} itens lançados no estoque` })
  })

  // ── Deletar (apenas PENDENTE) ────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const nf = await prisma.notaFiscal.findUnique({ where: { id } })
    if (!nf) throw new NotFoundError('Nota Fiscal')
    if (nf.status === 'PROCESSADA') throw new AppError('NF processada não pode ser removida', 400)
    await prisma.notaFiscal.delete({ where: { id } })
    return reply.status(204).send()
  })
}
