import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import prisma from '../../shared/prisma'
import { authenticate } from '../../shared/auth.middleware'
import { AppError, NotFoundError } from '../../shared/errors'
import { fetchFile, fileExists } from '../../shared/storage.service'
import { gerarOrcamentoPDF, gerarComprovantePDF, OSParaPDF, FotoParaPDF, ComprovanteOS } from './pdf.service'

const padOS = (n: number) => `Orcamento-OS-${String(n).padStart(4, '0')}.pdf`

export default async function pdfRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // ── Download do PDF ─────────────────────────────────────────
  app.get('/:id/pdf', async (req, reply) => {
    const { id } = req.params as { id: string }

    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        veiculo: { include: { cliente: true } },
        orcamento: { include: { itens: true } },
      },
    })
    if (!os) throw new NotFoundError('OS')
    if (!os.orcamento) throw new AppError('OS ainda nao tem orcamento', 400)

    const nomeOficina = process.env.NOME_OFICINA ?? 'Pink Manager'
    const pdf = await gerarOrcamentoPDF(os as unknown as OSParaPDF, nomeOficina)

    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="${padOS(os.numero)}"`)
    return reply.send(pdf)
  })

  // ── Comprovante de Entrega (com fotos) ──────────────────────
  app.get('/:id/comprovante', async (req, reply) => {
    const { id } = req.params as { id: string }

    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        veiculo: { include: { cliente: true } },
        orcamento: { include: { itens: true } },
        itens: true,
      },
    })
    if (!os) throw new NotFoundError('OS')

    // Fotos das manutenções registradas nesta OS
    const manutencoes = await prisma.manutencaoVeiculo.findMany({
      where:   { veiculoId: os.veiculoId, osNumero: os.numero },
      include: { fotos: { orderBy: { createdAt: 'asc' } } },
    })

    const fotosComBuffer: FotoParaPDF[] = []
    for (const m of manutencoes) {
      for (const f of m.fotos) {
        if (!fileExists(f.filename)) continue
        try {
          const buffer = await fetchFile(f.filename)
          fotosComBuffer.push({ ...f, buffer, manutencaoTipo: m.tipo })
        } catch { /* pula foto inacessível */ }
      }
    }

    const nomeOficina = process.env.NOME_OFICINA ?? 'Pink Manager'
    const pdf = await gerarComprovantePDF(os as unknown as ComprovanteOS, fotosComBuffer, nomeOficina)

    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="Comprovante-OS-${String(os.numero).padStart(4, '0')}.pdf"`)
    return reply.send(pdf)
  })

  // ── Envio por e-mail e/ou WhatsApp ──────────────────────────
  app.post('/:id/pdf/enviar', async (req) => {
    const { id } = req.params as { id: string }
    const { canais } = z.object({
      canais: z.array(z.enum(['email', 'whatsapp'])).min(1),
    }).parse(req.body)

    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        veiculo: { include: { cliente: true } },
        orcamento: { include: { itens: true } },
      },
    })
    if (!os) throw new NotFoundError('OS')
    if (!os.orcamento) throw new AppError('OS ainda nao tem orcamento', 400)

    const nomeOficina = process.env.NOME_OFICINA ?? 'Pink Manager'
    const pdf      = await gerarOrcamentoPDF(os as unknown as OSParaPDF, nomeOficina)
    const filename = padOS(os.numero)
    const resultados: Record<string, string> = {}

    // ── E-mail ──────────────────────────────────────────────
    if (canais.includes('email')) {
      const emailCliente = os.veiculo.cliente.email
      if (!emailCliente) {
        resultados.email = 'Cliente sem e-mail cadastrado'
      } else if (!process.env.SMTP_HOST) {
        resultados.email = 'SMTP nao configurado (adicione SMTP_HOST no .env)'
      } else {
        try {
          const transport = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: process.env.SMTP_PORT === '465',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          })
          await transport.sendMail({
            from: `"${nomeOficina}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
            to: emailCliente,
            subject: `${filename.replace('.pdf', '')} — ${nomeOficina}`,
            text: [
              `Prezado(a) ${os.veiculo.cliente.nome},`,
              '',
              `Segue em anexo o orcamento para o seu ${os.veiculo.marca} ${os.veiculo.modelo} (placa ${os.veiculo.placa}).`,
              '',
              'Qualquer duvida, estamos a disposicao.',
              '',
              `Atenciosamente,`,
              nomeOficina,
            ].join('\n'),
            attachments: [{
              filename,
              content: pdf,
              contentType: 'application/pdf',
            }],
          })
          resultados.email = 'ok'
        } catch (e) {
          resultados.email = `Erro ao enviar: ${(e as Error).message}`
        }
      }
    }

    // ── WhatsApp via Z-API ──────────────────────────────────
    if (canais.includes('whatsapp')) {
      const instanceId  = process.env.ZAPI_INSTANCE_ID
      const token       = process.env.ZAPI_TOKEN
      const clientToken = process.env.ZAPI_CLIENT_TOKEN

      if (!instanceId || !token) {
        resultados.whatsapp = 'Z-API nao configurada (adicione ZAPI_INSTANCE_ID e ZAPI_TOKEN no .env)'
      } else {
        try {
          const fone  = os.veiculo.cliente.telefone.replace(/\D/g, '')
          const phone = fone.startsWith('55') ? fone : `55${fone}`
          const base64 = pdf.toString('base64')

          const resp = await fetch(
            `https://api.z-api.io/instances/${instanceId}/token/${token}/send-document/pdf`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(clientToken ? { 'Client-Token': clientToken } : {}),
              },
              body: JSON.stringify({
                phone,
                document: `data:application/pdf;base64,${base64}`,
                fileName: filename,
                caption: `Ola ${os.veiculo.cliente.nome}! Segue o orcamento para o seu ${os.veiculo.marca} ${os.veiculo.modelo}. Qualquer duvida estamos a disposicao!`,
              }),
            },
          )

          if (!resp.ok) {
            const body = await resp.text()
            resultados.whatsapp = `Erro Z-API ${resp.status}: ${body}`
          } else {
            resultados.whatsapp = 'ok'
          }
        } catch (e) {
          resultados.whatsapp = `Erro: ${(e as Error).message}`
        }
      }
    }

    return { resultados }
  })
}
