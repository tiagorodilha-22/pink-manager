import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import dayjs from 'dayjs'

const STATUS_COR: Record<string, string> = {
  PENDENTE: 'bg-gray-100 text-gray-600', CONFIRMADO: 'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700', CONCLUIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-600',
}

export default function AgendamentosPage() {
  const qc = useQueryClient()
  const [data, setData] = useState(dayjs().format('YYYY-MM-DD'))

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos', data],
    queryFn: () => api.get(`/agendamentos?data=${data}`).then(r => r.data),
  })

  const atualizar = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/agendamentos/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agendamentos'] }),
  })

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-pink-600" />
          <h1 className="text-xl font-bold text-gray-900">Agendamentos</h1>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" className="input w-auto" value={data} onChange={e => setData(e.target.value)} />
          <button className="btn-primary"><Plus className="w-4 h-4" /> Novo</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Hora', 'Cliente', 'Veículo', 'Placa', 'Serviço', 'Status', 'Ação'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>}
            {!isLoading && !agendamentos.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum agendamento para este dia</td></tr>
            )}
            {agendamentos.map((a: Record<string, unknown>) => {
              const cliente = a.cliente as Record<string, string>
              const veiculo = a.veiculo as Record<string, string>
              return (
                <tr key={a.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500">{dayjs(a.dataHora as string).format('HH:mm')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{cliente.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{veiculo.marca} {veiculo.modelo}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{veiculo.placa}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{a.tipoServico as string}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COR[a.status as string] ?? ''}`}>
                      {(a.status as string).replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'PENDENTE' && (
                      <button
                        className="text-xs text-pink-600 hover:text-pink-800 font-medium"
                        onClick={() => atualizar.mutate({ id: a.id as string, status: 'CONFIRMADO' })}
                      >
                        Confirmar
                      </button>
                    )}
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
