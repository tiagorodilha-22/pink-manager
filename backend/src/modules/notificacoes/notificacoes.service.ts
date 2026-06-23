import nodemailer from 'nodemailer'

export interface NotifPayload {
  clienteNome: string
  clienteTelefone: string
  clienteEmail: string | null
  veiculoMarca: string
  veiculoModelo: string
  veiculoPlaca: string
  osNumero: number
  osValorTotal: number
  nomeOficina: string
  portalLink?: string
  avaliacaoLink?: string
}

type BuildFn = (p: NotifPayload) => { assunto: string; texto: string } | null

const EVENTOS: Record<string, BuildFn> = {
  AGUARDANDO_APROVACAO: p => ({
    assunto: `Orçamento OS #${p.osNumero} aguardando aprovação — ${p.nomeOficina}`,
    texto: [
      `Olá ${p.clienteNome}!`,
      '',
      `O orçamento para o seu ${p.veiculoMarca} ${p.veiculoModelo} (${p.veiculoPlaca}) está pronto.`,
      `Valor total: R$ ${p.osValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      '',
      p.portalLink
        ? `Acesse para ver os detalhes e aprovar:\n${p.portalLink}`
        : 'Entre em contato conosco para aprovar.',
      '',
      `Atenciosamente,\n${p.nomeOficina}`,
    ].join('\n'),
  }),

  AGUARDANDO_RETIRADA: p => ({
    assunto: `Seu veículo está pronto! — ${p.nomeOficina}`,
    texto: [
      `Olá ${p.clienteNome}!`,
      '',
      `Seu ${p.veiculoMarca} ${p.veiculoModelo} (${p.veiculoPlaca}) está pronto para retirada.`,
      'Aguardamos sua visita!',
      '',
      `Atenciosamente,\n${p.nomeOficina}`,
    ].join('\n'),
  }),

  ENTREGUE: p => ({
    assunto: `Obrigado pela preferência! — ${p.nomeOficina}`,
    texto: [
      `Olá ${p.clienteNome}!`,
      '',
      `Agradecemos por confiar seu ${p.veiculoMarca} ${p.veiculoModelo} a nós.`,
      '',
      p.avaliacaoLink
        ? `Que tal avaliar nosso serviço? Leva só 30 segundos:\n${p.avaliacaoLink}`
        : '',
      '',
      `Atenciosamente,\n${p.nomeOficina}`,
    ].filter(l => l !== undefined).join('\n'),
  }),
}

export async function disparar(status: string, payload: NotifPayload): Promise<void> {
  const build = EVENTOS[status]
  if (!build) return
  const msg = build(payload)
  if (!msg) return
  await Promise.allSettled([
    enviarWhatsApp(payload.clienteTelefone, msg.texto),
    enviarEmail(payload.clienteEmail, msg.assunto, msg.texto),
  ])
}

async function enviarWhatsApp(telefone: string, mensagem: string): Promise<void> {
  const instanceId  = process.env.ZAPI_INSTANCE_ID
  const token       = process.env.ZAPI_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN
  if (!instanceId || !token) return

  const fone  = telefone.replace(/\D/g, '')
  const phone = fone.startsWith('55') ? fone : `55${fone}`

  await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clientToken ? { 'Client-Token': clientToken } : {}),
      },
      body: JSON.stringify({ phone, message: mensagem }),
    },
  )
}

async function enviarEmail(para: string | null, assunto: string, texto: string): Promise<void> {
  if (!para || !process.env.SMTP_HOST) return
  const nomeOficina = process.env.NOME_OFICINA ?? 'Pink Manager'
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  await transport.sendMail({
    from: `"${nomeOficina}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to: para,
    subject: assunto,
    text: texto,
  })
}
