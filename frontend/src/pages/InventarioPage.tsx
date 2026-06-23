import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Package, ArrowUp, ArrowDown, AlertTriangle, Sparkles, Edit2 } from 'lucide-react'
import { api } from '../lib/api'
import Modal from '../components/Modal'
import PesquisarPecaAI from '../components/PesquisarPecaAI'

interface ItemInventario {
  id: string
  nome: string
  codigoInterno?: string
  codigoFabricante?: string
  categoria: string
  marca?: string
  compatibilidade?: string
  descricao?: string
  unidade: string
  quantidade: number
  qtdMinima: number
  custoUnitario: number
  precoVenda: number
  localizacao?: string
}

const CATEGORIAS = ['FREIOS','MOTOR','SUSPENSAO','ELETRICA','FILTROS','PNEUS','TRANSMISSAO','CARROCERIA','FLUIDOS','OUTROS']
const CAT_COR: Record<string, string> = {
  FREIOS:'bg-red-100 text-red-700', MOTOR:'bg-orange-100 text-orange-700',
  SUSPENSAO:'bg-yellow-100 text-yellow-700', ELETRICA:'bg-blue-100 text-blue-700',
  FILTROS:'bg-cyan-100 text-cyan-700', PNEUS:'bg-slate-100 text-slate-700',
  TRANSMISSAO:'bg-purple-100 text-purple-700', CARROCERIA:'bg-pink-100 text-pink-700',
  FLUIDOS:'bg-teal-100 text-teal-700', OUTROS:'bg-gray-100 text-gray-600',
}
const UNIDADES = ['UN','PAR','KIT','LT','KG','MT','CX']
const formatR = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ─── Formulário de item ───────────────────────────────────────────────────────

function ItemForm({ inicial, onSuccess, onCancel }: {
  inicial?: Partial<ItemInventario>
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'manual' | 'ia'>(inicial ? 'manual' : 'ia')

  const [nome,             setNome]             = useState(inicial?.nome ?? '')
  const [codigoFabricante, setCodigoFabricante] = useState(inicial?.codigoFabricante ?? '')
  const [codigoInterno,    setCodigoInterno]    = useState(inicial?.codigoInterno ?? '')
  const [categoria,        setCategoria]        = useState(inicial?.categoria ?? 'OUTROS')
  const [marca,            setMarca]            = useState(inicial?.marca ?? '')
  const [compatibilidade,  setCompatibilidade]  = useState(inicial?.compatibilidade ?? '')
  const [descricao,        setDescricao]        = useState(inicial?.descricao ?? '')
  const [unidade,          setUnidade]          = useState(inicial?.unidade ?? 'UN')
  const [quantidade,       setQuantidade]       = useState(String(inicial?.quantidade ?? 0))
  const [qtdMinima,        setQtdMinima]        = useState(String(inicial?.qtdMinima ?? 1))
  const [custoUnitario,    setCustoUnitario]    = useState(String(inicial?.custoUnitario ?? ''))
  const [precoVenda,       setPrecoVenda]       = useState(String(inicial?.precoVenda ?? ''))
  const [localizacao,      setLocalizacao]      = useState(inicial?.localizacao ?? '')
  const [erro,             setErro]             = useState('')

  function aplicarAI(dados: { nome?: string; codigoFabricante?: string; categoria?: string; marcas?: string[]; compatibilidade?: string; descricao?: string; faixaPrecoMin?: number; faixaPrecoMax?: number }) {
    if (dados.nome)             setNome(dados.nome)
    if (dados.codigoFabricante) setCodigoFabricante(dados.codigoFabricante)
    if (dados.categoria)        setCategoria(dados.categoria)
    if (dados.marcas?.length)   setMarca(dados.marcas[0])
    if (dados.compatibilidade)  setCompatibilidade(dados.compatibilidade)
    if (dados.descricao)        setDescricao(dados.descricao)
    if (dados.faixaPrecoMin)    setCustoUnitario(String(dados.faixaPrecoMin))
    setTab('manual')
  }

  const salvar = useMutation({
    mutationFn: () => {
      const body = {
        nome, codigoFabricante: codigoFabricante || undefined,
        codigoInterno: codigoInterno || undefined,
        categoria, marca: marca || undefined,
        compatibilidade: compatibilidade || undefined,
        descricao: descricao || undefined,
        unidade, quantidade: parseInt(quantidade) || 0,
        qtdMinima: parseInt(qtdMinima) || 1,
        custoUnitario: parseFloat(custoUnitario) || 0,
        precoVenda: parseFloat(precoVenda) || 0,
        localizacao: localizacao || undefined,
      }
      return inicial?.id ? api.put(`/inventario/${inicial.id}`, body) : api.post('/inventario', body)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventario'] }); onSuccess() },
    onError: () => setErro('Erro ao salvar item.'),
  })

  return (
    <div className="space-y-4">
      {/* Tabs */}
      {!inicial && (
        <div className="flex gap-1 border-b border-gray-200 -mx-5 px-5">
          {[
            { key: 'ia',     label: '✨ Pesquisar com IA' },
            { key: 'manual', label: 'Cadastro manual' },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as 'ia' | 'manual')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab IA */}
      {tab === 'ia' && (
        <PesquisarPecaAI onUsar={aplicarAI} />
      )}

      {/* Tab Manual */}
      {tab === 'manual' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome da peça *</label>
              <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Pastilha de freio dianteiro" />
            </div>
            <div>
              <label className="label">Código fabricante (OEM)</label>
              <input className="input font-mono" value={codigoFabricante} onChange={e => setCodigoFabricante(e.target.value)} placeholder="04465-02220" />
            </div>
            <div>
              <label className="label">Código interno</label>
              <input className="input font-mono" value={codigoInterno} onChange={e => setCodigoInterno(e.target.value)} placeholder="PEC-0001" />
            </div>
          </div>

          <div>
            <label className="label">Categoria</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS.map(c => (
                <button key={c} type="button" onClick={() => setCategoria(c)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    categoria === c ? `border-pink-400 bg-pink-50 text-pink-700` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Marca</label>
              <input className="input" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Bosch, TRW, Mahle…" />
            </div>
            <div>
              <label className="label">Unidade</label>
              <select className="input" value={unidade} onChange={e => setUnidade(e.target.value)}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Qtd em estoque</label>
              <input type="number" min={0} className="input" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
            </div>
            <div>
              <label className="label">Qtd mínima (alerta)</label>
              <input type="number" min={0} className="input" value={qtdMinima} onChange={e => setQtdMinima(e.target.value)} />
            </div>
            <div>
              <label className="label">Custo unitário (R$)</label>
              <input type="number" min={0} step={0.01} className="input" placeholder="0,00" value={custoUnitario} onChange={e => setCustoUnitario(e.target.value)} />
            </div>
            <div>
              <label className="label">Preço de venda (R$)</label>
              <input type="number" min={0} step={0.01} className="input" placeholder="0,00" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Compatibilidade</label>
            <input className="input" value={compatibilidade} onChange={e => setCompatibilidade(e.target.value)} placeholder="Honda Civic 2020-2023, Toyota Corolla 2019+" />
          </div>
          <div>
            <label className="label">Localização no estoque</label>
            <input className="input" value={localizacao} onChange={e => setLocalizacao(e.target.value)} placeholder="Prateleira A3, Gaveta 12…" />
          </div>
          <div>
            <label className="label">Descrição / observações</label>
            <textarea className="input resize-none" rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-3">
            <button className="btn-primary flex-1 justify-center" disabled={!nome || salvar.isPending} onClick={() => salvar.mutate()}>
              {salvar.isPending ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Cadastrar item'}
            </button>
            <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal movimentação ───────────────────────────────────────────────────────

function MovimentacaoModal({ item, tipo, onClose }: {
  item: ItemInventario
  tipo: 'ENTRADA' | 'SAIDA'
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [quantidade, setQuantidade] = useState('')
  const [custo,      setCusto]      = useState('')
  const [motivo,     setMotivo]     = useState('')

  const salvar = useMutation({
    mutationFn: () => api.post(`/inventario/${item.id}/${tipo.toLowerCase()}`, {
      quantidade: parseInt(quantidade),
      ...(tipo === 'ENTRADA' && custo ? { custo: parseFloat(custo) } : {}),
      motivo: motivo || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventario'] }); onClose() },
  })

  return (
    <Modal titulo={tipo === 'ENTRADA' ? `Entrada — ${item.nome}` : `Saída — ${item.nome}`} onClose={onClose} largura="sm">
      <div className="space-y-4">
        <div className="card p-3 bg-gray-50 flex justify-between text-sm">
          <span className="text-gray-500">Estoque atual</span>
          <span className="font-semibold text-gray-900">{item.quantidade} {item.unidade}</span>
        </div>
        <div>
          <label className="label">Quantidade *</label>
          <input type="number" min={1} className="input" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="0" autoFocus />
        </div>
        {tipo === 'ENTRADA' && (
          <div>
            <label className="label">Custo unitário (R$)</label>
            <input type="number" min={0} step={0.01} className="input" value={custo} onChange={e => setCusto(e.target.value)} placeholder={String(Number(item.custoUnitario))} />
          </div>
        )}
        <div>
          <label className="label">Motivo / referência</label>
          <input className="input" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder={tipo === 'ENTRADA' ? 'NF 1234, Compra fornecedor…' : 'OS #42, Uso interno…'} />
        </div>
        <div className="flex gap-3">
          <button
            className={`flex-1 btn justify-center py-2.5 font-semibold text-white ${tipo === 'ENTRADA' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'} rounded-lg`}
            disabled={!quantidade || parseInt(quantidade) < 1 || salvar.isPending}
            onClick={() => salvar.mutate()}
          >
            {salvar.isPending ? 'Salvando…' : tipo === 'ENTRADA' ? '↑ Registrar entrada' : '↓ Registrar saída'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function InventarioPage() {
  const [busca,         setBusca]         = useState('')
  const [filtroCateg,   setFiltroCateg]   = useState('')
  const [soAlertas,     setSoAlertas]     = useState(false)
  const [showForm,      setShowForm]      = useState(false)
  const [editando,      setEditando]      = useState<ItemInventario | null>(null)
  const [movimentando,  setMovimentando]  = useState<{ item: ItemInventario; tipo: 'ENTRADA' | 'SAIDA' } | null>(null)

  const { data: itens = [], isLoading } = useQuery<ItemInventario[]>({
    queryKey: ['inventario', busca, filtroCateg, soAlertas],
    queryFn: () => {
      const params = new URLSearchParams()
      if (busca)       params.set('q', busca)
      if (filtroCateg) params.set('categoria', filtroCateg)
      if (soAlertas)   params.set('alerta', 'true')
      return api.get(`/inventario?${params}`).then(r => r.data)
    },
  })

  const alertas = itens.filter(i => i.quantidade <= i.qtdMinima).length

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-pink-600" />
          <h1 className="text-xl font-bold text-gray-900">Inventário</h1>
          {alertas > 0 && (
            <span className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {alertas} com estoque baixo
            </span>
          )}
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Novo item
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nome…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="input w-auto" value={filtroCateg} onChange={e => setFiltroCateg(e.target.value)}>
          <option value="">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={() => setSoAlertas(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            soAlertas ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Só alertas
        </button>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Item','Código','Categoria','Marca','Estoque','Custo','Preço',''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>}
            {!isLoading && !itens.length && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center">
                  <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Nenhum item no inventário</p>
                  <button className="text-pink-500 text-sm mt-1 hover:underline flex items-center gap-1 mx-auto" onClick={() => setShowForm(true)}>
                    <Sparkles className="w-3.5 h-3.5" /> Adicionar com IA
                  </button>
                </td>
              </tr>
            )}
            {itens.map(item => {
              const alerta = item.quantidade <= item.qtdMinima
              return (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${alerta ? 'bg-orange-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.nome}</p>
                    {item.compatibilidade && <p className="text-xs text-gray-400 truncate max-w-48">{item.compatibilidade}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.codigoFabricante ?? item.codigoInterno ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${CAT_COR[item.categoria] ?? 'bg-gray-100 text-gray-600'}`}>{item.categoria}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{item.marca ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1 font-semibold text-sm ${alerta ? 'text-orange-600' : 'text-gray-900'}`}>
                      {alerta && <AlertTriangle className="w-3.5 h-3.5" />}
                      {item.quantidade} <span className="text-xs font-normal text-gray-400">{item.unidade}</span>
                    </div>
                    <p className="text-xs text-gray-400">mín: {item.qtdMinima}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{formatR(Number(item.custoUnitario))}</td>
                  <td className="px-4 py-3 text-gray-900 text-sm font-medium">{formatR(Number(item.precoVenda))}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button title="Entrada" className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors" onClick={() => setMovimentando({ item, tipo: 'ENTRADA' })}>
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button title="Saída" className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors" onClick={() => setMovimentando({ item, tipo: 'SAIDA' })}>
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" onClick={() => setEditando(item)}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal titulo="Novo item" onClose={() => setShowForm(false)} largura="lg">
          <ItemForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
      {editando && (
        <Modal titulo="Editar item" onClose={() => setEditando(null)} largura="lg">
          <ItemForm inicial={editando} onSuccess={() => setEditando(null)} onCancel={() => setEditando(null)} />
        </Modal>
      )}
      {movimentando && (
        <MovimentacaoModal item={movimentando.item} tipo={movimentando.tipo} onClose={() => setMovimentando(null)} />
      )}
    </div>
  )
}
