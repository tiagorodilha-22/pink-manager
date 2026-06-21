import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import dayjs from 'dayjs'

const STATUS_LABEL: Record<string, string> = {
  RECEPCAO: 'Recepção', DIAGNOSTICO: 'Diagnóstico',
  AGUARDANDO_APROVACAO: 'Aguard. Aprovação', APROVADA: 'Aprovada',
  EM_MANUTENCAO: 'Manutenção', VALIDACAO: 'Validação',
  AGUARDANDO_RETIRADA: 'Aguard. Retirada', ENTREGUE: 'Entregue', CANCELADA: 'Cancelada',
}

const STATUS_COR: Record<string, string> = {
  RECEPCAO: 'bg-gray-100 text-gray-600',
  DIAGNOSTICO: 'bg-blue-100 text-blue-700',
  AGUARDANDO_APROVACAO: 'bg-yellow-100 text-yellow-700',
  APROVADA: 'bg-indigo-100 text-indigo-700',
  EM_MANUTENCAO: 'bg-orange-100 text-orange-700',
  VALIDACAO: 'bg-purple-100 text-purple-700',
  AGUARDANDO_RETIRADA: 'bg-teal-100 text-teal-700',
  ENTREGUE: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-red-100 text-red-600',
}

export default function OSListPage() {
  const navigate = useNavigate()
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca, setBusca] = useState('')

  const { data: osList = [], isLoading } = useQuery({
    queryKey: ['os-list', filtroStatus],
    queryFn: () => api.get(`/os${filtroStatus ? `?status=${filtroStatus}` : ''}`).then(r => r.data),
  })

  const filtradas = osList.filter((os: Record<string, unknown>) => {
    if (!busca) return true
    const veiculo = os.veiculo as Record<string, unknown>
    const cliente = veiculo?.cliente as Record<string, string>
    const lower = busca.toLowerCase()
    return (
      String(os.numero).includes(lower) ||
      (cliente?.nome ?? '').toLowerCase().includes(lower) ||
      (veiculo?.placa as string ?? '').toLowerCase().includes(lower)
    )
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Ordens de Serviço</h1>
        <button className="btn-primary" onClick={() => navigate('/os/nova')}>
          <Plus className="w-4 h-4" /> Nova OS
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nº, cliente ou placa…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Nº OS', 'Cliente', 'Veículo', 'Placa', 'Status', 'Valor', 'Entrada'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>
            )}
            {!isLoading && !filtradas.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhuma OS encontrada</td></tr>
            )}
            {filtradas.map((os: Record<string, unknown>) => {
              const veiculo = os.veiculo as Record<string, unknown>
              const cliente = (veiculo?.cliente as Record<string, string>) ?? {}
              return (
                <tr
                  key={os.id as string}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/os/${os.id}`)}
                >
                  <td className="px-4 py-3 font-mono font-semibold text-pink-700">#{os.numero as number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{cliente.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{veiculo?.marca as string} {veiculo?.modelo as string}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{veiculo?.placa as string}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COR[os.status as string] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[os.status as string] ?? os.status as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {Number(os.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {dayjs(os.dataEntrada as string).format('DD/MM/YY')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
