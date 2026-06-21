import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, AlertCircle, RefreshCw, Link } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

export default function ConciliacaoPage() {
  const qc = useQueryClient()
  const [selecionadoPag, setSelecionadoPag] = useState<string | null>(null)
  const [selecionadoExt, setSelecionadoExt] = useState<string | null>(null)

  const { data: dashboard } = useQuery({
    queryKey: ['conciliacao-dashboard'],
    queryFn: () => api.get('/conciliacao/dashboard').then(r => r.data),
  })

  const { data: pendentes = [] } = useQuery({
    queryKey: ['conciliacao-pendentes'],
    queryFn: () => api.get('/conciliacao/pendentes').then(r => r.data),
  })

  const { data: extratos = [] } = useQuery({
    queryKey: ['extrato-pendente'],
    queryFn: () => api.get('/conciliacao/extrato-pendente').then(r => r.data),
  })

  const executar = useMutation({
    mutationFn: () => api.post('/conciliacao/executar'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conciliacao'] }),
  })

  const conciliarManual = useMutation({
    mutationFn: ({ pagamentoId, lancamentoId }: { pagamentoId: string; lancamentoId: string }) =>
      api.post('/conciliacao/manual', { pagamentoId, lancamentoId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conciliacao'] })
      setSelecionadoPag(null)
      setSelecionadoExt(null)
    },
  })

  function handleConciliarManual() {
    if (selecionadoPag && selecionadoExt) {
      conciliarManual.mutate({ pagamentoId: selecionadoPag, lancamentoId: selecionadoExt })
    }
  }

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Conciliação Bancária</h1>
          <p className="text-sm text-gray-500">Cruzamento entre pagamentos das OS e lançamentos do extrato</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => executar.mutate()}
          disabled={executar.isPending}
        >
          <RefreshCw className={`w-4 h-4 ${executar.isPending ? 'animate-spin' : ''}`} />
          Executar automático
        </button>
      </div>

      {/* Resumo */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pendentes', value: dashboard.pendentes, cor: 'text-yellow-600 bg-yellow-50' },
            { label: 'Conciliados', value: dashboard.conciliados, cor: 'text-green-600 bg-green-50' },
            { label: 'Não identificados', value: dashboard.naoIdentificados, cor: 'text-red-600 bg-red-50' },
            { label: 'Extrato pendente', value: dashboard.extratoNaoConciliado, cor: 'text-blue-600 bg-blue-50' },
          ].map(({ label, value, cor }) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${cor.split(' ')[0]}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {executar.data && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          {(executar.data.data as Record<string, number>).automaticos} conciliados automaticamente ·{' '}
          {(executar.data.data as Record<string, number>).semMatch} sem match
        </div>
      )}

      {/* Conciliação manual */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-semibold text-gray-900">Conciliação manual</h2>
        {selecionadoPag && selecionadoExt && (
          <button
            className="btn-primary"
            onClick={handleConciliarManual}
            disabled={conciliarManual.isPending}
          >
            <Link className="w-4 h-4" /> Conciliar selecionados
          </button>
        )}
        {selecionadoPag && selecionadoExt && (
          <p className="text-xs text-gray-500">1 pagamento + 1 lançamento selecionados</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pagamentos pendentes */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-yellow-50">
            <p className="font-semibold text-sm text-yellow-800">Pagamentos sem conciliação</p>
            <p className="text-xs text-yellow-600">Clique para selecionar</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {!pendentes.length && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum pendente</p>
            )}
            {pendentes.map((p: Record<string, unknown>) => {
              const os = p.os as Record<string, unknown>
              const veiculo = (os?.veiculo as Record<string, unknown>) ?? {}
              const cliente = (veiculo?.cliente as Record<string, string>) ?? {}
              const selecionado = selecionadoPag === p.id
              return (
                <button
                  key={p.id as string}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${selecionado ? 'bg-yellow-50 border-l-2 border-yellow-400' : ''}`}
                  onClick={() => setSelecionadoPag(selecionado ? null : p.id as string)}
                >
                  <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      OS #{(os?.numero as number) ?? '—'} · {cliente.nome ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.metodo as string}{p.adquirente ? ` · ${p.adquirente}` : ''}{p.nsu ? ` · NSU ${p.nsu}` : ' · sem NSU'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                    {Number(p.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Lançamentos do extrato */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
            <p className="font-semibold text-sm text-blue-800">Lançamentos no extrato</p>
            <p className="text-xs text-blue-600">Clique para selecionar</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {!extratos.length && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum lançamento pendente</p>
            )}
            {extratos.map((l: Record<string, unknown>) => {
              const selecionado = selecionadoExt === l.id
              return (
                <button
                  key={l.id as string}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${selecionado ? 'bg-blue-50 border-l-2 border-blue-400' : ''}`}
                  onClick={() => setSelecionadoExt(selecionado ? null : l.id as string)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{l.descricao as string}</p>
                    <p className="text-xs text-gray-500">
                      {dayjs(l.data as string).format('DD/MM/YYYY')} · {l.origem as string}
                      {l.nsuRef ? ` · NSU ${l.nsuRef}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-700 flex-shrink-0">
                    +{Number(l.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
