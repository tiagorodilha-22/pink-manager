import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../shared/prisma'
import { authenticate } from '../../../shared/auth.middleware'

const MESES_PT = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const METODOS_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'Pix', CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito', BOLETO: 'Boleto', TRANSFERENCIA: 'Transferência',
}

const CATEGORIAS_LABEL: Record<string, string> = {
  FORNECEDOR: 'Fornecedores', ALUGUEL: 'Aluguel', SALARIO: 'Salários',
  UTILIDADE: 'Utilidades', IMPOSTO: 'Impostos', OUTROS: 'Outros',
}

export default async function relatoriosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // ── DRE mensal ─────────────────────────────────────────────
  app.get('/dre', async (req) => {
    const { mes, ano } = z.object({
      mes: z.coerce.number().int().min(1).max(12),
      ano: z.coerce.number().int().min(2020),
    }).parse(req.query)

    const inicio = new Date(ano, mes - 1, 1)
    const fim    = new Date(ano, mes, 0, 23, 59, 59)

    const [pagamentos, despesasPagas] = await Promise.all([
      prisma.pagamento.findMany({
        where: { createdAt: { gte: inicio, lte: fim } },
        select: { metodo: true, valor: true },
      }),
      prisma.contaPagar.findMany({
        where: { dataPagamento: { gte: inicio, lte: fim } },
        select: { categoria: true, valor: true },
      }),
    ])

    // Receitas agrupadas por método
    const receitasPorMetodo: Record<string, number> = {}
    for (const p of pagamentos) {
      const label = METODOS_LABEL[p.metodo] ?? p.metodo
      receitasPorMetodo[label] = (receitasPorMetodo[label] ?? 0) + Number(p.valor)
    }

    const totalReceitas = Object.values(receitasPorMetodo).reduce((s, v) => s + v, 0)

    // Despesas agrupadas por categoria
    const despesasPorCategoria: Record<string, number> = {}
    for (const d of despesasPagas) {
      const label = CATEGORIAS_LABEL[d.categoria] ?? d.categoria
      despesasPorCategoria[label] = (despesasPorCategoria[label] ?? 0) + Number(d.valor)
    }

    const totalDespesas = Object.values(despesasPorCategoria).reduce((s, v) => s + v, 0)
    const resultado     = totalReceitas - totalDespesas

    return {
      periodo: { mes, ano, label: `${MESES_PT[mes]} de ${ano}` },
      receitas: {
        total: totalReceitas,
        itens: Object.entries(receitasPorMetodo)
          .map(([label, valor]) => ({ label, valor }))
          .sort((a, b) => b.valor - a.valor),
      },
      despesas: {
        total: totalDespesas,
        itens: Object.entries(despesasPorCategoria)
          .map(([label, valor]) => ({ label, valor }))
          .sort((a, b) => b.valor - a.valor),
      },
      resultado,
      margem: totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0,
    }
  })

  // ── Comparativo últimos 12 meses ───────────────────────────
  app.get('/dre/historico', async () => {
    const agora = new Date()
    const meses = Array.from({ length: 12 }, (_, i) => {
      const d    = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      return { mes: d.getMonth() + 1, ano: d.getFullYear() }
    }).reverse()

    const resultado = await Promise.all(
      meses.map(async ({ mes, ano }) => {
        const inicio = new Date(ano, mes - 1, 1)
        const fim    = new Date(ano, mes, 0, 23, 59, 59)
        const [pag, desp] = await Promise.all([
          prisma.pagamento.aggregate({
            where: { createdAt: { gte: inicio, lte: fim } },
            _sum: { valor: true },
          }),
          prisma.contaPagar.aggregate({
            where: { dataPagamento: { gte: inicio, lte: fim } },
            _sum: { valor: true },
          }),
        ])
        const receita  = Number(pag._sum.valor  ?? 0)
        const despesa  = Number(desp._sum.valor ?? 0)
        return {
          label: new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          receita,
          despesa,
          resultado: receita - despesa,
        }
      }),
    )

    return resultado
  })
}
