import { useQuery } from '@tanstack/react-query'
import {
  ClipboardList, TrendingUp, TrendingDown, AlertTriangle,
  Wallet, Package, CheckCircle2, Clock,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { api } from '../lib/api'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { useNavigate } from 'react-router-dom'

dayjs.locale('pt-br')

const fmt  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtK = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : fmt(v)

const STATUS_LABEL: Record<string, string> = {
  RECEPCAO: 'Recepção', DIAGNOSTICO: 'Diagnóstico',
  AGUARDANDO_APROVACAO: 'Ag. Aprovação', APROVADA: 'Aprovada',
  EM_MANUTENCAO: 'Manutenção', VALIDACAO: 'Validação',
  AGUARDANDO_RETIRADA: 'Ag. Retirada',
}
const STATUS_COR: Record<string, string> = {
  RECEPCAO: 'bg-gray-100 text-gray-600', DIAGNOSTICO: 'bg-blue-100 text-blue-700',
  AGUARDANDO_APROVACAO: 'bg-yellow-100 text-yellow-700', APROVADA: 'bg-indigo-100 text-indigo-700',
  EM_MANUTENCAO: 'bg-orange-100 text-orange-700', VALIDACAO: 'bg-purple-100 text-purple-700',
  AGUARDANDO_RETIRADA: 'bg-teal-100 text-teal-700',
}

interface KPIs {
  os: { total: number; porStatus: Record<string, number>; aguardandoRetirada: number }
  financeiro: {
    receitaMes: number; receitaMAnt: number; variacaoReceita: number | null
    ticketMedio: number; qtdOSMes: number; contasVencidas: number
  }
  estoque: { alertas: number }
}

interface MesReceita { label: string; receita: number; os: number }
interface OsFunil    { status: string; label: string; count: number }

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: kpis } = useQuery<KPIs>({
    queryKey: ['dashboard-kpis'],
    queryFn:  () => api.get('/dashboard/kpis').then(r => r.data),
  })

  const { data: receitaMensal = [] } = useQuery<MesReceita[]>({
    queryKey: ['dashboard-receita'],
    queryFn:  () => api.get('/dashboard/receita-mensal').then(r => r.data),
  })

  const { data: funil = [] } = useQuery<OsFunil[]>({
    queryKey: ['dashboard-funil'],
    queryFn:  () => api.get('/dashboard/os-funil').then(r => r.data),
  })

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-hoje'],
    queryFn:  () => api.get(`/agendamentos?data=${dayjs().format('YYYY-MM-DD')}`).then(r => r.data),
  })

  const variacao = kpis?.financeiro.variacaoReceita
  const positivo = variacao != null && variacao >= 0

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 capitalize">{dayjs().format('dddd, D [de] MMMM [de] YYYY')}</p>
      </div>

      {/* KPI Cards — linha 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* OS em aberto */}
        <div className="card p-5 cursor-pointer hover:border-pink-200 transition-colors" onClick={() => navigate('/os')}>
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4.5 h-4.5 text-blue-600 w-5 h-5" />
            </div>
            {(kpis?.os.aguardandoRetirada ?? 0) > 0 && (
              <span className="badge bg-teal-100 text-teal-700 text-xs">{kpis!.os.aguardandoRetirada} prontas</span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">{kpis?.os.total ?? '—'}</p>
          <p className="text-sm text-gray-500 mt-0.5">OS em andamento</p>
        </div>

        {/* Receita do mês */}
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-pink-50 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-pink-600" />
            </div>
            {variacao != null && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${positivo ? 'text-green-600' : 'text-red-500'}`}>
                {positivo ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {Math.abs(variacao).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">{kpis ? fmt(kpis.financeiro.receitaMes) : '—'}</p>
          <p className="text-sm text-gray-500 mt-0.5">Receita este mês</p>
        </div>

        {/* Ticket médio */}
        <div className="card p-5">
          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis ? fmt(kpis.financeiro.ticketMedio) : '—'}</p>
          <p className="text-sm text-gray-500 mt-0.5">Ticket médio · {kpis?.financeiro.qtdOSMes ?? 0} OS</p>
        </div>

        {/* Alertas */}
        <div className={`card p-5 ${(kpis?.financeiro.contasVencidas ?? 0) > 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
          <div className="flex items-start justify-between">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${(kpis?.financeiro.contasVencidas ?? 0) > 0 ? 'bg-red-100' : 'bg-orange-50'}`}>
              <AlertTriangle className={`w-5 h-5 ${(kpis?.financeiro.contasVencidas ?? 0) > 0 ? 'text-red-600' : 'text-orange-500'}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">
            {kpis ? `${kpis.financeiro.contasVencidas}` : '—'}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">Contas vencidas</p>
          {(kpis?.estoque.alertas ?? 0) > 0 && (
            <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />{kpis!.estoque.alertas} itens com estoque baixo
            </p>
          )}
        </div>
      </div>

      {/* Gráfico receita mensal + Funil OS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico receita — 2/3 */}
        <div className="card p-5 lg:col-span-2">
          <p className="font-semibold text-gray-900 mb-4">Receita mensal</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={receitaMensal} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                formatter={(v) => [fmt(Number(v ?? 0)), 'Receita']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="receita" fill="#e91e8c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Funil OS — 1/3 */}
        <div className="card p-5">
          <p className="font-semibold text-gray-900 mb-4">OS por etapa</p>
          <div className="space-y-2">
            {funil.filter(f => f.count > 0).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma OS em andamento</p>
            )}
            {funil.filter(f => f.count > 0).map(f => (
              <div key={f.status} className="flex items-center gap-2">
                <span className={`badge text-xs flex-shrink-0 ${STATUS_COR[f.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {f.label}
                </span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-400 rounded-full"
                    style={{ width: `${Math.min((f.count / Math.max(...funil.map(x => x.count), 1)) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-4 text-right">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agendamentos do dia */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Agendamentos de hoje</h2>
          <span className="text-xs text-gray-400">{agendamentos.length} agendamento{agendamentos.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {!agendamentos.length && (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Nenhum agendamento para hoje</p>
          )}
          {agendamentos.map((a: Record<string, unknown>) => {
            const cliente = a.cliente as Record<string, string>
            const veiculo = a.veiculo as Record<string, string>
            return (
              <div key={a.id as string} className="px-5 py-3 flex items-center gap-4">
                <span className="text-sm font-mono text-gray-400 w-12 flex-shrink-0">
                  {dayjs(a.dataHora as string).format('HH:mm')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{cliente?.nome}</p>
                  <p className="text-xs text-gray-400">{veiculo?.marca} {veiculo?.modelo} · {veiculo?.placa}</p>
                </div>
                <span className="text-xs text-gray-400 hidden sm:block truncate max-w-36">{a.tipoServico as string}</span>
                <AgendamentoBadge status={a.status as string} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AgendamentoBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDENTE: 'bg-gray-100 text-gray-600', CONFIRMADO: 'bg-blue-100 text-blue-700',
    EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700', CONCLUIDO: 'bg-green-100 text-green-700',
    CANCELADO: 'bg-red-100 text-red-600',
  }
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado',
    EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
  }
  const Icon = status === 'CONCLUIDO' ? CheckCircle2 : Clock
  return (
    <span className={`badge flex items-center gap-1 text-xs ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      <Icon className="w-3 h-3" />{labels[status] ?? status}
    </span>
  )
}
