import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, XCircle, AlertTriangle, Clock, Edit2, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import dayjs from 'dayjs'
import Modal from '../../components/Modal'

interface ContaPagar {
  id: string
  descricao: string
  categoria: string
  valor: number
  dataVencimento: string
  dataPagamento?: string
  status: 'PENDENTE' | 'VENCIDO' | 'PAGO' | 'CANCELADO'
  observacoes?: string
}

const CATEGORIAS = [
  { value: 'FORNECEDOR', label: 'Fornecedor',  cor: 'bg-blue-100 text-blue-700' },
  { value: 'ALUGUEL',    label: 'Aluguel',     cor: 'bg-purple-100 text-purple-700' },
  { value: 'SALARIO',    label: 'Salário',     cor: 'bg-indigo-100 text-indigo-700' },
  { value: 'UTILIDADE',  label: 'Utilidade',   cor: 'bg-cyan-100 text-cyan-700' },
  { value: 'IMPOSTO',    label: 'Imposto',     cor: 'bg-orange-100 text-orange-700' },
  { value: 'OUTROS',     label: 'Outros',      cor: 'bg-gray-100 text-gray-600' },
]

const STATUS_COR: Record<string, string> = {
  PENDENTE:  'bg-yellow-100 text-yellow-700',
  VENCIDO:   'bg-red-100 text-red-700',
  PAGO:      'bg-green-100 text-green-700',
  CANCELADO: 'bg-gray-100 text-gray-400',
}
const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente', VENCIDO: 'Vencido', PAGO: 'Pago', CANCELADO: 'Cancelado',
}

const formatR = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ─── Formulário ──────────────────────────────────────────────────────────────

function ContaForm({ inicial, onSuccess, onCancel }: {
  inicial?: ContaPagar
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const [descricao, setDescricao]         = useState(inicial?.descricao ?? '')
  const [categoria, setCategoria]         = useState(inicial?.categoria ?? 'OUTROS')
  const [valor, setValor]                 = useState(inicial ? String(Number(inicial.valor)) : '')
  const [dataVencimento, setDataVencimento] = useState(
    inicial ? dayjs(inicial.dataVencimento).format('YYYY-MM-DD') : ''
  )
  const [observacoes, setObservacoes]     = useState(inicial?.observacoes ?? '')
  const [erro, setErro]                   = useState('')

  const salvar = useMutation({
    mutationFn: () => {
      const body = {
        descricao,
        categoria,
        valor: parseFloat(valor),
        dataVencimento: new Date(dataVencimento).toISOString(),
        observacoes: observacoes || undefined,
      }
      return inicial ? api.put(`/contas-pagar/${inicial.id}`, body) : api.post('/contas-pagar', body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-pagar'] })
      onSuccess()
    },
    onError: () => setErro('Erro ao salvar. Verifique os campos.'),
  })

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Descrição *</label>
        <input className="input" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Peças Motor ABC, Aluguel junho…" />
      </div>

      <div>
        <label className="label">Categoria</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategoria(c.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                categoria === c.value
                  ? 'border-pink-400 bg-pink-50 text-pink-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Valor (R$) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="input"
            placeholder="0,00"
            value={valor}
            onChange={e => setValor(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Vencimento *</label>
          <input
            type="date"
            className="input"
            value={dataVencimento}
            onChange={e => setDataVencimento(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Observações</label>
        <input className="input" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Nota fiscal, fornecedor…" />
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex gap-3 pt-1">
        <button
          className="btn-primary flex-1 justify-center"
          disabled={!descricao || !valor || !dataVencimento || salvar.isPending}
          onClick={() => salvar.mutate()}
        >
          {salvar.isPending ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Cadastrar conta'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ContasPagarPage() {
  const qc = useQueryClient()
  const [filtroStatus, setFiltroStatus] = useState('')
  const [showForm, setShowForm]         = useState(false)
  const [editando, setEditando]         = useState<ContaPagar | null>(null)

  const { data: contas = [], isLoading } = useQuery<ContaPagar[]>({
    queryKey: ['contas-pagar', filtroStatus],
    queryFn: () => api.get(`/contas-pagar${filtroStatus ? `?status=${filtroStatus}` : ''}`).then(r => r.data),
  })

  const pagar = useMutation({
    mutationFn: (id: string) => api.patch(`/contas-pagar/${id}/pagar`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas-pagar'] }),
  })

  const cancelar = useMutation({
    mutationFn: (id: string) => api.patch(`/contas-pagar/${id}/cancelar`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas-pagar'] }),
  })

  const excluir = useMutation({
    mutationFn: (id: string) => api.delete(`/contas-pagar/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas-pagar'] }),
  })

  // Totais para os cards (calculados sobre a lista completa sem filtro de status)
  const { data: todas = [] } = useQuery<ContaPagar[]>({
    queryKey: ['contas-pagar'],
    queryFn: () => api.get('/contas-pagar').then(r => r.data),
  })

  const hoje = dayjs()
  const em7dias = hoje.add(7, 'day')

  const totalVencer = todas
    .filter(c => c.status === 'PENDENTE' && dayjs(c.dataVencimento).isBefore(em7dias))
    .reduce((s, c) => s + Number(c.valor), 0)

  const totalVencido = todas
    .filter(c => c.status === 'VENCIDO')
    .reduce((s, c) => s + Number(c.valor), 0)

  const totalPagoMes = todas
    .filter(c => c.status === 'PAGO' && c.dataPagamento && dayjs(c.dataPagamento).month() === hoje.month())
    .reduce((s, c) => s + Number(c.valor), 0)

  const totalPendente = todas
    .filter(c => c.status === 'PENDENTE' || c.status === 'VENCIDO')
    .reduce((s, c) => s + Number(c.valor), 0)

  const catLabel = (v: string) => CATEGORIAS.find(c => c.value === v)?.label ?? v
  const catCor   = (v: string) => CATEGORIAS.find(c => c.value === v)?.cor ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Contas a Pagar</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nova conta
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-400 font-medium">Vence em 7 dias</span>
          </div>
          <p className="text-lg font-bold text-yellow-700">{formatR(totalVencer)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-400 font-medium">Em atraso</span>
          </div>
          <p className="text-lg font-bold text-red-700">{formatR(totalVencido)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-400 font-medium">Pago no mês</span>
          </div>
          <p className="text-lg font-bold text-green-700">{formatR(totalPagoMes)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-medium">Total em aberto</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatR(totalPendente)}</p>
        </div>
      </div>

      {/* Filtro de status */}
      <div className="flex gap-2 mb-4">
        {[
          { value: '',          label: 'Todas' },
          { value: 'PENDENTE',  label: 'Pendentes' },
          { value: 'VENCIDO',   label: 'Vencidas' },
          { value: 'PAGO',      label: 'Pagas' },
          { value: 'CANCELADO', label: 'Canceladas' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFiltroStatus(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtroStatus === f.value
                ? 'bg-pink-600 text-white border-pink-600'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Descrição', 'Categoria', 'Vencimento', 'Valor', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>
            )}
            {!isLoading && !contas.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <p className="text-gray-400 text-sm">Nenhuma conta encontrada</p>
                </td>
              </tr>
            )}
            {contas.map(c => {
              const vencida = c.status === 'VENCIDO'
              const paga    = c.status === 'PAGO'
              return (
                <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${vencida ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <p className={`font-medium ${paga ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{c.descricao}</p>
                    {c.observacoes && <p className="text-xs text-gray-400 mt-0.5">{c.observacoes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${catCor(c.categoria)}`}>{catLabel(c.categoria)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className={`text-sm ${vencida ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                      {dayjs(c.dataVencimento).format('DD/MM/YYYY')}
                    </p>
                    {paga && c.dataPagamento && (
                      <p className="text-xs text-green-600">Pago em {dayjs(c.dataPagamento).format('DD/MM/YYYY')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatR(Number(c.valor))}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${STATUS_COR[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {(c.status === 'PENDENTE' || c.status === 'VENCIDO') && (
                        <>
                          <button
                            title="Marcar como pago"
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                            onClick={() => pagar.mutate(c.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            title="Editar"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                            onClick={() => setEditando(c)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            title="Cancelar"
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                            onClick={() => {
                              if (confirm('Cancelar esta conta?')) cancelar.mutate(c.id)
                            }}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {(c.status === 'PAGO' || c.status === 'CANCELADO') && (
                        <button
                          title="Excluir"
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                          onClick={() => {
                            if (confirm('Excluir esta conta?')) excluir.mutate(c.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal nova conta */}
      {showForm && (
        <Modal titulo="Nova conta a pagar" onClose={() => setShowForm(false)}>
          <ContaForm
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {/* Modal edição */}
      {editando && (
        <Modal titulo="Editar conta" onClose={() => setEditando(null)}>
          <ContaForm
            inicial={editando}
            onSuccess={() => setEditando(null)}
            onCancel={() => setEditando(null)}
          />
        </Modal>
      )}
    </div>
  )
}
