import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, Upload, X, CheckCircle2, Clock,
  ChevronDown, Trash2, Play, Eye, Search,
} from 'lucide-react'
import { api } from '../lib/api'
import Modal from '../components/Modal'
import dayjs from 'dayjs'

interface Fornecedor { id: string; nome: string }
interface ItemInventario { id: string; nome: string; quantidade: number }

interface ItemNF {
  id?: string
  descricao: string
  quantidade: number
  valorUnitario: number
  codigoFabricante: string
  itemInventarioId: string
}

interface NotaFiscal {
  id: string
  numero: string
  serie: string | null
  dataEmissao: string
  valorTotal: number
  status: string
  fotoPath: string | null
  fornecedor: { id: string; nome: string } | null
  _count?: { itens: number }
  itens?: ItemNF[]
}

const fmt = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Formulário de nova NF ──────────────────────────────────────────────────────

function NovaNotaForm({ onClose }: { onClose: () => void }) {
  const qc  = useQueryClient()
  const ref = useRef<HTMLInputElement>(null)

  const [step,          setStep]          = useState<'header' | 'itens'>('header')
  const [nfId,          setNfId]          = useState<string | null>(null)
  const [fotoPreview,   setFotoPreview]   = useState<string | null>(null)
  const [fotoFile,      setFotoFile]      = useState<File | null>(null)
  const [uploading,     setUploading]     = useState(false)

  // Header
  const [numero,       setNumero]       = useState('')
  const [serie,        setSerie]        = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [dataEmissao,  setDataEmissao]  = useState(dayjs().format('YYYY-MM-DD'))
  const [observacoes,  setObservacoes]  = useState('')
  const [salvandoHdr,  setSalvandoHdr]  = useState(false)
  const [erro,         setErro]         = useState('')

  // Itens
  const [itens, setItens] = useState<ItemNF[]>([
    { descricao: '', quantidade: 1, valorUnitario: 0, codigoFabricante: '', itemInventarioId: '' },
  ])
  const [salvandoItens, setSalvandoItens] = useState(false)
  const [processando,   setProcessando]   = useState(false)
  const [resultado,     setResultado]     = useState<string | null>(null)

  const { data: fornecedores = [] } = useQuery<Fornecedor[]>({
    queryKey: ['fornecedores-select'],
    queryFn:  () => api.get('/fornecedores?ativo=true').then(r => r.data),
  })
  const { data: inventario = [] } = useQuery<ItemInventario[]>({
    queryKey: ['inventario-select'],
    queryFn:  () => api.get('/inventario').then(r => r.data),
  })

  function selecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setFotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function salvarHeader() {
    if (!numero || !dataEmissao) { setErro('Número e data são obrigatórios'); return }
    setSalvandoHdr(true); setErro('')
    try {
      const r = await api.post('/notas-fiscais', {
        numero,
        serie: serie || undefined,
        fornecedorId: fornecedorId || undefined,
        dataEmissao,
        observacoes: observacoes || undefined,
      })
      const id = r.data.id
      setNfId(id)

      if (fotoFile) {
        setUploading(true)
        const fd = new FormData()
        fd.append('file', fotoFile)
        await api.post(`/notas-fiscais/${id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setUploading(false)
      }

      setStep('itens')
    } catch { setErro('Erro ao salvar nota fiscal') }
    finally  { setSalvandoHdr(false) }
  }

  function addItem() {
    setItens(prev => [...prev, { descricao: '', quantidade: 1, valorUnitario: 0, codigoFabricante: '', itemInventarioId: '' }])
  }
  function removeItem(i: number) { setItens(prev => prev.filter((_, j) => j !== i)) }
  function updateItem<K extends keyof ItemNF>(i: number, k: K, v: ItemNF[K]) {
    setItens(prev => prev.map((it, j) => j === i ? { ...it, [k]: v } : it))
  }

  const totalCalculado = itens.reduce((s, i) => s + (i.quantidade * i.valorUnitario), 0)

  async function salvarItens() {
    if (!nfId) return
    const validos = itens.filter(i => i.descricao.trim())
    if (!validos.length) { setErro('Adicione ao menos 1 item'); return }
    setSalvandoItens(true); setErro('')
    try {
      await api.put(`/notas-fiscais/${nfId}/itens`, {
        itens: validos.map(i => ({
          descricao:        i.descricao,
          quantidade:       Number(i.quantidade),
          valorUnitario:    Number(i.valorUnitario),
          codigoFabricante: i.codigoFabricante || undefined,
          itemInventarioId: i.itemInventarioId || undefined,
        })),
      })
      qc.invalidateQueries({ queryKey: ['notas-fiscais'] })
    } catch { setErro('Erro ao salvar itens') }
    finally  { setSalvandoItens(false) }
  }

  async function processar() {
    if (!nfId) return
    await salvarItens()
    setProcessando(true); setErro('')
    try {
      const r = await api.post(`/notas-fiscais/${nfId}/processar`)
      setResultado(r.data.mensagem)
      qc.invalidateQueries({ queryKey: ['notas-fiscais'] })
      qc.invalidateQueries({ queryKey: ['inventario'] })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setErro(err?.response?.data?.error ?? 'Erro ao processar')
    } finally { setProcessando(false) }
  }

  if (resultado) return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <CheckCircle2 className="w-12 h-12 text-green-500" />
      <p className="font-semibold text-gray-900 text-lg">NF processada com sucesso!</p>
      <p className="text-sm text-gray-500">{resultado}</p>
      <button className="btn-primary mt-2" onClick={() => { qc.invalidateQueries({ queryKey: ['notas-fiscais'] }); onClose() }}>Fechar</button>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className={`flex items-center gap-1.5 font-medium ${step === 'header' ? 'text-pink-600' : 'text-green-600'}`}>
          {step === 'itens' ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full bg-pink-600 text-white text-xs flex items-center justify-center">1</span>}
          Cabeçalho
        </span>
        <div className="flex-1 h-px bg-gray-200" />
        <span className={`flex items-center gap-1.5 font-medium ${step === 'itens' ? 'text-pink-600' : 'text-gray-400'}`}>
          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${step === 'itens' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
          Itens
        </span>
      </div>

      {/* ── STEP 1: Header ── */}
      {step === 'header' && (
        <div className="space-y-4">
          {/* Upload foto */}
          <div>
            <label className="label">Foto da nota fiscal</label>
            <input ref={ref} type="file" accept="image/*,.pdf" className="hidden" onChange={selecionarFoto} />
            {!fotoPreview ? (
              <button
                type="button"
                onClick={() => ref.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-pink-300 hover:text-pink-400 transition-colors"
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm">Clique para selecionar foto ou PDF da NF</span>
              </button>
            ) : (
              <div className="relative">
                <img src={fotoPreview} alt="NF" className="w-full max-h-48 object-contain rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={() => { setFotoPreview(null); setFotoFile(null) }}
                  className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-gray-500 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Número da NF *</label>
              <input className="input" value={numero} onChange={e => setNumero(e.target.value)} placeholder="000123" />
            </div>
            <div>
              <label className="label">Série</label>
              <input className="input" value={serie} onChange={e => setSerie(e.target.value)} placeholder="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fornecedor</label>
              <div className="relative">
                <select className="input appearance-none pr-8" value={fornecedorId} onChange={e => setFornecedorId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="label">Data de emissão *</label>
              <input type="date" className="input" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <input className="input" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Compra de peças, referência pedido…" />
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-3">
            <button
              className="btn-primary flex-1 justify-center"
              disabled={salvandoHdr || uploading}
              onClick={salvarHeader}
            >
              {uploading ? 'Enviando foto…' : salvandoHdr ? 'Salvando…' : 'Próximo: Itens →'}
            </button>
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Itens ── */}
      {step === 'itens' && (
        <div className="space-y-4">
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {itens.map((item, i) => (
              <div key={i} className="card p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <input
                      className="input text-sm"
                      placeholder="Descrição da peça *"
                      value={item.descricao}
                      onChange={e => updateItem(i, 'descricao', e.target.value)}
                    />
                  </div>
                  <button onClick={() => removeItem(i)} className="p-2 text-gray-300 hover:text-red-500 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">Qtd</label>
                    <input type="number" min={0.01} step={0.01} className="input text-sm py-1.5"
                      value={item.quantidade}
                      onChange={e => updateItem(i, 'quantidade', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Vlr. unitário (R$)</label>
                    <input type="number" min={0} step={0.01} className="input text-sm py-1.5"
                      value={item.valorUnitario}
                      onChange={e => updateItem(i, 'valorUnitario', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Cód. fabricante</label>
                    <input className="input text-sm py-1.5 font-mono"
                      value={item.codigoFabricante}
                      onChange={e => updateItem(i, 'codigoFabricante', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Vincular a item do inventário (opcional)</label>
                  <div className="relative">
                    <select className="input text-sm py-1.5 appearance-none pr-8"
                      value={item.itemInventarioId}
                      onChange={e => updateItem(i, 'itemInventarioId', e.target.value)}>
                      <option value="">Criar novo item no inventário</option>
                      {inventario.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.nome} (estoque: {inv.quantidade})</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem} className="btn-secondary w-full justify-center text-sm py-2">
            <Plus className="w-4 h-4" /> Adicionar item
          </button>

          <div className="flex justify-between items-center px-1">
            <span className="text-sm text-gray-500">Total calculado</span>
            <span className="font-bold text-gray-900">{fmt(totalCalculado)}</span>
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-3">
            <button
              className="btn-primary flex-1 justify-center py-2.5 bg-green-600 hover:bg-green-700"
              disabled={processando || salvandoItens}
              onClick={processar}
            >
              <Play className="w-4 h-4" />
              {processando ? 'Processando…' : 'Processar → Estoque'}
            </button>
            <button
              className="btn-secondary"
              disabled={salvandoItens}
              onClick={salvarItens}
            >
              {salvandoItens ? 'Salvando…' : 'Só salvar'}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            "Processar" lança todos os itens no inventário. "Só salvar" mantém como rascunho.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Modal de detalhe / processamento posterior ─────────────────────────────────

function DetalheModal({ nfId, onClose }: { nfId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: nf, isLoading } = useQuery<NotaFiscal>({
    queryKey: ['nf-detalhe', nfId],
    queryFn:  () => api.get(`/notas-fiscais/${nfId}`).then(r => r.data),
  })
  const [processando, setProcessando] = useState(false)
  const [resultado,   setResultado]   = useState<string | null>(null)
  const [erro,        setErro]        = useState('')

  async function processar() {
    setProcessando(true); setErro('')
    try {
      const r = await api.post(`/notas-fiscais/${nfId}/processar`)
      setResultado(r.data.mensagem)
      qc.invalidateQueries({ queryKey: ['notas-fiscais'] })
      qc.invalidateQueries({ queryKey: ['inventario'] })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setErro(err?.response?.data?.error ?? 'Erro ao processar')
    } finally { setProcessando(false) }
  }

  if (isLoading) return <p className="text-sm text-gray-400 py-4">Carregando…</p>
  if (!nf) return null

  return (
    <div className="space-y-4">
      {/* Foto */}
      {nf.fotoPath && (
        <img
          src={`${api.defaults.baseURL}/notas-fiscais/${nfId}/foto`}
          alt="NF"
          className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
        />
      )}

      {/* Info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-gray-400">Fornecedor</p><p className="font-medium">{nf.fornecedor?.nome ?? '—'}</p></div>
        <div><p className="text-xs text-gray-400">Data emissão</p><p className="font-medium">{dayjs(nf.dataEmissao).format('DD/MM/YYYY')}</p></div>
        <div><p className="text-xs text-gray-400">Total</p><p className="font-bold text-gray-900">{fmt(Number(nf.valorTotal))}</p></div>
        <div><p className="text-xs text-gray-400">Status</p>
          <span className={`badge text-xs ${nf.status === 'PROCESSADA' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {nf.status}
          </span>
        </div>
      </div>

      {/* Itens */}
      {nf.itens && nf.itens.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>{['Descrição','Qtd','Vlr Unit','Total','Inventário'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-400 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {nf.itens.map((item, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-gray-800">{item.descricao}</td>
                  <td className="px-3 py-2 text-gray-500">{Number(item.quantidade)}</td>
                  <td className="px-3 py-2 text-gray-500">{fmt(Number(item.valorUnitario))}</td>
                  <td className="px-3 py-2 font-medium">{fmt(Number(item.quantidade) * Number(item.valorUnitario))}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">
                    {(item as unknown as { itemInventario?: { nome: string } }).itemInventario?.nome ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resultado && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {resultado}
        </div>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {nf.status !== 'PROCESSADA' && !resultado && (
        <button className="btn-primary w-full justify-center bg-green-600 hover:bg-green-700" disabled={processando} onClick={processar}>
          <Play className="w-4 h-4" />
          {processando ? 'Processando…' : 'Processar → Estoque'}
        </button>
      )}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function NotasFiscaisPage() {
  const [showForm,   setShowForm]   = useState(false)
  const [detalheId,  setDetalheId]  = useState<string | null>(null)
  const [busca,      setBusca]      = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const qc = useQueryClient()

  const { data: notas = [], isLoading } = useQuery<NotaFiscal[]>({
    queryKey: ['notas-fiscais', busca, filtroStatus],
    queryFn:  () => {
      const p = new URLSearchParams()
      if (busca)        p.set('q', busca)
      if (filtroStatus) p.set('status', filtroStatus)
      return api.get(`/notas-fiscais?${p}`).then(r => r.data)
    },
  })

  const deletar = useMutation({
    mutationFn: (id: string) => api.delete(`/notas-fiscais/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notas-fiscais'] }),
  })

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-pink-600" />
          <h1 className="text-xl font-bold text-gray-900">Notas Fiscais de Entrada</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nova NF
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por número ou fornecedor…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        {['', 'PENDENTE', 'PROCESSADA'].map(s => (
          <button key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              filtroStatus === s ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {s === '' ? 'Todas' : s === 'PENDENTE' ? 'Pendentes' : 'Processadas'}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['NF','Fornecedor','Data emissão','Itens','Total','Status',''].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>}
            {!isLoading && !notas.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center">
                <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nenhuma nota fiscal cadastrada</p>
              </td></tr>
            )}
            {notas.map(nf => (
              <tr key={nf.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono font-medium text-gray-900">
                  {nf.numero}{nf.serie ? `/${nf.serie}` : ''}
                  {nf.fotoPath && <FileText className="w-3 h-3 inline ml-1.5 text-gray-300" />}
                </td>
                <td className="px-4 py-3 text-gray-700">{nf.fornecedor?.nome ?? <span className="text-gray-400 italic">Sem fornecedor</span>}</td>
                <td className="px-4 py-3 text-gray-500">{dayjs(nf.dataEmissao).format('DD/MM/YYYY')}</td>
                <td className="px-4 py-3 text-gray-500">{nf._count?.itens ?? 0} itens</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{fmt(Number(nf.valorTotal))}</td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs flex items-center gap-1 w-fit ${nf.status === 'PROCESSADA' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {nf.status === 'PROCESSADA' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {nf.status === 'PROCESSADA' ? 'Processada' : 'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button title="Ver detalhe" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-pink-600 transition-colors" onClick={() => setDetalheId(nf.id)}>
                      <Eye className="w-4 h-4" />
                    </button>
                    {nf.status !== 'PROCESSADA' && (
                      <button title="Excluir" className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors" onClick={() => {
                        if (confirm('Excluir esta nota fiscal?')) deletar.mutate(nf.id)
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal titulo="Nova Nota Fiscal" onClose={() => setShowForm(false)} largura="lg">
          <NovaNotaForm onClose={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['notas-fiscais'] }) }} />
        </Modal>
      )}
      {detalheId && (
        <Modal titulo="Nota Fiscal" onClose={() => setDetalheId(null)} largura="lg">
          <DetalheModal nfId={detalheId} onClose={() => setDetalheId(null)} />
        </Modal>
      )}
    </div>
  )
}
