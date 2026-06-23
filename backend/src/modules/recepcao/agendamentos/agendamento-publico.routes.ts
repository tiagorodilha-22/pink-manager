import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import dayjs from 'dayjs'

const SERVICOS = [
  'Troca de óleo e filtros', 'Revisão geral', 'Alinhamento e balanceamento',
  'Freios', 'Suspensão', 'Elétrica', 'Ar condicionado', 'Diagnóstico',
  'Funilaria e pintura', 'Outros',
]

export default async function agendamentoPublicoRoutes(app: FastifyInstance) {
  // ── Configuração pública da oficina ─────────────────────────
  app.get('/config', async () => ({
    nomeOficina:        process.env.NOME_OFICINA          ?? 'Pink Manager',
    horarioAbertura:    process.env.HORA_ABERTURA         ?? '08:00',
    horarioFechamento:  process.env.HORA_FECHAMENTO       ?? '18:00',
    intervaloMinutos:   Number(process.env.SLOT_MINUTOS   ?? 60),
    servicos: SERVICOS,
  }))

  // ── Horários disponíveis para uma data ───────────────────────
  app.get('/horarios', async (req) => {
    const { data } = req.query as { data?: string }
    if (!data) return []

    const abertura   = Number((process.env.HORA_ABERTURA   ?? '08:00').split(':')[0])
    const fechamento = Number((process.env.HORA_FECHAMENTO ?? '18:00').split(':')[0])
    const intervalo  = Number(process.env.SLOT_MINUTOS ?? 60)

    const slots: string[] = []
    for (let h = abertura; h < fechamento; h++) {
      for (let m = 0; m < 60; m += intervalo) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }

    const inicio = new Date(data)
    const fim    = new Date(data)
    fim.setDate(fim.getDate() + 1)

    const existentes = await prisma.agendamento.findMany({
      where:  { dataHora: { gte: inicio, lt: fim }, status: { not: 'CANCELADO' } },
      select: { dataHora: true },
    })

    const ocupados = new Set(existentes.map(a => {
      const h = String(a.dataHora.getHours()).padStart(2, '0')
      const m = String(a.dataHora.getMinutes()).padStart(2, '0')
      return `${h}:${m}`
    }))

    const hoje  = dayjs()
    const isHoje = dayjs(data).format('YYYY-MM-DD') === hoje.format('YYYY-MM-DD')

    return slots.map(slot => {
      const [h, m] = slot.split(':').map(Number)
      const slotMin = h * 60 + m
      const agoraMin = hoje.hour() * 60 + hoje.minute()
      const passado = isHoje && slotMin <= agoraMin + 30
      return { hora: slot, disponivel: !ocupados.has(slot) && !passado }
    })
  })

  // ── Criar agendamento público (sem autenticação) ─────────────
  app.post('/', async (req, reply) => {
    const body = z.object({
      nome:        z.string().min(2),
      telefone:    z.string().min(8),
      tipoServico: z.string().min(1),
      dataHora:    z.string(),
      observacao:  z.string().optional(),
    }).parse(req.body)

    // Busca cliente pelo telefone (últimos 9 dígitos) ou cria
    const foneNums = body.telefone.replace(/\D/g, '')
    const foneChave = foneNums.slice(-9)

    let cliente = await prisma.cliente.findFirst({
      where: { telefone: { endsWith: foneChave } },
    })

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: { nome: body.nome, telefone: body.telefone },
      })
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        clienteId:   cliente.id,
        dataHora:    new Date(body.dataHora),
        tipoServico: body.tipoServico,
        queixa:      body.observacao,
        status:      'PENDENTE',
      },
    })

    return reply.status(201).send({ id: agendamento.id, dataHora: agendamento.dataHora })
  })
}
