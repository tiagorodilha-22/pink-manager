import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  Wrench, CheckCircle, Clock, XCircle, AlertCircle,
  Gauge, CalendarClock, ChevronRight, Crown, Camera, ZoomIn, X, Star,
} from 'lucide-react'
import axios from 'axios'
import dayjs from 'dayjs'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const api = axios.create({ baseURL: BASE_URL })

const fmt = (d: string) => dayjs(d).format('DD/MM/YYYY')
const fmtDt = (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm')
const cur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const STATUS_CLIENTE: Record<string, { label: string; desc: string }> = {
  RECEPCAO:             { label: 'Chegou na oficina',          desc: 'Seu veículo foi recebido e está aguardando diagnóstico.' },
  DIAGNOSTICO:          { label: 'Em diagnóstico',             desc: 'Nossa equipe está avaliando o seu veículo.' },
  AGUARDANDO_APROVACAO: { label: 'Orçamento aguardando',       desc: 'O orçamento está pronto. Por favor, analise e aprove abaixo.' },
  APROVADA:             { label: 'Orçamento aprovado',         desc: 'Ótimo! Sua manutenção será iniciada em breve.' },
  EM_MANUTENCAO:        { label: 'Em manutenção',              desc: 'A equipe está trabalhando no seu veículo.' },
  VALIDACAO:            { label: 'Em validação final',         desc: 'O serviço está sendo verificado antes da entrega.' },
  AGUARDANDO_RETIRADA:  { label: 'Pronto para retirada!',      desc: 'Seu veículo está pronto. Pode vir buscar quando quiser.' },
  ENTREGUE:             { label: 'Entregue',                   desc: 'Serviço concluído. Obrigado pela preferência!' },
  CANCELADA:            { label: 'Cancelada',                  desc: 'Esta ordem de serviço foi cancelada.' },
}

const ETAPAS = [
  'RECEPCAO', 'DIAGNOSTICO', 'AGUARDANDO_APROVACAO',
  'EM_MANUTENCAO', 'AGUARDANDO_RETIRADA', 'ENTREGUE',
]

const TIPO_FOTO_LABEL: Record<string, string> = { ANTES: 'Antes', DEPOIS: 'Depois', GERAL: 'Foto' }
const TIPO_FOTO_COR:   Record<string, string> = {
  ANTES:  'bg-orange-100 text-orange-700',
  DEPOIS: 'bg-green-100 text-green-700',
  GERAL:  'bg-gray-100 text-gray-500',
}
const TIPO_MANUT_LABEL: Record<string, string> = {
  TROCA_OLEO: 'Troca de óleo', CORREIA_DENTADA: 'Correia dentada',
  FILTRO_AR: 'Filtro de ar', FILTRO_COMBUSTIVEL: 'Filtro de combustível',
  FLUIDO_FREIO: 'Fluido de freio', VELA_IGNICAO: 'Vela de ignição',
  REVISAO_GERAL: 'Revisão geral', OUTRO: 'Outro',
}

export default function PortalClientePage() {
  const { token } = useParams<{ token: string }>()
  const [lightbox,    setLightbox]    = useState<string | null>(null)
  const [motivo,      setMotivo]      = useState('')
  const [decisao,     setDecisao]     = useState<'aprovado' | 'recusado' | null>(null)
  const [notaSel,     setNotaSel]     = useState<number | null>(null)
  const [comentario,  setComentario]  = useState('')
  const [avEnviada,   setAvEnviada]   = useState(false)

  const { data: os, isLoading, isError, refetch } = useQuery({
    queryKey: ['portal', token],
    queryFn:  () => api.get(`/portal/${token}`).then(r => r.data),
    enabled:  !!token,
  })

  const aprovar = useMutation({
    mutationFn: (aprovado: boolean) => api.post(`/portal/${token}/aprovar`, {
      aprovado, obs: aprovado ? undefined : (motivo || undefined),
    }),
    onSuccess: (_, aprovado) => {
      setDecisao(aprovado ? 'aprovado' : 'recusado')
      refetch()
    },
  })

  const enviarAvaliacao = useMutation({
    mutationFn: () => api.post(`/avaliacoes/publica/${os?.avaliacaoToken}`, {
      nota: notaSel,
      comentario: comentario.trim() || undefined,
    }),
    onSuccess: () => setAvEnviada(true),
  })

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando…</p>
    </div>
  )

  if (isError || !os) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <XCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">Link inválido ou expirado</p>
        <p className="text-gray-400 text-sm mt-1">Verifique o link enviado pela oficina.</p>
      </div>
    </div>
  )

  const statusInfo    = STATUS_CLIENTE[os.status] ?? { label: os.status, desc: '' }
  const etapaIdx      = ETAPAS.indexOf(os.status)
  const fotos         = os.manutencoes?.flatMap((m: Record<string, unknown>) =>
    ((m.fotos as unknown[]) ?? []).map((f: unknown) => ({ ...(f as Record<string, string>), manutTipo: m.tipo as string }))
  ) ?? []

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 bg-black/50 rounded-full p-1.5 text-white" onClick={() => setLightbox(null)}>
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="Foto" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <div className="bg-pink-600 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-base">OS #{os.numero}</p>
              <p className="text-pink-200 text-sm">
                {os.veiculo.marca} {os.veiculo.modelo} · {os.veiculo.placa}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Status atual */}
        <div className={`rounded-2xl p-4 ${
          os.status === 'AGUARDANDO_RETIRADA' ? 'bg-green-50 border border-green-200' :
          os.status === 'AGUARDANDO_APROVACAO' ? 'bg-amber-50 border border-amber-200' :
          os.status === 'ENTREGUE' ? 'bg-blue-50 border border-blue-200' :
          'bg-white border border-gray-100'
        } shadow-sm`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              os.status === 'AGUARDANDO_RETIRADA' ? 'bg-green-100' :
              os.status === 'AGUARDANDO_APROVACAO' ? 'bg-amber-100' :
              os.status === 'ENTREGUE' ? 'bg-blue-100' : 'bg-pink-100'
            }`}>
              {os.status === 'AGUARDANDO_RETIRADA' || os.status === 'ENTREGUE'
                ? <CheckCircle className="w-5 h-5 text-green-600" />
                : os.status === 'AGUARDANDO_APROVACAO'
                ? <AlertCircle className="w-5 h-5 text-amber-600" />
                : <Clock className="w-5 h-5 text-pink-600" />}
            </div>
            <div>
              <p className="font-bold text-gray-900">{statusInfo.label}</p>
              <p className="text-sm text-gray-500 mt-0.5">{statusInfo.desc}</p>
              <p className="text-xs text-gray-400 mt-1">
                {os.veiculo.cliente.nome}
                {os.veiculo.cliente.genero === 'F' && <Crown className="w-3 h-3 text-pink-400 inline ml-1" />}
                {' '}· Entrada: {fmt(os.dataEntrada)}
                {os.dataEntrega && ` · Entrega: ${fmt(os.dataEntrega)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Linha do tempo */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Acompanhamento</p>
          <div className="space-y-2">
            {ETAPAS.map((e, i) => {
              const concluido = i < etapaIdx || (i === etapaIdx && (os.status === 'ENTREGUE'))
              const atual     = i === etapaIdx && os.status !== 'ENTREGUE'
              return (
                <div key={e} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                    concluido ? 'bg-green-500 text-white' :
                    atual     ? 'bg-pink-600 text-white ring-4 ring-pink-100' :
                    'bg-gray-100 text-gray-300'
                  }`}>
                    {concluido ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm ${atual ? 'font-semibold text-gray-900' : concluido ? 'text-gray-500' : 'text-gray-300'}`}>
                    {STATUS_CLIENTE[e]?.label ?? e}
                  </span>
                  {atual && <ChevronRight className="w-3.5 h-3.5 text-pink-500 ml-auto" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Orçamento + aprovação */}
        {os.orcamento && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Orçamento dos serviços</p>
            </div>
            <div className="divide-y divide-gray-50">
              {os.orcamento.itens.map((item: Record<string, unknown>) => (
                <div key={item.id as string} className="px-4 py-2.5 flex items-center gap-3">
                  <div className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    item.tipo === 'PECA' ? 'bg-blue-100 text-blue-700' :
                    item.tipo === 'MAO_OBRA' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.tipo === 'PECA' ? 'Peça' : item.tipo === 'MAO_OBRA' ? 'M.O.' : 'Outros'}
                  </div>
                  <span className="text-sm text-gray-800 flex-1">{item.descricao as string}</span>
                  <span className="text-sm font-semibold text-gray-900">{cur(Number(item.valorTotal))}</span>
                </div>
              ))}
            </div>
            <div className="bg-pink-600 px-4 py-3 flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Total</span>
              <span className="text-white font-bold text-base">{cur(Number(os.orcamento.valorTotal))}</span>
            </div>

            {/* Botões de aprovação */}
            {os.status === 'AGUARDANDO_APROVACAO' && !decisao && (
              <div className="px-4 pb-4 pt-3 space-y-3">
                <p className="text-sm text-gray-600 text-center">Você aprova este orçamento?</p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
                    disabled={aprovar.isPending}
                    onClick={() => aprovar.mutate(true)}
                  >
                    ✓ Aprovar
                  </button>
                  <button
                    className="flex-1 bg-white text-red-600 border border-red-200 rounded-xl py-3 text-sm font-semibold hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
                    disabled={aprovar.isPending}
                    onClick={() => {
                      const m = window.prompt('Motivo da recusa (opcional):') ?? ''
                      setMotivo(m)
                      aprovar.mutate(false)
                    }}
                  >
                    ✗ Recusar
                  </button>
                </div>
              </div>
            )}

            {decisao && (
              <div className={`mx-4 mb-4 rounded-xl p-3 text-sm text-center font-medium ${
                decisao === 'aprovado' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {decisao === 'aprovado' ? '✓ Orçamento aprovado com sucesso!' : '✗ Orçamento recusado. Entraremos em contato.'}
              </div>
            )}
          </div>
        )}

        {/* Fotos do serviço */}
        {fotos.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-pink-500" /> Fotos do serviço
            </p>
            {Object.entries(
              fotos.reduce((acc: Record<string, typeof fotos>, f: typeof fotos[0]) => {
                const k = f.manutTipo as string
                acc[k] = acc[k] ?? []
                acc[k].push(f)
                return acc
              }, {})
            ).map(([tipo, fts]) => (
              <div key={tipo} className="mb-3 last:mb-0">
                <p className="text-xs font-medium text-gray-600 mb-2">{TIPO_MANUT_LABEL[tipo] ?? tipo}</p>
                <div className="flex gap-2 flex-wrap">
                  {(fts as typeof fotos).map((f: typeof fotos[0]) => {
                    const url = `${BASE_URL}/manutencao/foto/${f.id}`
                    return (
                      <div key={f.id} className="relative">
                        <img
                          src={url}
                          alt={TIPO_FOTO_LABEL[f.tipo]}
                          className="w-20 h-20 object-cover rounded-xl cursor-pointer"
                          onClick={() => setLightbox(url)}
                        />
                        <span className={`absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded-lg font-medium ${TIPO_FOTO_COR[f.tipo] ?? 'bg-gray-100 text-gray-500'}`}>
                          {TIPO_FOTO_LABEL[f.tipo]}
                        </span>
                        <button className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 rounded-xl transition-colors" onClick={() => setLightbox(url)}>
                          <ZoomIn className="w-4 h-4 text-white opacity-0 hover:opacity-100" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manutenções sem fotos */}
        {os.manutencoes?.filter((m: Record<string, unknown>) => !(m.fotos as unknown[])?.length).map((m: Record<string, unknown>) => (
          <div key={m.id as string} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{TIPO_MANUT_LABEL[m.tipo as string] ?? m.tipo as string}</p>
                {!!m.descricao && <p className="text-xs text-gray-500">{m.descricao as string}</p>}
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    {fmt(m.dataRealizado as string)}
                  </span>
                  {!!m.kmRealizado && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      {(m.kmRealizado as number).toLocaleString('pt-BR')} km
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Avaliação do serviço */}
        {os.status === 'ENTREGUE' && os.avaliacaoToken && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-pink-500" /> Avalie o serviço
            </p>

            {os.avaliacaoRespondido || avEnviada ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-1">🎉</p>
                <p className="text-sm font-semibold text-gray-800">Obrigado pela avaliação!</p>
                <p className="text-xs text-gray-400 mt-1">Sua opinião é muito importante para nós.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 text-center mb-4">
                  De 0 a 10, quanto você recomendaria nossos serviços?
                </p>
                <div className="grid grid-cols-11 gap-1 mb-1">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setNotaSel(i)}
                      className={`h-9 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                        notaSel === i
                          ? i >= 9 ? 'bg-green-600 text-white shadow-md scale-110'
                          : i >= 7 ? 'bg-amber-500 text-white shadow-md scale-110'
                          :          'bg-red-500 text-white shadow-md scale-110'
                          : i >= 9 ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : i >= 7 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          :          'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-xs text-gray-400">Ruim</span>
                  <span className="text-xs text-gray-400">Excelente</span>
                </div>

                {notaSel !== null && (
                  <>
                    <textarea
                      value={comentario}
                      onChange={e => setComentario(e.target.value)}
                      placeholder="Comentário opcional…"
                      rows={2}
                      maxLength={500}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 mb-3"
                    />
                    <button
                      onClick={() => enviarAvaliacao.mutate()}
                      disabled={enviarAvaliacao.isPending}
                      className="w-full bg-pink-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-pink-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {enviarAvaliacao.isPending ? 'Enviando…' : 'Enviar avaliação'}
                    </button>
                    {enviarAvaliacao.isError && (
                      <p className="text-xs text-red-500 text-center mt-2">Erro ao enviar. Tente novamente.</p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center pb-8">
          <p className="text-xs text-gray-300">Powered by Pink Manager</p>
        </div>
      </div>
    </div>
  )
}
