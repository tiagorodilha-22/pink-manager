import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wrench, Plus, Trash2, CalendarClock, Gauge, AlertTriangle,
  CheckCircle2, ChevronDown, Clock, Camera, X, ZoomIn,
} from 'lucide-react'
import { api } from '../lib/api'
import dayjs from 'dayjs'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const TIPOS = [
  { value: 'TROCA_OLEO',         label: 'Troca de óleo',          meses: 6,  km: 5000  },
  { value: 'CORREIA_DENTADA',    label: 'Correia dentada',         meses: 48, km: 60000 },
  { value: 'FILTRO_AR',          label: 'Filtro de ar',            meses: 12, km: 15000 },
  { value: 'FILTRO_COMBUSTIVEL', label: 'Filtro de combustível',   meses: 12, km: 15000 },
  { value: 'FLUIDO_FREIO',       label: 'Fluido de freio',         meses: 24, km: 40000 },
  { value: 'VELA_IGNICAO',       label: 'Vela de ignição',         meses: 24, km: 20000 },
  { value: 'REVISAO_GERAL',      label: 'Revisão geral',           meses: 12, km: 10000 },
  { value: 'OUTRO',              label: 'Outro',                   meses: 0,  km: 0     },
]

const TIPO_FOTO_LABEL: Record<string, string> = { ANTES: 'Antes', DEPOIS: 'Depois', GERAL: 'Foto' }
const TIPO_FOTO_COR:   Record<string, string> = {
  ANTES:  'bg-orange-100 text-orange-700',
  DEPOIS: 'bg-green-100 text-green-700',
  GERAL:  'bg-gray-100 text-gray-600',
}

interface FotoManutencao {
  id: string
  tipo: string
  filename: string
  createdAt: string
}

interface Manutencao {
  id: string
  tipo: string
  descricao: string | null
  kmRealizado: number | null
  dataRealizado: string
  kmProxima: number | null
  dataProxima: string | null
  osNumero: number | null
  fotos: FotoManutencao[]
}

const fmt = (d: string) => dayjs(d).format('DD/MM/YYYY')
const tipoLabel = (t: string) => TIPOS.find(x => x.value === t)?.label ?? t

function statusLembrete(m: Manutencao, kmAtual?: number | null) {
  const hoje = dayjs()
  const vencidoData  = m.dataProxima  && dayjs(m.dataProxima).isBefore(hoje)
  const vencidoKm    = m.kmProxima && kmAtual && kmAtual >= m.kmProxima
  const proximoData  = m.dataProxima  && dayjs(m.dataProxima).diff(hoje, 'day') <= 30
  const proximoKm    = m.kmProxima && kmAtual && (m.kmProxima - kmAtual) <= 1000

  if (vencidoData || vencidoKm)     return 'VENCIDO'
  if (proximoData || proximoKm)     return 'PROXIMO'
  if (m.dataProxima || m.kmProxima) return 'OK'
  return 'SEM_LEMBRETE'
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-1.5 hover:bg-black/70"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={url}
        alt="Foto ampliada"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

// ── Upload de foto para uma manutenção ────────────────────────────────────────
function FotoUpload({ manutencaoId, veiculoId }: { manutencaoId: string; veiculoId: string }) {
  const qc       = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [tipo,    setTipo]    = useState<'ANTES' | 'DEPOIS' | 'GERAL'>('GERAL')
  const [preview, setPreview] = useState<string | null>(null)
  const [file,    setFile]    = useState<File | null>(null)
  const [erro,    setErro]    = useState('')

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) return
      const fd = new FormData()
      fd.append('tipo', tipo)
      fd.append('file', file)
      await api.post(`/manutencao/${manutencaoId}/foto`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manutencoes', veiculoId] })
      setFile(null)
      setPreview(null)
    },
    onError: () => setErro('Erro ao enviar foto'),
  })

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setErro('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function cancelar() {
    setFile(null)
    setPreview(null)
    setErro('')
  }

  if (!file) {
    return (
      <button
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-pink-500 transition-colors border border-dashed border-gray-200 hover:border-pink-300 rounded-lg px-2 py-1.5"
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="w-3.5 h-3.5" />
        Adicionar foto
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </button>
    )
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      <div className="flex gap-1.5">
        {(['ANTES', 'DEPOIS', 'GERAL'] as const).map(t => (
          <button
            key={t}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              tipo === t ? TIPO_FOTO_COR[t] + ' ring-1 ring-current' : 'bg-white text-gray-500 border border-gray-200'
            }`}
            onClick={() => setTipo(t)}
          >
            {TIPO_FOTO_LABEL[t]}
          </button>
        ))}
      </div>

      {preview && (
        <img src={preview} alt="Preview" className="w-full max-h-40 object-cover rounded-lg" />
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex gap-2">
        <button
          className="btn-primary flex-1 justify-center text-xs py-1.5"
          disabled={upload.isPending}
          onClick={() => upload.mutate()}
        >
          {upload.isPending ? 'Enviando…' : 'Salvar foto'}
        </button>
        <button className="btn-secondary text-xs py-1.5" onClick={cancelar}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Grade de fotos ────────────────────────────────────────────────────────────
function GaleriaFotos({ fotos, manutencaoId, veiculoId }: { fotos: FotoManutencao[]; manutencaoId: string; veiculoId: string }) {
  const qc = useQueryClient()
  const [lightbox, setLightbox] = useState<string | null>(null)

  const deletarFoto = useMutation({
    mutationFn: (fotoId: string) => api.delete(`/manutencao/foto/${fotoId}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['manutencoes', veiculoId] }),
  })

  if (!fotos.length) return null

  const grupos: Record<string, FotoManutencao[]> = {}
  for (const f of fotos) {
    grupos[f.tipo] = grupos[f.tipo] ?? []
    grupos[f.tipo].push(f)
  }

  return (
    <>
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
      <div className="space-y-2 mt-2">
        {(['ANTES', 'DEPOIS', 'GERAL'] as const).filter(t => grupos[t]?.length).map(tipo => (
          <div key={tipo}>
            <p className={`text-xs font-semibold mb-1 px-1 ${TIPO_FOTO_COR[tipo].split(' ')[1]}`}>
              {TIPO_FOTO_LABEL[tipo]}
            </p>
            <div className="flex gap-2 flex-wrap">
              {grupos[tipo].map(foto => {
                const url = `${BASE_URL}/manutencao/foto/${foto.id}`
                return (
                  <div key={foto.id} className="relative group">
                    <img
                      src={url}
                      alt={TIPO_FOTO_LABEL[tipo]}
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer border border-gray-100 hover:border-pink-300 transition-colors"
                      onClick={() => setLightbox(url)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        className="bg-white/90 rounded-full p-1 hover:bg-white"
                        onClick={() => setLightbox(url)}
                      >
                        <ZoomIn className="w-3 h-3 text-gray-700" />
                      </button>
                      <button
                        className="bg-white/90 rounded-full p-1 hover:bg-red-50"
                        onClick={() => { if (confirm('Remover esta foto?')) deletarFoto.mutate(foto.id) }}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Form de nova manutenção ───────────────────────────────────────────────────
function NovaManutencaoForm({
  veiculoId, kmAtual, osNumero, onSuccess,
}: {
  veiculoId: string
  kmAtual?: number | null
  osNumero?: number
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const tipoDefault = TIPOS[0]

  const [tipo,          setTipo]          = useState(tipoDefault.value)
  const [descricao,     setDescricao]     = useState('')
  const [kmRealizado,   setKmRealizado]   = useState(String(kmAtual ?? ''))
  const [dataRealizado, setDataRealizado] = useState(dayjs().format('YYYY-MM-DD'))
  const [kmProxima,     setKmProxima]     = useState('')
  const [dataProxima,   setDataProxima]   = useState('')
  const [erro,          setErro]          = useState('')

  const tipoInfo = TIPOS.find(t => t.value === tipo)!

  function onTipoChange(v: string) {
    setTipo(v)
    const t = TIPOS.find(x => x.value === v)!
    if (t.meses) setDataProxima(dayjs(dataRealizado).add(t.meses, 'month').format('YYYY-MM-DD'))
    else setDataProxima('')
    if (t.km && kmRealizado) setKmProxima(String(Number(kmRealizado) + t.km))
    else setKmProxima('')
  }

  function onKmChange(v: string) {
    setKmRealizado(v)
    if (tipoInfo.km && v) setKmProxima(String(Number(v) + tipoInfo.km))
  }

  function onDataChange(v: string) {
    setDataRealizado(v)
    if (tipoInfo.meses) setDataProxima(dayjs(v).add(tipoInfo.meses, 'month').format('YYYY-MM-DD'))
  }

  const salvar = useMutation({
    mutationFn: () => api.post(`/manutencao/veiculo/${veiculoId}`, {
      tipo,
      descricao: descricao || undefined,
      kmRealizado:   kmRealizado   ? Number(kmRealizado)   : undefined,
      dataRealizado,
      kmProxima:     kmProxima     ? Number(kmProxima)     : undefined,
      dataProxima:   dataProxima   || undefined,
      osNumero,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manutencoes', veiculoId] })
      qc.invalidateQueries({ queryKey: ['manutencao-alertas'] })
      onSuccess()
    },
    onError: () => setErro('Erro ao salvar'),
  })

  return (
    <div className="space-y-3 bg-gray-50 rounded-xl p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Tipo *</label>
          <div className="relative">
            <select className="input appearance-none pr-8" value={tipo} onChange={e => onTipoChange(e.target.value)}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="label">Data realizado *</label>
          <input type="date" className="input" value={dataRealizado} onChange={e => onDataChange(e.target.value)} />
        </div>
        <div>
          <label className="label">KM realizado</label>
          <input type="number" className="input" placeholder={String(kmAtual ?? '')} value={kmRealizado} onChange={e => onKmChange(e.target.value)} min={0} />
        </div>

        <div>
          <label className="label text-blue-600">
            <CalendarClock className="w-3 h-3 inline mr-1" />
            Próxima data
          </label>
          <input type="date" className="input border-blue-200 focus:ring-blue-300" value={dataProxima} onChange={e => setDataProxima(e.target.value)} />
        </div>
        <div>
          <label className="label text-blue-600">
            <Gauge className="w-3 h-3 inline mr-1" />
            Próxima KM
          </label>
          <input type="number" className="input border-blue-200 focus:ring-blue-300" value={kmProxima} onChange={e => setKmProxima(e.target.value)} min={0} />
        </div>

        <div className="col-span-2">
          <label className="label">Observação</label>
          <input className="input" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Óleo 5W30 sintético, filtro Mann..." />
        </div>
      </div>

      {tipoInfo.meses > 0 && (
        <p className="text-xs text-blue-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Padrão: a cada {tipoInfo.meses} meses ou {tipoInfo.km.toLocaleString('pt-BR')} km — ajuste se necessário.
        </p>
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex gap-2">
        <button className="btn-primary flex-1 justify-center text-sm py-2" disabled={salvar.isPending} onClick={() => salvar.mutate()}>
          {salvar.isPending ? 'Salvando…' : 'Registrar manutenção'}
        </button>
        <button className="btn-secondary text-sm py-2" onClick={onSuccess}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ManutencaoVeiculo({
  veiculoId, kmAtual, osNumero,
}: {
  veiculoId: string
  kmAtual?: number | null
  osNumero?: number
}) {
  const qc = useQueryClient()
  const [adicionando, setAdicionando] = useState(false)

  const { data: manutencoes = [], isLoading } = useQuery<Manutencao[]>({
    queryKey: ['manutencoes', veiculoId],
    queryFn:  () => api.get(`/manutencao/veiculo/${veiculoId}`).then(r => r.data),
  })

  const deletar = useMutation({
    mutationFn: (id: string) => api.delete(`/manutencao/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['manutencoes', veiculoId] })
      qc.invalidateQueries({ queryKey: ['manutencao-alertas'] })
    },
  })

  const alertas = manutencoes.filter(m => {
    const s = statusLembrete(m, kmAtual)
    return s === 'VENCIDO' || s === 'PROXIMO'
  })

  return (
    <div className="space-y-3">
      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-1.5">
          {alertas.map(m => {
            const s = statusLembrete(m, kmAtual)
            const diasRestantes = m.dataProxima ? dayjs(m.dataProxima).diff(dayjs(), 'day') : null
            return (
              <div key={m.id} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                s === 'VENCIDO' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-semibold">{tipoLabel(m.tipo)}</span>
                {s === 'VENCIDO'
                  ? <span>— vencido {m.dataProxima ? `em ${fmt(m.dataProxima)}` : ''}</span>
                  : <span>— vence em {diasRestantes}d {m.dataProxima ? `(${fmt(m.dataProxima)})` : ''}</span>
                }
                {m.kmProxima && kmAtual && (
                  <span className="ml-auto">
                    {m.kmProxima >= kmAtual
                      ? `faltam ${(m.kmProxima - kmAtual).toLocaleString('pt-BR')} km`
                      : `${(kmAtual - m.kmProxima).toLocaleString('pt-BR')} km vencido`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Header + botão */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Histórico de manutenção ({manutencoes.length})
        </p>
        {!adicionando && (
          <button className="btn-primary text-xs py-1.5 px-3" onClick={() => setAdicionando(true)}>
            <Plus className="w-3.5 h-3.5" /> Registrar
          </button>
        )}
      </div>

      {adicionando && (
        <NovaManutencaoForm
          veiculoId={veiculoId}
          kmAtual={kmAtual ? Number(kmAtual) : undefined}
          osNumero={osNumero}
          onSuccess={() => setAdicionando(false)}
        />
      )}

      {/* Lista */}
      {isLoading && <p className="text-xs text-gray-400">Carregando…</p>}
      {!isLoading && !manutencoes.length && !adicionando && (
        <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
          <Wrench className="w-6 h-6 text-gray-200 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Nenhuma manutenção registrada</p>
        </div>
      )}

      <div className="space-y-2">
        {manutencoes.map(m => {
          const status = statusLembrete(m, kmAtual)
          return (
            <div key={m.id} className="card p-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  status === 'VENCIDO' ? 'bg-red-100' :
                  status === 'PROXIMO' ? 'bg-yellow-100' :
                  status === 'OK'      ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {status === 'VENCIDO' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                   status === 'PROXIMO' ? <Clock className="w-4 h-4 text-yellow-500" /> :
                   status === 'OK'      ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                   <Wrench className="w-4 h-4 text-gray-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{tipoLabel(m.tipo)}</span>
                    {m.osNumero && <span className="text-xs text-gray-400">OS #{m.osNumero}</span>}
                    <button
                      className="ml-auto p-1 text-gray-200 hover:text-red-400 transition-colors"
                      onClick={() => { if (confirm('Remover este registro?')) deletar.mutate(m.id) }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {m.descricao && <p className="text-xs text-gray-500 mt-0.5">{m.descricao}</p>}

                  <div className="flex gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      {fmt(m.dataRealizado)}
                    </span>
                    {m.kmRealizado && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {m.kmRealizado.toLocaleString('pt-BR')} km
                      </span>
                    )}
                  </div>

                  {(m.dataProxima || m.kmProxima) && (
                    <div className={`flex gap-3 mt-1 flex-wrap text-xs font-medium ${
                      status === 'VENCIDO' ? 'text-red-600' :
                      status === 'PROXIMO' ? 'text-yellow-600' : 'text-blue-600'
                    }`}>
                      <span className="flex items-center gap-0.5">Próxima:</span>
                      {m.dataProxima && <span>{fmt(m.dataProxima)}</span>}
                      {m.kmProxima   && <span>{m.kmProxima.toLocaleString('pt-BR')} km</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Galeria + botão de upload */}
              <div className="mt-3 pl-11 space-y-2">
                <GaleriaFotos fotos={m.fotos} manutencaoId={m.id} veiculoId={veiculoId} />
                <FotoUpload manutencaoId={m.id} veiculoId={veiculoId} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
