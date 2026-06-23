import { useState, useEffect } from 'react'
import { Sparkles, ChevronDown, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'

interface FipeMarca  { codigo: string; nome: string }
interface FipeModelo { codigo: string; nome: string }
interface FipeAno    { codigo: string; nome: string }

interface ResultadoAI {
  nome: string
  codigoFabricante?: string
  codigosAlternativos?: string[]
  categoria: string
  marcas: string[]
  compatibilidade?: string
  faixaPrecoMin?: number
  faixaPrecoMax?: number
  descricao?: string
  observacoes?: string
}

interface Props {
  onUsar: (dados: ResultadoAI) => void
}

const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros'

async function fipeGet<T>(path: string): Promise<T> {
  const r = await fetch(`${FIPE_BASE}${path}`)
  if (!r.ok) throw new Error('Erro FIPE')
  return r.json()
}

const formatR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function PesquisarPecaAI({ onUsar }: Props) {
  const [marcas,   setMarcas]   = useState<FipeMarca[]>([])
  const [modelos,  setModelos]  = useState<FipeModelo[]>([])
  const [anos,     setAnos]     = useState<FipeAno[]>([])

  const [marcaId,  setMarcaId]  = useState('')
  const [modeloId, setModeloId] = useState('')
  const [anoId,    setAnoId]    = useState('')

  const [marcaNome,  setMarcaNome]  = useState('')
  const [modeloNome, setModeloNome] = useState('')
  const [anoNome,    setAnoNome]    = useState('')

  const [query,      setQuery]    = useState('')
  const [resultado,  setResultado] = useState<ResultadoAI | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro,       setErro]       = useState('')

  // Carrega marcas na montagem
  useEffect(() => {
    fipeGet<FipeMarca[]>('/marcas').then(setMarcas).catch(() => {})
  }, [])

  // Carrega modelos quando marca muda
  useEffect(() => {
    if (!marcaId) { setModelos([]); setModeloId(''); setAnos([]); setAnoId(''); return }
    fipeGet<{ modelos: FipeModelo[] }>(`/marcas/${marcaId}/modelos`)
      .then(r => setModelos(r.modelos))
      .catch(() => {})
    setModeloId(''); setAnos([]); setAnoId('')
  }, [marcaId])

  // Carrega anos quando modelo muda
  useEffect(() => {
    if (!marcaId || !modeloId) { setAnos([]); setAnoId(''); return }
    fipeGet<FipeAno[]>(`/marcas/${marcaId}/modelos/${modeloId}/anos`)
      .then(setAnos)
      .catch(() => {})
    setAnoId('')
  }, [modeloId])

  async function pesquisar() {
    if (!marcaId || !modeloId || !anoId) return
    setCarregando(true)
    setErro('')
    setResultado(null)
    try {
      const r = await api.post('/agente/pesquisar-peca', {
        marca: marcaNome,
        modelo: modeloNome,
        ano: anoNome,
        query: query.trim() || undefined,
      })
      setResultado(r.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      const msg = err?.response?.data?.error ?? 'Erro ao consultar o agente.'
      setErro(msg.includes('ANTHROPIC_API_KEY')
        ? 'Chave de API não configurada. Adicione ANTHROPIC_API_KEY no .env do backend.'
        : msg)
    } finally {
      setCarregando(false)
    }
  }

  const pronto = !!marcaId && !!modeloId && !!anoId

  return (
    <div className="space-y-4">
      {/* Seletor FIPE */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Marca *</label>
          <div className="relative">
            <select
              className="input appearance-none pr-8"
              value={marcaId}
              onChange={e => {
                const opt = marcas.find(m => m.codigo === e.target.value)
                setMarcaId(e.target.value)
                setMarcaNome(opt?.nome ?? '')
              }}
            >
              <option value="">Selecione…</option>
              {marcas.map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="label">Modelo *</label>
          <div className="relative">
            <select
              className="input appearance-none pr-8"
              value={modeloId}
              disabled={!marcaId}
              onChange={e => {
                const opt = modelos.find(m => m.codigo === e.target.value)
                setModeloId(e.target.value)
                setModeloNome(opt?.nome ?? '')
              }}
            >
              <option value="">Selecione…</option>
              {modelos.map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="label">Ano *</label>
          <div className="relative">
            <select
              className="input appearance-none pr-8"
              value={anoId}
              disabled={!modeloId}
              onChange={e => {
                const opt = anos.find(a => a.codigo === e.target.value)
                setAnoId(e.target.value)
                setAnoNome(opt?.nome?.split(' ')[0] ?? '')
              }}
            >
              <option value="">Selecione…</option>
              {anos.map(a => <option key={a.codigo} value={a.codigo}>{a.nome}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Query opcional */}
      <div>
        <label className="label">O que você precisa? <span className="text-gray-400 font-normal">(opcional)</span></label>
        <input
          className="input"
          placeholder="Ex: pastilha de freio dianteiro, filtro de óleo, correia dentada…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && pronto && pesquisar()}
        />
      </div>

      <button
        type="button"
        disabled={!pronto || carregando}
        onClick={pesquisar}
        className="btn-primary w-full justify-center py-2.5 disabled:opacity-50"
      >
        {carregando
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Consultando agente…</>
          : <><Sparkles className="w-4 h-4" /> Pesquisar com IA</>}
      </button>

      {/* Erro */}
      {erro && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {erro}
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="card p-4 border-pink-200 bg-pink-50/30 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">{resultado.nome}</p>
              {resultado.codigoFabricante && (
                <p className="text-xs text-gray-500 font-mono mt-0.5">OEM: {resultado.codigoFabricante}</p>
              )}
            </div>
            <span className="badge bg-pink-100 text-pink-700 text-xs flex-shrink-0">{resultado.categoria}</span>
          </div>

          {resultado.codigosAlternativos?.length ? (
            <p className="text-xs text-gray-500">Alternativos: {resultado.codigosAlternativos.join(' · ')}</p>
          ) : null}

          {resultado.marcas?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {resultado.marcas.map(m => (
                <span key={m} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{m}</span>
              ))}
            </div>
          ) : null}

          {resultado.compatibilidade && (
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">Compatível com:</span> {resultado.compatibilidade}
            </p>
          )}

          {(resultado.faixaPrecoMin || resultado.faixaPrecoMax) && (
            <p className="text-sm font-medium text-gray-700">
              Faixa: {resultado.faixaPrecoMin ? formatR(resultado.faixaPrecoMin) : ''} – {resultado.faixaPrecoMax ? formatR(resultado.faixaPrecoMax) : ''}
            </p>
          )}

          {resultado.descricao && (
            <p className="text-xs text-gray-500 leading-relaxed">{resultado.descricao}</p>
          )}

          {resultado.observacoes && (
            <p className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">⚠ {resultado.observacoes}</p>
          )}

          <button
            type="button"
            onClick={() => onUsar(resultado)}
            className="btn-primary w-full justify-center mt-1"
          >
            <CheckCircle2 className="w-4 h-4" /> Usar esses dados
          </button>
        </div>
      )}
    </div>
  )
}
