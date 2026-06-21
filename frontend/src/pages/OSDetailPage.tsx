import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react'
import { api } from '../lib/api'
import dayjs from 'dayjs'
import PagamentoForm from '../components/PagamentoForm'

// ─── Constantes ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  RECEPCAO: 'Recepção', DIAGNOSTICO: 'Diagnóstico',
  AGUARDANDO_APROVACAO: 'Aguard. Aprovação', APROVADA: 'Aprovada',
  EM_MANUTENCAO: 'Manutenção', VALIDACAO: 'Validação',
  AGUARDANDO_RETIRADA: 'Aguard. Retirada', ENTREGUE: 'Entregue', CANCELADA: 'Cancelada',
}
const STATUS_COR: Record<string, string> = {
  RECEPCAO: 'bg-gray-100 text-gray-600', DIAGNOSTICO: 'bg-blue-100 text-blue-700',
  AGUARDANDO_APROVACAO: 'bg-yellow-100 text-yellow-700', APROVADA: 'bg-indigo-100 text-indigo-700',
  EM_MANUTENCAO: 'bg-orange-100 text-orange-700', VALIDACAO: 'bg-purple-100 text-purple-700',
  AGUARDANDO_RETIRADA: 'bg-teal-100 text-teal-700', ENTREGUE: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-red-100 text-red-600',
}
const STATUS_FLOW: Record<string, { label: string; next: string }[]> = {
  RECEPCAO:             [{ label: 'Enviar para diagnóstico', next: 'DIAGNOSTICO' }],
  DIAGNOSTICO:          [{ label: 'Gerar orçamento', next: 'AGUARDANDO_APROVACAO' }],
  AGUARDANDO_APROVACAO: [{ label: '✓ Cliente aprovou', next: 'APROVADA' }, { label: '✗ Cliente recusou', next: 'CANCELADA' }],
  APROVADA:             [{ label: 'Iniciar manutenção', next: 'EM_MANUTENCAO' }],
  EM_MANUTENCAO:        [{ label: 'Enviar para validação', next: 'VALIDACAO' }],
  VALIDACAO:            [{ label: '✓ Validado — avisar cliente', next: 'AGUARDANDO_RETIRADA' }, { label: '✗ Retornar manutenção', next: 'EM_MANUTENCAO' }],
  AGUARDANDO_RETIRADA:  [{ label: 'Marcar como entregue', next: 'ENTREGUE' }],
}
const CONCIL_COR: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-700',
  PARCIAL: 'bg-orange-100 text-orange-700',
  CONCILIADO: 'bg-green-100 text-green-700',
  NAO_IDENTIFICADO: 'bg-red-100 text-red-600',
}

export default function OSDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [tabAtiva, setTabAtiva] = useState<'info' | 'diagnostico' | 'orcamento' | 'pagamento' | 'historico'>('info')
  const [diagTexto, setDiagTexto] = useState('')
  const [diagTecnico, setDiagTecnico] = useState('')
  const [showPagForm, setShowPagForm] = useState(false)

  const { data: os, isLoading } = useQuery({
    queryKey: ['os', id],
    queryFn: () => api.get(`/os/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const avancarStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/os/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['os', id] }),
  })

  const salvarDiag = useMutation({
    mutationFn: () => api.put(`/os/${id}/diagnostico`, { descricao: diagTexto, tecnicoNome: diagTecnico || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['os', id] })
      setDiagTexto('')
    },
  })

  const aprovarOrc = useMutation({
    mutationFn: (aprovado: boolean) => api.patch(`/os/${id}/orcamento/aprovacao`, { aprovado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['os', id] }),
  })

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Carregando OS…</div>
  if (!os) return <div className="p-6 text-gray-400 text-sm">OS não encontrada.</div>

  const veiculo = os.veiculo
  const cliente = veiculo?.cliente
  const proximosStatus = STATUS_FLOW[os.status] ?? []
  const totalPago = os.pagamentos?.reduce((s: number, p: Record<string, unknown>) => s + Number(p.valor), 0) ?? 0
  const pendenteConcil = os.pagamentos?.filter((p: Record<string, unknown>) => p.statusConcil !== 'CONCILIADO' && p.metodo !== 'DINHEIRO').length ?? 0

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <button className="btn-ghost mb-4 -ml-2" onClick={() => navigate('/os')}>
        <ArrowLeft className="w-4 h-4" /> Voltar às OS
      </button>

      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">OS #{os.numero}</h1>
            <span className={`badge text-sm py-1 px-3 ${STATUS_COR[os.status]}`}>
              {STATUS_LABEL[os.status]}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Entrada: {dayjs(os.dataEntrada).format('DD/MM/YYYY HH:mm')}
            {os.dataPrevista && ` · Prazo: ${dayjs(os.dataPrevista).format('DD/MM/YYYY')}`}
          </p>
        </div>

        {/* Ações de avanço de status */}
        <div className="flex gap-2 flex-wrap">
          {proximosStatus.map(({ label, next }) => (
            <button
              key={next}
              className={next === 'CANCELADA' || label.includes('✗') ? 'btn-secondary text-red-600 border-red-200 hover:bg-red-50' : 'btn-primary'}
              onClick={() => avancarStatus.mutate(next)}
              disabled={avancarStatus.isPending}
            >
              <ChevronRight className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards cliente + veículo */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Cliente</p>
          <p className="font-semibold text-gray-900">{cliente?.nome}</p>
          <p className="text-sm text-gray-500">{cliente?.telefone}</p>
          {cliente?.email && <p className="text-sm text-gray-400">{cliente.email}</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Veículo</p>
          <p className="font-semibold text-gray-900">{veiculo?.marca} {veiculo?.modelo} {veiculo?.ano}</p>
          <p className="text-sm font-mono text-gray-500">{veiculo?.placa}</p>
          {veiculo?.cor && <p className="text-sm text-gray-400">{veiculo.cor}</p>}
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-gray-900">
            {Number(os.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-gray-400">Valor total</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-green-700">
            {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-gray-400">Pago</p>
        </div>
        <div className={`card p-3 text-center ${pendenteConcil > 0 ? 'border-yellow-200 bg-yellow-50' : ''}`}>
          <p className={`text-lg font-bold ${pendenteConcil > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>
            {pendenteConcil}
          </p>
          <p className="text-xs text-gray-400">Pendente conciliação</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {(['info','diagnostico','orcamento','pagamento','historico'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setTabAtiva(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tabAtiva === tab
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {{ info: 'Informações', diagnostico: 'Diagnóstico', orcamento: 'Orçamento', pagamento: 'Pagamento', historico: 'Histórico' }[tab]}
          </button>
        ))}
      </div>

      {/* Tab: Informações */}
      {tabAtiva === 'info' && (
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Queixa do cliente</p>
            <p className="text-gray-800 whitespace-pre-wrap">{os.queixa}</p>
          </div>
          {os.observacoes && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Observações internas</p>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{os.observacoes}</p>
            </div>
          )}
          {os.checklist?.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Checklist de entrada</p>
              <div className="grid grid-cols-2 gap-1.5">
                {os.checklist.map((item: Record<string, unknown>) => (
                  <div key={item.id as string} className="flex items-center gap-2 text-sm">
                    {item.valor
                      ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />}
                    <span className={item.valor ? 'text-gray-600' : 'text-orange-700 font-medium'}>{item.campo as string}</span>
                    {!!item.obs && <span className="text-xs text-gray-400">— {item.obs as string}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Diagnóstico */}
      {tabAtiva === 'diagnostico' && (
        <div className="space-y-4">
          {os.diagnostico ? (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase">Diagnóstico registrado</p>
                {os.diagnostico.tecnicoNome && (
                  <span className="text-xs text-gray-400">por {os.diagnostico.tecnicoNome}</span>
                )}
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{os.diagnostico.descricao}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhum diagnóstico registrado ainda.</p>
          )}

          {['DIAGNOSTICO', 'EM_MANUTENCAO', 'VALIDACAO'].includes(os.status) && (
            <div className="card p-4">
              <p className="font-semibold text-gray-800 mb-3 text-sm">
                {os.diagnostico ? 'Atualizar diagnóstico' : 'Registrar diagnóstico'}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="label">Técnico responsável</label>
                  <input className="input" placeholder="Nome do técnico" value={diagTecnico} onChange={e => setDiagTecnico(e.target.value)} />
                </div>
                <div>
                  <label className="label">Laudo técnico</label>
                  <textarea
                    className="input min-h-28 resize-none"
                    placeholder="Descreva o diagnóstico técnico…"
                    value={diagTexto || os.diagnostico?.descricao || ''}
                    onChange={e => setDiagTexto(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={() => salvarDiag.mutate()}
                  disabled={!diagTexto && !os.diagnostico?.descricao || salvarDiag.isPending}
                >
                  {salvarDiag.isPending ? 'Salvando…' : 'Salvar diagnóstico'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Orçamento */}
      {tabAtiva === 'orcamento' && (
        <div>
          {!os.orcamento ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">Nenhum orçamento gerado ainda.</p>
              <p className="text-xs mt-1">O orçamento é criado via API com os itens de peças e mão de obra.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-800">Itens do orçamento</span>
                  <span className={`badge ${
                    os.orcamento.status === 'APROVADO' ? 'bg-green-100 text-green-700' :
                    os.orcamento.status === 'REPROVADO' ? 'bg-red-100 text-red-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{os.orcamento.status}</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Tipo','Descrição','Qtd','Unit.','Total'].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {os.orcamento.itens.map((item: Record<string, unknown>) => (
                      <tr key={item.id as string}>
                        <td className="px-4 py-2">
                          <span className={`badge text-xs ${item.tipo === 'PECA' ? 'bg-blue-100 text-blue-700' : item.tipo === 'MAO_OBRA' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {item.tipo === 'PECA' ? 'Peça' : item.tipo === 'MAO_OBRA' ? 'MO' : 'Outros'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-800">{item.descricao as string}</td>
                        <td className="px-4 py-2 text-gray-600">{Number(item.quantidade)}</td>
                        <td className="px-4 py-2 text-gray-600">{Number(item.valorUnit).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                        <td className="px-4 py-2 font-semibold">{Number(item.valorTotal).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Total</td>
                      <td className="px-4 py-2 font-bold text-gray-900">{Number(os.orcamento.valorTotal).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {os.orcamento.status === 'PENDENTE' || os.orcamento.status === 'ENVIADO' ? (
                <div className="card p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Resposta do cliente</p>
                  <div className="flex gap-3">
                    <button
                      className="btn-primary flex-1 justify-center"
                      onClick={() => aprovarOrc.mutate(true)}
                      disabled={aprovarOrc.isPending}
                    >
                      <CheckCircle className="w-4 h-4" /> Cliente aprovou
                    </button>
                    <button
                      className="btn-secondary flex-1 justify-center text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => aprovarOrc.mutate(false)}
                      disabled={aprovarOrc.isPending}
                    >
                      <XCircle className="w-4 h-4" /> Cliente recusou
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Tab: Pagamento */}
      {tabAtiva === 'pagamento' && (
        <div className="space-y-4">
          {/* Pagamentos existentes */}
          {os.pagamentos?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-sm text-gray-800">Pagamentos registrados</span>
              </div>
              <div className="divide-y divide-gray-50">
                {os.pagamentos.map((p: Record<string, unknown>) => (
                  <div key={p.id as string} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {p.metodo as string}
                        {p.adquirente ? ` · ${p.adquirente}` : ''}
                        {Number(p.qtdParcelas) > 1 ? ` · ${p.qtdParcelas}x` : ''}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        {p.nsu
                          ? <><span className="font-mono">NSU {p.nsu as string}</span></>
                          : <span className="text-orange-500">sem NSU</span>
                        }
                        {p.metodo !== 'DINHEIRO' && (
                          <>· <span className={`badge text-xs ${CONCIL_COR[p.statusConcil as string] ?? ''}`}>{p.statusConcil as string}</span></>
                        )}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {Number(p.valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </span>
                    {!p.nsu && p.metodo !== 'DINHEIRO' && p.metodo !== 'PIX' && p.metodo !== 'TRANSFERENCIA' && (
                      <NsuInline pagamentoId={p.id as string} osId={id!} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adicionar novo pagamento */}
          {!showPagForm && os.status !== 'CANCELADA' && (
            <button className="btn-secondary w-full justify-center" onClick={() => setShowPagForm(true)}>
              + Registrar pagamento
            </button>
          )}

          {showPagForm && (
            <div className="card p-5">
              <p className="font-semibold text-gray-800 mb-4">Novo pagamento</p>
              <PagamentoForm osId={id!} onSuccess={() => setShowPagForm(false)} />
              <button className="btn-ghost mt-2 text-sm" onClick={() => setShowPagForm(false)}>Cancelar</button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Histórico */}
      {tabAtiva === 'historico' && (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-50">
            {!os.historico?.length && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum histórico</p>
            )}
            {os.historico?.map((h: Record<string, unknown>) => (
              <div key={h.id as string} className="px-4 py-3 flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    {!!h.statusAntes && <span className="text-gray-400">{STATUS_LABEL[h.statusAntes as string]}</span>}
                    {!!h.statusAntes && <ChevronRight className="w-3.5 h-3.5 inline mx-1 text-gray-300" />}
                    <span className={`font-semibold ${STATUS_COR[h.statusDepois as string]?.replace('bg-','text-').split(' ')[0] ?? ''}`}>
                      {STATUS_LABEL[h.statusDepois as string]}
                    </span>
                  </p>
                  {!!h.obs && <p className="text-xs text-gray-400 mt-0.5">{h.obs as string}</p>}
                  {!!h.usuarioNome && <p className="text-xs text-gray-400">por {h.usuarioNome as string}</p>}
                </div>
                <span className="text-xs text-gray-300">{dayjs(h.createdAt as string).format('DD/MM HH:mm')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Inline NSU updater
function NsuInline({ pagamentoId, osId }: { pagamentoId: string; osId: string }) {
  const qc = useQueryClient()
  const [editando, setEditando] = useState(false)
  const [nsu, setNsu] = useState('')

  const salvar = useMutation({
    mutationFn: () => api.patch(`/pagamentos/${pagamentoId}/nsu`, { nsu }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['os', osId] }); setEditando(false) },
  })

  if (!editando) return (
    <button className="text-xs text-orange-600 hover:text-orange-800 font-medium" onClick={() => setEditando(true)}>
      + NSU
    </button>
  )

  return (
    <div className="flex items-center gap-1">
      <input
        className="border border-gray-300 rounded px-2 py-1 text-xs font-mono w-24 focus:outline-none focus:ring-1 focus:ring-pink-400"
        placeholder="123456789"
        value={nsu}
        onChange={e => setNsu(e.target.value.replace(/\D/g, ''))}
        autoFocus
        maxLength={12}
      />
      <button
        className="text-xs bg-pink-600 text-white rounded px-2 py-1"
        onClick={() => salvar.mutate()}
        disabled={!nsu || salvar.isPending}
      >
        Ok
      </button>
      <button className="text-xs text-gray-400" onClick={() => setEditando(false)}>✕</button>
    </div>
  )
}
