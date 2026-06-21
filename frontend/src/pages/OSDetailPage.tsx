import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import dayjs from 'dayjs'

export default function OSDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: os, isLoading } = useQuery({
    queryKey: ['os', id],
    queryFn: () => api.get(`/os/${id}`).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return <div className="p-6 text-gray-400">Carregando OS…</div>
  if (!os) return <div className="p-6 text-gray-400">OS não encontrada</div>

  const veiculo = os.veiculo
  const cliente = veiculo?.cliente

  return (
    <div className="p-6 max-w-4xl">
      <button className="btn-ghost mb-4 -ml-2" onClick={() => navigate('/os')}>
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">OS #{os.numero}</h1>
          <p className="text-sm text-gray-500">{dayjs(os.dataEntrada).format('DD/MM/YYYY HH:mm')}</p>
        </div>
        <span className="badge bg-pink-100 text-pink-700 text-sm py-1 px-3">{os.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Cliente</p>
          <p className="font-semibold text-gray-900">{cliente?.nome}</p>
          <p className="text-sm text-gray-500">{cliente?.telefone}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Veículo</p>
          <p className="font-semibold text-gray-900">{veiculo?.marca} {veiculo?.modelo} {veiculo?.ano}</p>
          <p className="text-sm text-gray-500 font-mono">{veiculo?.placa}</p>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Queixa do cliente</p>
        <p className="text-gray-800">{os.queixa}</p>
      </div>

      {os.pagamentos?.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Pagamentos</p>
          <div className="space-y-2">
            {os.pagamentos.map((p: Record<string, unknown>) => (
              <div key={p.id as string} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {p.metodo as string}{p.adquirente ? ` · ${p.adquirente}` : ''}
                  {p.qtdParcelas && Number(p.qtdParcelas) > 1 ? ` · ${p.qtdParcelas}x` : ''}
                  {p.nsu ? <span className="ml-2 font-mono text-xs text-gray-400">NSU {p.nsu as string}</span> : ''}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {Number(p.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className={`badge text-xs ${p.statusConcil === 'CONCILIADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {p.statusConcil as string}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span>{Number(os.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>
      )}
    </div>
  )
}
