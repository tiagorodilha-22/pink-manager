import { useQuery } from '@tanstack/react-query'
import { Calendar, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

export default function RecebiveisPage() {
  const { data: recebiveis = [] } = useQuery({
    queryKey: ['recebiveis'],
    queryFn: () => api.get('/pagamentos/recebiveis').then(r => r.data),
  })

  const total = recebiveis.reduce((s: number, r: Record<string, unknown>) => s + Number(r.valor), 0)
  const vencidos = recebiveis.filter((r: Record<string, unknown>) =>
    dayjs(r.dataPrevista as string).valueOf() < dayjs().startOf('day').valueOf()
  )

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">A Receber</h1>
      <p className="text-sm text-gray-500 mb-6">Parcelas de cartão de crédito e pagamentos pendentes</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-900">{recebiveis.length}</p>
          <p className="text-xs text-gray-500 mt-1">Parcelas pendentes</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-purple-700">
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total a receber</p>
        </div>
        <div className="card p-4 border-red-200 bg-red-50">
          <p className="text-2xl font-bold text-red-700">{vencidos.length}</p>
          <p className="text-xs text-gray-500 mt-1">Vencidas / atrasadas</p>
        </div>
      </div>

      {vencidos.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{vencidos.length} parcela{vencidos.length > 1 ? 's' : ''} com data prevista vencida — verifique a conciliação ou se o pagamento foi recebido.</span>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['OS', 'Cliente', 'Veículo', 'Método', 'Parcela', 'Valor', 'Data prevista', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!recebiveis.length && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhum recebível pendente</td></tr>
            )}
            {recebiveis.map((r: Record<string, unknown>) => {
              const pag = r.pagamento as Record<string, unknown>
              const os = pag?.os as Record<string, unknown>
              const veiculo = (os?.veiculo as Record<string, unknown>) ?? {}
              const cliente = (veiculo?.cliente as Record<string, string>) ?? {}
              const vencida = dayjs(r.dataPrevista as string).isBefore(dayjs(), 'day')
              return (
                <tr key={r.id as string} className={vencida ? 'bg-red-50' : ''}>
                  <td className="px-4 py-2.5 font-mono text-pink-700">#{os?.numero as number}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{cliente.nome ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {(veiculo?.placa as string) ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{pag?.metodo as string}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="badge bg-gray-100 text-gray-600">{r.numero as number}/{(pag?.qtdParcelas as number) ?? 1}</span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-900">
                    {Number(r.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-1.5 ${vencida ? 'text-red-600' : 'text-gray-600'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {dayjs(r.dataPrevista as string).format('DD/MM/YYYY')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${vencida ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {vencida ? 'Vencida' : 'A receber'}
                    </span>
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
