import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart2, TrendingUp, TrendingDown, Minus,
  ChevronDown, Download,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'
import { api } from '../../lib/api'

const fmt    = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtK   = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : fmt(v)
const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`

interface DREItem   { label: string; valor: number }
interface DRE {
  periodo: { mes: number; ano: number; label: string }
  receitas: { total: number; itens: DREItem[] }
  despesas: { total: number; itens: DREItem[] }
  resultado: number
  margem: number
}
interface HistoricoMes { label: string; receita: number; despesa: number; resultado: number }

const ANOS  = [2024, 2025, 2026]
const MESES = [
  { v: 1, l: 'Janeiro' }, { v: 2, l: 'Fevereiro' }, { v: 3, l: 'Março' },
  { v: 4, l: 'Abril' },   { v: 5, l: 'Maio' },      { v: 6, l: 'Junho' },
  { v: 7, l: 'Julho' },   { v: 8, l: 'Agosto' },    { v: 9, l: 'Setembro' },
  { v: 10, l: 'Outubro' },{ v: 11, l: 'Novembro' }, { v: 12, l: 'Dezembro' },
]

function exportCSV(dre: DRE) {
  const linhas = [
    [`DRE — ${dre.periodo.label}`],
    [],
    ['RECEITAS'],
    ['Forma de Pagamento', 'Valor'],
    ...dre.receitas.itens.map(i => [i.label, i.valor.toFixed(2)]),
    ['Total Receitas', dre.receitas.total.toFixed(2)],
    [],
    ['DESPESAS'],
    ['Categoria', 'Valor'],
    ...dre.despesas.itens.map(i => [i.label, i.valor.toFixed(2)]),
    ['Total Despesas', dre.despesas.total.toFixed(2)],
    [],
    ['RESULTADO', dre.resultado.toFixed(2)],
    ['MARGEM (%)', dre.margem.toFixed(1)],
  ]
  const csv  = linhas.map(l => l.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `DRE-${dre.periodo.ano}-${String(dre.periodo.mes).padStart(2, '0')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function RelatoriosPage() {
  const agora = new Date()
  const [mes,  setMes]  = useState(agora.getMonth() + 1)
  const [ano,  setAno]  = useState(agora.getFullYear())

  const { data: dre, isLoading } = useQuery<DRE>({
    queryKey: ['dre', mes, ano],
    queryFn:  () => api.get(`/relatorios/dre?mes=${mes}&ano=${ano}`).then(r => r.data),
  })

  const { data: historico = [] } = useQuery<HistoricoMes[]>({
    queryKey: ['dre-historico'],
    queryFn:  () => api.get('/relatorios/dre/historico').then(r => r.data),
  })

  const resultado   = dre?.resultado ?? 0
  const positivo    = resultado >= 0
  const ResultIcon  = resultado === 0 ? Minus : positivo ? TrendingUp : TrendingDown

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-pink-600" />
          <h1 className="text-xl font-bold text-gray-900">Relatórios Financeiros</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Seletor mês */}
          <div className="relative">
            <select
              className="input appearance-none pr-8 text-sm py-2"
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
            >
              {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
          </div>
          {/* Seletor ano */}
          <div className="relative">
            <select
              className="input appearance-none pr-8 text-sm py-2 w-24"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
            >
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
          </div>
          {dre && (
            <button className="btn-secondary py-2 flex items-center gap-1.5 text-sm" onClick={() => exportCSV(dre)}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Carregando…</p>}

      {dre && (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Receita</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(dre.receitas.total)}</p>
              <p className="text-xs text-gray-400 mt-1">{dre.receitas.itens.length} formas de pagamento</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Despesas</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(dre.despesas.total)}</p>
              <p className="text-xs text-gray-400 mt-1">{dre.despesas.itens.length} categorias</p>
            </div>
            <div className={`card p-5 ${positivo ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Resultado</p>
              <p className={`text-2xl font-bold ${positivo ? 'text-green-700' : 'text-red-600'}`}>
                {fmt(resultado)}
              </p>
              <p className={`text-xs mt-1 flex items-center gap-1 ${positivo ? 'text-green-600' : 'text-red-500'}`}>
                <ResultIcon className="w-3 h-3" />
                Margem {fmtPct(dre.margem)}
              </p>
            </div>
          </div>

          {/* DRE tabela lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Receitas */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-green-50/50">
                <span className="text-sm font-semibold text-green-800">Receitas — {fmt(dre.receitas.total)}</span>
              </div>
              {dre.receitas.itens.length === 0 && (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum recebimento no período</p>
              )}
              {dre.receitas.itens.map(item => (
                <div key={item.label} className="px-4 py-2.5 flex items-center gap-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.label}</span>
                      <span className="font-semibold text-gray-900">{fmt(item.valor)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full"
                        style={{ width: `${(item.valor / dre.receitas.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {((item.valor / dre.receitas.total) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Despesas */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-red-50/50">
                <span className="text-sm font-semibold text-red-800">Despesas — {fmt(dre.despesas.total)}</span>
              </div>
              {dre.despesas.itens.length === 0 && (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhuma despesa no período</p>
              )}
              {dre.despesas.itens.map(item => (
                <div key={item.label} className="px-4 py-2.5 flex items-center gap-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.label}</span>
                      <span className="font-semibold text-gray-900">{fmt(item.valor)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full"
                        style={{ width: `${dre.despesas.total > 0 ? (item.valor / dre.despesas.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {dre.despesas.total > 0 ? ((item.valor / dre.despesas.total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Histórico 12 meses */}
      {historico.length > 0 && (
        <div className="card p-5">
          <p className="font-semibold text-gray-900 mb-4">Histórico — últimos 12 meses</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={historico} barSize={16} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                formatter={(v, name) => {
                  const labels: Record<string, string> = { receita: 'Receita', despesa: 'Despesas', resultado: 'Resultado' }
                  return [fmt(Number(v ?? 0)), labels[String(name)] ?? String(name)]
                }}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 11 }}
              />
              <Legend formatter={(v: string) => ({ receita: 'Receita', despesa: 'Despesas', resultado: 'Resultado' } as Record<string, string>)[v] ?? v} />
              <Bar dataKey="receita"   fill="#e91e8c" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despesa"   fill="#f87171" radius={[3, 3, 0, 0]} />
              <Bar dataKey="resultado" fill="#34d399" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
