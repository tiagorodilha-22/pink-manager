import { FastifyInstance } from 'fastify'
import prisma from '../../shared/prisma'
import { authenticate } from '../../shared/auth.middleware'

export default async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // ── KPIs principais ─────────────────────────────────────────
  app.get('/kpis', async () => {
    const agora      = new Date()
    const inicioMes  = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const inicioMAnt = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
    const fimMAnt    = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59)

    const [osAtivas, pagMes, pagMAnt, osEntreguesMes, contasVencidas] = await Promise.all([
      prisma.ordemServico.findMany({
        where: { status: { notIn: ['ENTREGUE', 'CANCELADA'] } },
        select: { status: true },
      }),
      prisma.pagamento.aggregate({
        where: { createdAt: { gte: inicioMes } },
        _sum: { valor: true },
        _count: { id: true },
      }),
      prisma.pagamento.aggregate({
        where: { createdAt: { gte: inicioMAnt, lte: fimMAnt } },
        _sum: { valor: true },
      }),
      prisma.ordemServico.count({
        where: { status: 'ENTREGUE', dataEntrega: { gte: inicioMes } },
      }),
      prisma.contaPagar.count({
        where: { dataPagamento: null, dataVencimento: { lt: agora }, status: { not: 'CANCELADA' } },
      }),
    ])

    const estoqueAlertas = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM inventario WHERE ativo = 1 AND quantidade <= qtdMinima
    `

    const receitaMes     = Number(pagMes._sum.valor   ?? 0)
    const receitaMAnt    = Number(pagMAnt._sum.valor   ?? 0)
    const qtdOSMes       = pagMes._count.id ?? 0
    const ticketMedio    = osEntreguesMes > 0 ? receitaMes / osEntreguesMes : 0

    const porStatus: Record<string, number> = {}
    for (const os of osAtivas) {
      porStatus[os.status] = (porStatus[os.status] ?? 0) + 1
    }

    return {
      os: {
        total: osAtivas.length,
        porStatus,
        aguardandoRetirada: porStatus['AGUARDANDO_RETIRADA'] ?? 0,
      },
      financeiro: {
        receitaMes,
        receitaMAnt,
        variacaoReceita: receitaMAnt > 0 ? ((receitaMes - receitaMAnt) / receitaMAnt) * 100 : null,
        ticketMedio,
        qtdOSMes,
        contasVencidas,
      },
      estoque: {
        alertas: Number(estoqueAlertas[0]?.count ?? 0),
      },
    }
  })

  // ── Receita dos últimos 6 meses ─────────────────────────────
  app.get('/receita-mensal', async () => {
    const agora = new Date()
    const meses: Array<{ label: string; inicio: Date; fim: Date }> = []

    for (let i = 5; i >= 0; i--) {
      const d     = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1)
      const fim    = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const label  = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      meses.push({ label, inicio, fim })
    }

    const resultado = await Promise.all(
      meses.map(async ({ label, inicio, fim }) => {
        const [pag, os] = await Promise.all([
          prisma.pagamento.aggregate({
            where: { createdAt: { gte: inicio, lte: fim } },
            _sum: { valor: true },
          }),
          prisma.ordemServico.count({
            where: { status: 'ENTREGUE', dataEntrega: { gte: inicio, lte: fim } },
          }),
        ])
        return { label, receita: Number(pag._sum.valor ?? 0), os }
      }),
    )

    return resultado
  })

  // ── OS por status (para mini funil) ─────────────────────────
  app.get('/os-funil', async () => {
    const ORDEM = [
      'RECEPCAO', 'DIAGNOSTICO', 'AGUARDANDO_APROVACAO',
      'APROVADA', 'EM_MANUTENCAO', 'VALIDACAO', 'AGUARDANDO_RETIRADA',
    ]
    const LABELS: Record<string, string> = {
      RECEPCAO: 'Recepção', DIAGNOSTICO: 'Diagnóstico',
      AGUARDANDO_APROVACAO: 'Ag. Aprovação', APROVADA: 'Aprovada',
      EM_MANUTENCAO: 'Manutenção', VALIDACAO: 'Validação',
      AGUARDANDO_RETIRADA: 'Ag. Retirada',
    }

    const os = await prisma.ordemServico.findMany({
      where: { status: { notIn: ['ENTREGUE', 'CANCELADA'] } },
      select: { status: true },
    })

    const contagem: Record<string, number> = {}
    for (const o of os) contagem[o.status] = (contagem[o.status] ?? 0) + 1

    return ORDEM.map(s => ({ status: s, label: LABELS[s], count: contagem[s] ?? 0 }))
  })
}
