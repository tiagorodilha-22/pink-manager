import { useQuery } from '@tanstack/react-query'
import { ClipboardList, CreditCard, Wallet, TrendingUp, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

export default function DashboardPage() {
  const { data: conciliacao } = useQuery({
    queryKey: ['conciliacao-dashboard'],
    queryFn: () => api.get('/conciliacao/dashboard').then(r => r.data),
  })

  const { data: os } = useQuery({
    queryKey: ['os-ativas'],
    queryFn: () => api.get('/os?status=EM_MANUTENCAO').then(r => r.data),
  })

  const { data: agendamentos } = useQuery({
    queryKey: ['agendamentos-hoje'],
    queryFn: () => api.get(`/agendamentos?data=${dayjs().format('YYYY-MM-DD')}`).then(r => r.data),
  })

  const { data: caixa } = useQuery({
    queryKey: ['caixa-hoje'],
    queryFn: () => api.get('/caixa/dia').then(r => r.data),
  })

  const cards = [
    {
      label: 'OS em manutenção',
      value: os?.length ?? '—',
      icon: ClipboardList,
      cor: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Pendentes conciliação',
      value: conciliacao?.pendentes ?? '—',
      icon: CreditCard,
      cor: conciliacao?.pendentes > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600',
    },
    {
      label: 'A receber',
      value: conciliacao?.totalReceber
        ? `R$ ${Number(conciliacao.totalReceber).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '—',
      icon: TrendingUp,
      cor: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Caixa hoje',
      value: caixa?.saldo != null
        ? `R$ ${Number(caixa.saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '—',
      icon: Wallet,
      cor: 'bg-pink-50 text-pink-600',
    },
  ]

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">{dayjs().format('dddd, D [de] MMMM [de] YYYY')}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, cor }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${cor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Alerta conciliação pendente */}
      {conciliacao?.pendentes > 0 && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              {conciliacao.pendentes} pagamento{conciliacao.pendentes > 1 ? 's' : ''} aguardando conciliação
            </p>
            <p className="text-sm text-yellow-700 mt-0.5">
              Importe o extrato do Inter ou os relatórios Rede/Stone para conciliar.
            </p>
          </div>
        </div>
      )}

      {/* Agendamentos do dia */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Agendamentos de hoje</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {!agendamentos?.length && (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Nenhum agendamento para hoje</p>
          )}
          {agendamentos?.map((a: Record<string, unknown>) => {
            const cliente = a.cliente as Record<string, string>
            const veiculo = a.veiculo as Record<string, string>
            return (
              <div key={a.id as string} className="px-5 py-3 flex items-center gap-4">
                <span className="text-sm font-mono text-gray-500 w-12 flex-shrink-0">
                  {dayjs(a.dataHora as string).format('HH:mm')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{cliente.nome}</p>
                  <p className="text-xs text-gray-500">{veiculo.marca} {veiculo.modelo} · {veiculo.placa}</p>
                </div>
                <span className="text-xs text-gray-500 truncate max-w-32">{a.tipoServico as string}</span>
                <StatusBadge status={a.status as string} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDENTE: 'bg-gray-100 text-gray-600',
    CONFIRMADO: 'bg-blue-100 text-blue-700',
    EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
    CONCLUIDO: 'bg-green-100 text-green-700',
    CANCELADO: 'bg-red-100 text-red-600',
  }
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado',
    EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
  }
  return <span className={`badge ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>{labels[status] ?? status}</span>
}
