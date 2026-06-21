import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

export default function CaixaPage() {
  const qc = useQueryClient()
  const [dataFiltro, setDataFiltro] = useState(dayjs().format('YYYY-MM-DD'))
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tipo: 'SANGRIA', valor: '', descricao: '' })

  const { data } = useQuery({
    queryKey: ['caixa', dataFiltro],
    queryFn: () => api.get(`/caixa/dia?data=${dataFiltro}`).then(r => r.data),
  })

  const lancar = useMutation({
    mutationFn: () => api.post('/caixa', { ...form, valor: Number(form.valor) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa'] })
      setShowForm(false)
      setForm({ tipo: 'SANGRIA', valor: '', descricao: '' })
    },
  })

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Caixa</h1>
        <div className="flex items-center gap-3">
          <input type="date" className="input w-auto" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} />
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" /> Lançamento
          </button>
        </div>
      </div>

      {/* Saldo */}
      {data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 text-center">
            <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-2" />
            <p className="text-lg font-bold text-green-700">
              {Number(data.entradas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-gray-500">Entradas</p>
          </div>
          <div className="card p-4 text-center">
            <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-2" />
            <p className="text-lg font-bold text-red-700">
              {Number(data.saidas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-gray-500">Saídas</p>
          </div>
          <div className="card p-4 text-center border-pink-200 bg-pink-50">
            <p className="text-xs text-pink-600 font-semibold uppercase tracking-wide mb-2">Saldo</p>
            <p className={`text-lg font-bold ${Number(data.saldo) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {Number(data.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      )}

      {/* Form novo lançamento */}
      {showForm && (
        <div className="card p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Novo lançamento manual</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                <option value="SANGRIA">Sangria</option>
                <option value="SAIDA">Saída / Despesa</option>
                <option value="DEPOSITO">Depósito</option>
                <option value="ENTRADA">Entrada avulsa</option>
              </select>
            </div>
            <div>
              <label className="label">Valor (R$)</label>
              <input className="input" type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
            </div>
            <div>
              <label className="label">Descrição</label>
              <input className="input" placeholder="Ex: Sangria final do dia" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => lancar.mutate()} disabled={!form.valor || !form.descricao || lancar.isPending}>
              Registrar
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lançamentos */}
      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-50">
          {!data?.lancamentos?.length && (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">Nenhum lançamento neste dia</p>
          )}
          {data?.lancamentos?.map((l: Record<string, unknown>) => {
            const isEntrada = ['ENTRADA', 'DEPOSITO'].includes(l.tipo as string)
            return (
              <div key={l.id as string} className="px-4 py-3 flex items-center gap-4">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isEntrada ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{l.descricao as string}</p>
                  <p className="text-xs text-gray-400">{dayjs(l.data as string).format('HH:mm')} · {l.tipo as string}</p>
                </div>
                <span className={`text-sm font-semibold ${isEntrada ? 'text-green-700' : 'text-red-700'}`}>
                  {isEntrada ? '+' : '-'}{Number(l.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
