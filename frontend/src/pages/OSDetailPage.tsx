import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, ChevronLeft, CheckCircle, XCircle, Clock, Edit2, FileDown, Mail, MessageCircle, Loader2, Star, Copy, Check, Crown, Camera, ZoomIn, X, Award, Globe, Sparkles, RotateCcw, Package, Wrench, Upload, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import dayjs from 'dayjs'
import PagamentoForm from '../components/PagamentoForm'
import OrcamentoForm from '../components/OrcamentoForm'
import ManutencaoVeiculo from '../components/ManutencaoVeiculo'
import Modal from '../components/Modal'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const TIPO_MANUT_LABEL: Record<string, string> = {
  TROCA_OLEO: 'Troca de óleo', CORREIA_DENTADA: 'Correia dentada',
  FILTRO_AR: 'Filtro de ar', FILTRO_COMBUSTIVEL: 'Filtro de combustível',
  FLUIDO_FREIO: 'Fluido de freio', VELA_IGNICAO: 'Vela de ignição',
  REVISAO_GERAL: 'Revisão geral', OUTRO: 'Outro',
}
const TIPO_FOTO_COR: Record<string, string> = {
  ANTES:  'bg-orange-100 text-orange-700',
  DEPOIS: 'bg-green-100 text-green-700',
  GERAL:  'bg-gray-100 text-gray-500',
}
const TIPO_FOTO_LABEL: Record<string, string> = { ANTES: 'Antes', DEPOIS: 'Depois', GERAL: 'Foto' }

interface FotoManut { id: string; tipo: string; filename: string }
interface ManutComFoto { id: string; tipo: string; fotos: FotoManut[]; osNumero: number | null }

function FotosServicoOS({ veiculoId, osNumero }: { veiculoId: string; osNumero: number }) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  const { data: manutencoes = [] } = useQuery<ManutComFoto[]>({
    queryKey: ['manutencoes', veiculoId],
    queryFn:  () => api.get(`/manutencao/veiculo/${veiculoId}`).then(r => r.data),
  })

  const deste = manutencoes.filter(m => m.osNumero === osNumero && m.fotos.length > 0)
  if (!deste.length) return null

  return (
    <>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-1.5 hover:bg-black/70" onClick={() => setLightbox(null)}>
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="Foto ampliada" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-pink-500" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fotos do serviço</p>
        </div>

        <div className="space-y-4">
          {deste.map(m => (
            <div key={m.id}>
              <p className="text-xs font-semibold text-gray-600 mb-2">{TIPO_MANUT_LABEL[m.tipo] ?? m.tipo}</p>
              <div className="flex gap-2 flex-wrap">
                {m.fotos.map(f => {
                  const url = `${BASE_URL}/manutencao/foto/${f.id}`
                  return (
                    <div key={f.id} className="relative group">
                      <img
                        src={url}
                        alt={TIPO_FOTO_LABEL[f.tipo]}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-100 cursor-pointer hover:border-pink-300 transition-colors"
                        onClick={() => setLightbox(url)}
                      />
                      <span className={`absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded font-medium ${TIPO_FOTO_COR[f.tipo] ?? 'bg-gray-100 text-gray-500'}`}>
                        {TIPO_FOTO_LABEL[f.tipo] ?? f.tipo}
                      </span>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button className="bg-white/90 rounded-full p-1.5 shadow" onClick={() => setLightbox(url)}>
                          <ZoomIn className="w-3.5 h-3.5 text-gray-700" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

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
const STATUS_FLOW: Record<string, { label: string; next: string; dir?: 'back' | 'cancel' }[]> = {
  RECEPCAO:             [{ label: 'Enviar para diagnóstico', next: 'DIAGNOSTICO' }],
  DIAGNOSTICO:          [{ label: 'Gerar orçamento', next: 'AGUARDANDO_APROVACAO' }, { label: 'Voltar à recepção', next: 'RECEPCAO', dir: 'back' }],
  AGUARDANDO_APROVACAO: [{ label: '✓ Cliente aprovou', next: 'APROVADA' }, { label: '✗ Cliente recusou', next: 'CANCELADA', dir: 'cancel' }, { label: 'Rever diagnóstico', next: 'DIAGNOSTICO', dir: 'back' }],
  APROVADA:             [{ label: 'Iniciar manutenção', next: 'EM_MANUTENCAO' }, { label: 'Revisar aprovação', next: 'AGUARDANDO_APROVACAO', dir: 'back' }],
  EM_MANUTENCAO:        [{ label: 'Enviar para validação', next: 'VALIDACAO' }, { label: 'Voltar ao aprovado', next: 'APROVADA', dir: 'back' }],
  VALIDACAO:            [{ label: '✓ Validado — avisar cliente', next: 'AGUARDANDO_RETIRADA' }, { label: '✗ Retornar manutenção', next: 'EM_MANUTENCAO', dir: 'cancel' }],
  AGUARDANDO_RETIRADA:  [{ label: 'Marcar como entregue', next: 'ENTREGUE' }, { label: 'Voltar à validação', next: 'VALIDACAO', dir: 'back' }],
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
  const [editandoOrcamento, setEditandoOrcamento] = useState(false)
  const [pdfCarregando, setPdfCarregando] = useState(false)
  const [enviando, setEnviando] = useState<'email' | 'whatsapp' | null>(null)
  const [feedbackEnvio, setFeedbackEnvio] = useState<Record<string, string> | null>(null)
  const [linkAvaliacao, setLinkAvaliacao] = useState<string | null>(null)
  const [gerandoLink, setGerandoLink] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [comprovanteCarregando, setComprovanteCarregando] = useState(false)
  const [portalLink,  setPortalLink]  = useState<string | null>(null)
  const [gerandoPortal, setGerandoPortal] = useState(false)
  const [copiadoPortal, setCopiadoPortal] = useState(false)
  const [confirmBack, setConfirmBack] = useState<{ label: string; next: string } | null>(null)

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

  const gerarSugestoes = useMutation({
    mutationFn: () => api.post(`/os/${id}/sugestoes-ia`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['os', id] }),
  })

  const toggleSugestao = useMutation({
    mutationFn: (sugestaoId: string) => api.patch(`/os/sugestoes-ia/${sugestaoId}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['os', id] }),
  })

  const aprovarOrc = useMutation({
    mutationFn: (aprovado: boolean) => api.patch(`/os/${id}/orcamento/aprovacao`, { aprovado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['os', id] }),
  })

  async function baixarPDF() {
    setPdfCarregando(true)
    try {
      const resp = await api.get(`/os/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Orcamento-OS-${String(os?.numero).padStart(4, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfCarregando(false)
    }
  }

  async function enviarPDF(canal: 'email' | 'whatsapp') {
    setEnviando(canal)
    setFeedbackEnvio(null)
    try {
      const r = await api.post(`/os/${id}/pdf/enviar`, { canais: [canal] })
      setFeedbackEnvio(r.data.resultados)
    } catch {
      setFeedbackEnvio({ [canal]: 'Erro ao enviar' })
    } finally {
      setEnviando(null)
    }
  }

  async function gerarLinkPortal() {
    setGerandoPortal(true)
    try {
      const r = await api.post(`/os/${id}/portal/gerar`)
      setPortalLink(`${window.location.origin}/portal/${r.data.token}`)
    } finally { setGerandoPortal(false) }
  }

  async function copiarPortal() {
    if (!portalLink) return
    await navigator.clipboard.writeText(portalLink)
    setCopiadoPortal(true)
    setTimeout(() => setCopiadoPortal(false), 2000)
  }

  async function baixarComprovante() {
    setComprovanteCarregando(true)
    try {
      const resp = await api.get(`/os/${id}/comprovante`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Comprovante-OS-${String(os?.numero).padStart(4, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setComprovanteCarregando(false)
    }
  }

  async function gerarLinkAvaliacao() {
    setGerandoLink(true)
    try {
      const r = await api.post(`/avaliacoes/os/${id}/gerar`)
      const token = r.data.token
      setLinkAvaliacao(`${window.location.origin}/avaliar/${token}`)
    } finally { setGerandoLink(false) }
  }

  async function copiarLink() {
    if (!linkAvaliacao) return
    await navigator.clipboard.writeText(linkAvaliacao)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Carregando OS…</div>
  if (!os) return <div className="p-6 text-gray-400 text-sm">OS não encontrada.</div>

  const veiculo = os.veiculo
  const cliente = veiculo?.cliente
  const proximosStatus = STATUS_FLOW[os.status] ?? []
  const totalPago = os.pagamentos?.reduce((s: number, p: Record<string, unknown>) => s + Number(p.valor), 0) ?? 0
  const pendenteConcil = os.pagamentos?.filter((p: Record<string, unknown>) => p.statusConcil !== 'CONCILIADO' && p.metodo !== 'DINHEIRO').length ?? 0

  return (
    <div className="p-6 max-w-4xl">
      {confirmBack && (
        <Modal titulo="Voltar à fase anterior" onClose={() => setConfirmBack(null)} largura="sm">
          <p className="text-sm text-gray-700 mb-5">
            Tem certeza que deseja <strong>voltar para a fase anterior</strong>?<br />
            <span className="text-gray-400 text-xs mt-1 block">A OS retornará para: {STATUS_LABEL[confirmBack.next]}</span>
          </p>
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={() => setConfirmBack(null)}>
              Cancelar
            </button>
            <button
              className="btn-primary bg-gray-700 hover:bg-gray-800 border-gray-700"
              disabled={avancarStatus.isPending}
              onClick={() => { avancarStatus.mutate(confirmBack.next); setConfirmBack(null) }}
            >
              {avancarStatus.isPending ? 'Aguarde…' : 'Sim, voltar'}
            </button>
          </div>
        </Modal>
      )}

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

        {/* Ações de status */}
        <div className="flex gap-2 flex-wrap items-center">
          {proximosStatus.filter(a => a.dir === 'back').map(({ label, next }) => (
            <button
              key={next}
              className="btn-ghost text-gray-500 hover:text-gray-700 text-sm"
              onClick={() => setConfirmBack({ label, next })}
              disabled={avancarStatus.isPending}
            >
              <ChevronLeft className="w-4 h-4" />
              {label}
            </button>
          ))}
          {proximosStatus.filter(a => a.dir === 'cancel').map(({ label, next }) => (
            <button
              key={next}
              className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => avancarStatus.mutate(next)}
              disabled={avancarStatus.isPending}
            >
              {label}
            </button>
          ))}
          {proximosStatus.filter(a => !a.dir).map(({ label, next }) => (
            <button
              key={next}
              className="btn-primary"
              onClick={() => avancarStatus.mutate(next)}
              disabled={avancarStatus.isPending}
            >
              {label}
              <ChevronRight className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Cards cliente + veículo */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Cliente</p>
          <p className="font-semibold text-gray-900 flex items-center gap-1.5">
            {cliente?.nome}
            {cliente?.genero === 'F' && <Crown className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />}
          </p>
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

      {/* Portal do cliente */}
      <div className="card p-4 mb-5 border-blue-200 bg-blue-50/40">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Portal do Cliente</p>
              <p className="text-xs text-gray-400">Link único para acompanhamento e aprovação online</p>
            </div>
          </div>
          {!portalLink ? (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              disabled={gerandoPortal}
              onClick={gerarLinkPortal}
            >
              {gerandoPortal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              Gerar link
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-lg max-w-[220px] truncate">{portalLink}</span>
              <button
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                onClick={copiarPortal}
              >
                {copiadoPortal ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoPortal ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comprovante de entrega — VALIDACAO em diante */}
      {['VALIDACAO', 'AGUARDANDO_RETIRADA', 'ENTREGUE'].includes(os.status) && (
        <div className="card p-4 mb-5 border-pink-200 bg-pink-50/40">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-pink-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Comprovante de Entrega</p>
                <p className="text-xs text-gray-400">PDF com serviços realizados e fotos do antes/depois</p>
              </div>
            </div>
            <button
              className="btn-primary text-sm"
              disabled={comprovanteCarregando}
              onClick={baixarComprovante}
            >
              {comprovanteCarregando
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <FileDown className="w-3.5 h-3.5" />}
              Baixar Comprovante
            </button>
          </div>
        </div>
      )}

      {/* Avaliação pós-serviço — só aparece quando ENTREGUE */}
      {os.status === 'ENTREGUE' && (
        <div className="card p-4 mb-5 border-yellow-200 bg-yellow-50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <p className="text-sm font-semibold text-gray-800">Avaliação pós-serviço</p>
              {os.avaliacao?.respondidoEm && (
                <span className="badge bg-green-100 text-green-700 text-xs">
                  Nota {os.avaliacao.nota}/10 recebida
                </span>
              )}
            </div>
            {!linkAvaliacao && !os.avaliacao?.respondidoEm && (
              <button
                className="btn-secondary text-sm"
                disabled={gerandoLink}
                onClick={gerarLinkAvaliacao}
              >
                {gerandoLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                Gerar link de avaliação
              </button>
            )}
          </div>
          {linkAvaliacao && (
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={linkAvaliacao}
                className="input text-xs font-mono flex-1 bg-white"
              />
              <button
                className="btn-secondary text-sm flex-shrink-0"
                onClick={copiarLink}
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          )}
        </div>
      )}

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
          {/* Checklist de recepção — só aparece quando ainda não existe e está em RECEPCAO */}
          {os.status === 'RECEPCAO' && !os.checklist?.length && (
            <ChecklistRecepcao osId={id!} />
          )}

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
          {/* Histórico de manutenção do veículo */}
          <div className="card p-4">
            <ManutencaoVeiculo
              veiculoId={os.veiculo?.id}
              kmAtual={os.veiculo?.km}
              osNumero={os.numero}
            />
          </div>

          {/* Fotos registradas nesta OS */}
          {os.veiculo?.id && (
            <FotosServicoOS veiculoId={os.veiculo.id} osNumero={os.numero} />
          )}

          {os.checklist?.length > 0 && (
            <ChecklistInterativo checklist={os.checklist} osId={id!} />
          )}
        </div>
      )}

      {/* Tab: Diagnóstico */}
      {tabAtiva === 'diagnostico' && (
        <div className="space-y-4">

          {/* Sugestões IA */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Checklist de verificação — IA</p>
                {os.sugestoesIA?.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {os.sugestoesIA.filter((s: { feito: boolean }) => s.feito).length}/{os.sugestoesIA.length} feitos
                  </span>
                )}
              </div>
              <button
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
                onClick={() => gerarSugestoes.mutate()}
                disabled={gerarSugestoes.isPending}
              >
                {gerarSugestoes.isPending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando…</>
                  : os.sugestoesIA?.length > 0
                    ? <><RotateCcw className="w-3.5 h-3.5" /> Regenerar</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Gerar sugestões</>
                }
              </button>
            </div>

            {gerarSugestoes.isPending ? (
              <div className="py-6 flex flex-col items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <span>A IA está analisando a queixa do cliente…</span>
              </div>
            ) : os.sugestoesIA?.length > 0 ? (
              <div className="space-y-1.5">
                {(os.sugestoesIA as { id: string; descricao: string; prioridade: string; feito: boolean }[]).map(s => (
                  <label
                    key={s.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors select-none ${
                      s.feito ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={s.feito}
                      onChange={() => toggleSugestao.mutate(s.id)}
                      className="mt-0.5 w-4 h-4 accent-pink-600 flex-shrink-0"
                    />
                    <span className={`flex-1 text-sm leading-snug ${s.feito ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {s.descricao}
                    </span>
                    <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-semibold ${
                      s.prioridade === 'ALTA'  ? 'bg-red-100 text-red-700'    :
                      s.prioridade === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' :
                                                 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.prioridade === 'ALTA' ? 'Alta' : s.prioridade === 'MEDIA' ? 'Média' : 'Baixa'}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-2">
                Clique em <strong>Gerar sugestões</strong> para a IA analisar a queixa e criar um checklist do que verificar.
              </p>
            )}
          </div>

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
                  <TecnicoAutocomplete value={diagTecnico} onChange={setDiagTecnico} />
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

          {/* Fotos do diagnóstico — visível nas fases de diagnóstico/manutenção */}
          {['DIAGNOSTICO', 'EM_MANUTENCAO', 'VALIDACAO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'AGUARDANDO_RETIRADA', 'ENTREGUE'].includes(os.status) && (
            <FotosDiagnostico
              osId={id!}
              fotos={os.diagnostico?.fotos ?? []}
            />
          )}
        </div>
      )}

      {/* Tab: Orçamento */}
      {tabAtiva === 'orcamento' && (
        <div className="space-y-4">
          {/* Sem orçamento + status DIAGNOSTICO → mostrar formulário diretamente */}
          {!os.orcamento && os.status === 'DIAGNOSTICO' && (
            <div className="card p-5">
              <p className="font-semibold text-gray-800 mb-4 text-sm">Criar orçamento</p>
              <OrcamentoForm osId={id!} />
            </div>
          )}

          {/* Sem orçamento + outro status */}
          {!os.orcamento && os.status !== 'DIAGNOSTICO' && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">Nenhum orçamento gerado ainda.</p>
              <p className="text-xs mt-1 text-gray-300">O orçamento é criado durante o diagnóstico.</p>
            </div>
          )}

          {/* Orçamento existente */}
          {os.orcamento && (
            <>
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-800">Itens do orçamento</span>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${
                      os.orcamento.status === 'APROVADO' ? 'bg-green-100 text-green-700' :
                      os.orcamento.status === 'REPROVADO' ? 'bg-red-100 text-red-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{os.orcamento.status}</span>
                    {(os.orcamento.status === 'PENDENTE' || os.orcamento.status === 'ENVIADO') && (
                      <button
                        className="btn-ghost text-xs py-1"
                        onClick={() => setEditandoOrcamento(v => !v)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        {editandoOrcamento ? 'Cancelar edição' : 'Editar'}
                      </button>
                    )}
                  </div>
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
                  <tfoot className="border-t border-gray-200 bg-gray-50 text-sm">
                    {Number(os.orcamento.valorPecas) > 0 && (
                      <tr className="text-gray-500">
                        <td colSpan={4} className="px-4 py-1.5 text-right">
                          <span className="flex items-center justify-end gap-1.5">
                            <Package className="w-3.5 h-3.5 text-blue-400" /> Peças
                          </span>
                        </td>
                        <td className="px-4 py-1.5">{Number(os.orcamento.valorPecas).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                      </tr>
                    )}
                    {Number(os.orcamento.valorMO) > 0 && (
                      <tr className="text-gray-500">
                        <td colSpan={4} className="px-4 py-1.5 text-right">
                          <span className="flex items-center justify-end gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-purple-400" /> Mão de obra
                          </span>
                        </td>
                        <td className="px-4 py-1.5">{Number(os.orcamento.valorMO).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                      </tr>
                    )}
                    {Number(os.orcamento.valorTotal) - Number(os.orcamento.valorPecas) - Number(os.orcamento.valorMO) > 0 && (
                      <tr className="text-gray-500">
                        <td colSpan={4} className="px-4 py-1.5 text-right">Outros</td>
                        <td className="px-4 py-1.5">{(Number(os.orcamento.valorTotal) - Number(os.orcamento.valorPecas) - Number(os.orcamento.valorMO)).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-200">
                      <td colSpan={4} className="px-4 py-2.5 text-right font-bold text-gray-800">Total geral</td>
                      <td className="px-4 py-2.5 font-bold text-pink-700 text-base">{Number(os.orcamento.valorTotal).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Ações PDF */}
              {!editandoOrcamento && (
                <div className="card p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Compartilhar orçamento</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="btn-secondary flex items-center gap-2 py-2"
                      onClick={baixarPDF}
                      disabled={pdfCarregando}
                    >
                      {pdfCarregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                      Baixar PDF
                    </button>
                    <button
                      className="btn-secondary flex items-center gap-2 py-2"
                      onClick={() => enviarPDF('email')}
                      disabled={enviando === 'email'}
                    >
                      {enviando === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      Enviar por e-mail
                    </button>
                    <button
                      className="btn-secondary flex items-center gap-2 py-2 text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => enviarPDF('whatsapp')}
                      disabled={enviando === 'whatsapp'}
                    >
                      {enviando === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                      Enviar por WhatsApp
                    </button>
                  </div>
                  {feedbackEnvio && (
                    <div className="space-y-1">
                      {Object.entries(feedbackEnvio).map(([canal, status]) => (
                        <p key={canal} className={`text-xs flex items-center gap-1.5 ${status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                          {status === 'ok' ? '✓' : '✗'}
                          <span className="capitalize">{canal}:</span>
                          {status === 'ok' ? 'Enviado com sucesso' : status}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Formulário de edição inline */}
              {editandoOrcamento && (
                <div className="card p-5">
                  <p className="font-semibold text-gray-800 mb-4 text-sm">Editar orçamento</p>
                  <OrcamentoForm
                    osId={id!}
                    orcamento={os.orcamento}
                    onSuccess={() => setEditandoOrcamento(false)}
                  />
                </div>
              )}

              {/* Resposta do cliente */}
              {(os.orcamento.status === 'PENDENTE' || os.orcamento.status === 'ENVIADO') && !editandoOrcamento && (
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
              )}
            </>
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

// ── Autocomplete de técnicos ─────────────────────────────────────────────────

function TecnicoAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState(value)

  useEffect(() => { setBusca(value) }, [value])

  const { data: resultados = [] } = useQuery<{ id: string; nome: string; cargo: string }[]>({
    queryKey: ['tecnicos', busca],
    queryFn:  () => api.get(`/tecnicos${busca.length > 1 ? `?q=${busca}` : ''}`).then(r => r.data),
    enabled: aberto,
  })

  const CARGO_LABEL: Record<string, string> = {
    MECANICO: 'Mecânico', ELETRICISTA: 'Eletricista', FUNILEIRO: 'Funileiro',
    PINTOR: 'Pintor', AUXILIAR: 'Auxiliar', GERENTE: 'Gerente',
  }

  function selecionar(nome: string) {
    onChange(nome)
    setBusca(nome)
    setAberto(false)
  }

  return (
    <div className="relative">
      <input
        className="input"
        placeholder="Buscar técnico ou digitar nome…"
        value={busca}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onChange={e => { setBusca(e.target.value); onChange(e.target.value); setAberto(true) }}
      />
      {aberto && resultados.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {resultados.map(t => (
            <button
              key={t.id}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-pink-50 flex items-center justify-between text-sm"
              onMouseDown={() => selecionar(t.nome)}
            >
              <span className="font-medium text-gray-900">{t.nome}</span>
              <span className="text-xs text-gray-400">{CARGO_LABEL[t.cargo] ?? t.cargo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Checklist interativo (edição na OS detail) ───────────────────────────────

interface ChecklistItemType { id: string; campo: string; valor: boolean; obs?: string | null }

function ChecklistInterativo({ checklist, osId }: { checklist: ChecklistItemType[]; osId: string }) {
  const qc = useQueryClient()
  type Est = Record<string, { valor: boolean; obs: string }>

  // deduplica por campo mantendo o primeiro de cada nome
  const unique = checklist.filter((item, idx, arr) => arr.findIndex(x => x.campo === item.campo) === idx)

  const [estado, setEstado] = useState<Est>(() =>
    Object.fromEntries(unique.map(i => [i.id, { valor: i.valor, obs: i.obs ?? '' }]))
  )
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    setEstado(Object.fromEntries(unique.map(i => [i.id, { valor: i.valor, obs: i.obs ?? '' }])))
  }, [checklist])  // eslint-disable-line react-hooks/exhaustive-deps

  async function salvar(est: Est) {
    setSalvando(true)
    try {
      await api.put(`/os/${osId}/checklist`, {
        itens: unique.map(i => ({
          campo: i.campo,
          valor: est[i.id]?.valor ?? i.valor,
          obs:   est[i.id]?.obs  || undefined,
        })),
      })
      qc.invalidateQueries({ queryKey: ['os', osId] })
    } finally {
      setSalvando(false)
    }
  }

  function toggle(id: string) {
    const novo = { ...estado, [id]: { ...estado[id], valor: !estado[id].valor } }
    setEstado(novo)
    salvar(novo)
  }

  function setObs(id: string, obs: string) {
    setEstado(prev => ({ ...prev, [id]: { ...prev[id], obs } }))
  }

  const total  = checklist.length
  const ok     = Object.values(estado).filter(e => e.valor).length

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Checklist de entrada</p>
        <span className="text-xs text-gray-400">
          {salvando ? 'Salvando…' : `${ok}/${total} OK`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {checklist.map(item => {
          const e   = estado[item.id]
          const val = e?.valor ?? item.valor
          return (
            <div
              key={item.id}
              className={`rounded-lg border px-3 py-2 transition-colors ${val ? 'border-gray-200 bg-gray-50' : 'border-orange-200 bg-orange-50'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 flex-1 leading-tight">{item.campo}</span>
                <button
                  type="button"
                  onClick={() => { if (!val) toggle(item.id) }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                    val ? 'bg-green-100 text-green-700 ring-1 ring-green-400' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" /> OK
                </button>
                <button
                  type="button"
                  onClick={() => { if (val) toggle(item.id) }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                    !val ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-400' : 'bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  <XCircle className="w-3 h-3" /> NOK
                </button>
              </div>
              {!val && (
                <input
                  className="mt-2 w-full text-xs bg-white border border-orange-200 rounded px-2 py-1 outline-none text-orange-700 placeholder-orange-300 focus:ring-1 focus:ring-orange-300"
                  placeholder="Descreva o problema encontrado…"
                  value={e?.obs ?? ''}
                  onChange={ev => setObs(item.id, ev.target.value)}
                  onBlur={() => salvar(estado)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Fotos do diagnóstico ──────────────────────────────────────────────────────

interface FotoDiag { id: string; filename: string; createdAt: string }

function FotosDiagnostico({ osId, fotos }: { osId: string; fotos: FotoDiag[] }) {
  const qc = useQueryClient()
  const [uploading, setUploading]   = useState(false)
  const [lightbox, setLightbox]     = useState<string | null>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const isMobile  = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        await api.post(`/os/${osId}/diagnostico/foto`, fd)
      }
      qc.invalidateQueries({ queryKey: ['os', osId] })
    } finally {
      setUploading(false)
      if (fileRef.current)   fileRef.current.value   = ''
      if (cameraRef.current) cameraRef.current.value = ''
    }
  }

  async function excluir(fotoId: string) {
    await api.delete(`/os/diagnostico/foto/${fotoId}`)
    qc.invalidateQueries({ queryKey: ['os', osId] })
  }

  return (
    <>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-1.5 hover:bg-black/70"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightbox}
            alt="Foto ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-pink-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fotos do diagnóstico</p>
            {fotos.length > 0 && (
              <span className="bg-gray-100 text-gray-500 text-xs font-medium px-1.5 py-0.5 rounded-full">
                {fotos.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* inputs ocultos */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />

            {uploading ? (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando…
              </span>
            ) : isMobile ? (
              <>
                <button
                  className="btn-ghost text-xs py-1 px-2"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="w-3.5 h-3.5" /> Câmera
                </button>
                <button
                  className="btn-ghost text-xs py-1 px-2"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" /> Galeria
                </button>
              </>
            ) : (
              <button
                className="btn-ghost text-xs py-1 px-2"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" /> Anexar fotos
              </button>
            )}
          </div>
        </div>

        {fotos.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">
            Nenhuma foto adicionada ao diagnóstico.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {fotos.map(f => {
              const url = `${BASE_URL}/os/diagnostico/foto/${f.id}`
              return (
                <div key={f.id} className="relative group">
                  <img
                    src={url}
                    alt="Foto diagnóstico"
                    className="w-24 h-24 object-cover rounded-lg border border-gray-100 cursor-pointer hover:border-pink-300 transition-colors"
                    onClick={() => setLightbox(url)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                    <button
                      className="bg-white/90 rounded-full p-1.5 shadow-sm hover:bg-white"
                      onClick={() => setLightbox(url)}
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-gray-700" />
                    </button>
                    <button
                      className="bg-white/90 rounded-full p-1.5 shadow-sm hover:bg-white"
                      onClick={() => excluir(f.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ── Checklist de recepção ─────────────────────────────────────────────────────
const CHECKLIST_PADRAO = [
  { grupo: 'Documentos',   itens: ['CRLV', 'CNH do condutor'] },
  { grupo: 'Acessórios',   itens: ['Estepe', 'Macaco / Chave de roda', 'Triângulo de segurança', 'Extintor'] },
  { grupo: 'Estado externo', itens: ['Lataria sem avarias', 'Vidros e retrovisores OK', 'Pneus em bom estado', 'Iluminação (faróis/lanternas)', 'Para-choques OK'] },
  { grupo: 'Interior',     itens: ['Tapetes presentes', 'Bancos sem danos', 'Painel sem avarias', 'Rádio / sistema de som'] },
]

function ChecklistRecepcao({ osId }: { osId: string }) {
  const qc = useQueryClient()
  type Estado = Record<string, { valor: boolean; obs: string }>
  const inicial: Estado = {}
  CHECKLIST_PADRAO.forEach(g => g.itens.forEach(campo => { inicial[campo] = { valor: true, obs: '' } }))
  const [estado,   setEstado]   = useState<Estado>(inicial)
  const [salvando, setSalvando] = useState(false)

  function toggle(campo: string) {
    setEstado(prev => ({ ...prev, [campo]: { ...prev[campo], valor: !prev[campo].valor } }))
  }
  function setObs(campo: string, obs: string) {
    setEstado(prev => ({ ...prev, [campo]: { ...prev[campo], obs } }))
  }

  async function salvar() {
    setSalvando(true)
    const itens = Object.entries(estado).map(([campo, { valor, obs }]) => ({
      campo, valor, obs: obs || undefined,
    }))
    await api.put(`/os/${osId}/checklist`, { itens })
    qc.invalidateQueries({ queryKey: ['os', osId] })
    setSalvando(false)
  }

  return (
    <div className="card p-5 border-blue-200 bg-blue-50/20">
      <p className="font-semibold text-gray-800 text-sm mb-4">Checklist de recepção do veículo</p>
      <div className="space-y-4">
        {CHECKLIST_PADRAO.map(grupo => (
          <div key={grupo.grupo}>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{grupo.grupo}</p>
            <div className="space-y-1.5">
              {grupo.itens.map(campo => (
                <div key={campo} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(campo)}
                    className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                      estado[campo]?.valor
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-red-50 border-red-300 text-red-500'
                    }`}
                  >
                    {estado[campo]?.valor ? '✓' : '✗'}
                  </button>
                  <span className={`text-sm flex-1 ${estado[campo]?.valor ? 'text-gray-700' : 'text-red-600 font-medium'}`}>
                    {campo}
                  </span>
                  {!estado[campo]?.valor && (
                    <input
                      className="input text-xs py-1 h-7 w-40"
                      placeholder="Obs. sobre avaria…"
                      value={estado[campo]?.obs}
                      onChange={e => setObs(campo, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        className="btn-primary mt-5 w-full justify-center"
        onClick={salvar}
        disabled={salvando}
      >
        {salvando ? 'Salvando…' : 'Salvar checklist'}
      </button>
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
