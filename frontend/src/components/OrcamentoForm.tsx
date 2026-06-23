import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Package, Wrench, MoreHorizontal } from 'lucide-react'
import { api } from '../lib/api'

interface ItemOrcamento {
  tipo: 'PECA' | 'MAO_OBRA' | 'OUTROS'
  descricao: string
  quantidade: number
  valorUnit: number
}

interface ItemExistente extends ItemOrcamento {
  id: string
  valorTotal: number
}

interface OrcamentoExistente {
  id: string
  status: string
  valorPecas: number
  valorMO: number
  valorTotal: number
  prazoEntrega?: string
  observacoes?: string
  itens: ItemExistente[]
}

interface Props {
  osId: string
  orcamento?: OrcamentoExistente
  onSuccess?: () => void
}

interface ItemInv { id: string; nome: string; precoVenda: number; quantidade: number; unidade: string }
interface Servico { id: string; nome: string; precoBase: number; precoHora: number; duracaoHoras: number }

const TIPO_ICONE: Record<string, React.ReactNode> = {
  PECA:    <Package      className="w-3.5 h-3.5" />,
  MAO_OBRA:<Wrench       className="w-3.5 h-3.5" />,
  OUTROS:  <MoreHorizontal className="w-3.5 h-3.5" />,
}
const TIPO_LABEL = { PECA: 'Peça', MAO_OBRA: 'Mão de obra', OUTROS: 'Outros' }
const TIPO_COR: Record<string, string> = {
  PECA:    'border-blue-400 bg-blue-50 text-blue-700',
  MAO_OBRA:'border-purple-400 bg-purple-50 text-purple-700',
  OUTROS:  'border-gray-300 bg-gray-50 text-gray-600',
}

function novoItem(): ItemOrcamento {
  return { tipo: 'PECA', descricao: '', quantidade: 1, valorUnit: 0 }
}

// palavras sem significado para o matching
const STOP = new Set(['de','da','do','das','dos','e','a','o','em','para','com','por','um','uma','na','no'])

function encontrarServicoRelacionado(nomePeca: string, servicos: Servico[]): Servico | null {
  const palavras = nomePeca.toLowerCase().split(/\s+/).filter(p => p.length > 2 && !STOP.has(p))
  if (!palavras.length) return null
  const scored = servicos.map(s => ({
    s,
    hits: palavras.filter(p => s.nome.toLowerCase().includes(p)).length,
  })).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits)
  return scored[0]?.s ?? null
}

// ── Autocomplete Peça (Inventário) ────────────────────────────────────────────
function BuscaPeca({ value, onChange, onSelecionar }: {
  value: string
  onChange: (descricao: string, valorUnit: number) => void
  onSelecionar?: (nome: string) => void
}) {
  const [busca, setBusca] = useState(value)
  const [aberto, setAberto] = useState(false)

  const { data: itens = [] } = useQuery<ItemInv[]>({
    queryKey: ['inv-busca', busca],
    queryFn: () => api.get(`/inventario${busca.length > 1 ? `?q=${busca}` : ''}`).then(r => r.data),
    enabled: aberto && busca.length > 1,
  })

  function selecionar(item: ItemInv) {
    setBusca(item.nome)
    onChange(item.nome, Number(item.precoVenda))
    onSelecionar?.(item.nome)
    setAberto(false)
  }

  return (
    <div className="relative">
      <input
        className="input text-sm"
        placeholder="Buscar peça no inventário…"
        value={busca}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onChange={e => { setBusca(e.target.value); onChange(e.target.value, 0); setAberto(true) }}
      />
      {aberto && itens.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {itens.map(i => (
            <button
              key={i.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between gap-3 text-sm border-b border-gray-50 last:border-0"
              onMouseDown={() => selecionar(i)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{i.nome}</p>
                <p className="text-xs text-gray-400">Estoque: {i.quantidade} {i.unidade}</p>
              </div>
              <span className="text-xs font-semibold text-blue-700 flex-shrink-0">
                {Number(i.precoVenda).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Autocomplete Serviço (Mão de obra) ───────────────────────────────────────
function BuscaServico({ value, onChange }: {
  value: string
  onChange: (descricao: string, valorUnit: number) => void
}) {
  const [busca, setBusca] = useState(value)
  const [aberto, setAberto] = useState(false)

  const { data: servicos = [] } = useQuery<Servico[]>({
    queryKey: ['servicos'],
    queryFn: () => api.get('/servicos').then(r => r.data),
  })

  const filtrados = busca.length > 1
    ? servicos.filter(s => s.nome.toLowerCase().includes(busca.toLowerCase()))
    : servicos

  function selecionar(s: Servico) {
    const preco = s.precoBase + s.precoHora * s.duracaoHoras
    setBusca(s.nome)
    onChange(s.nome, preco)
    setAberto(false)
  }

  return (
    <div className="relative">
      <input
        className="input text-sm"
        placeholder="Buscar serviço da tabela…"
        value={busca}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onChange={e => { setBusca(e.target.value); onChange(e.target.value, 0); setAberto(true) }}
      />
      {aberto && filtrados.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtrados.map(s => {
            const preco = s.precoBase + s.precoHora * s.duracaoHoras
            return (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center justify-between gap-3 text-sm border-b border-gray-50 last:border-0"
                onMouseDown={() => selecionar(s)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{s.nome}</p>
                  <p className="text-xs text-gray-400">{s.duracaoHoras}h · base {Number(s.precoBase).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
                </div>
                <span className="text-xs font-semibold text-purple-700 flex-shrink-0">
                  {preco.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Form principal ─────────────────────────────────────────────────────────────
export default function OrcamentoForm({ osId, orcamento, onSuccess }: Props) {
  const qc = useQueryClient()

  const { data: servicos = [] } = useQuery<Servico[]>({
    queryKey: ['servicos'],
    queryFn: () => api.get('/servicos').then(r => r.data),
  })

  const [sugestaoAdicionada, setSugestaoAdicionada] = useState<string | null>(null)

  function handlePecaSelecionada(nomePeca: string) {
    const servico = encontrarServicoRelacionado(nomePeca, servicos)
    if (!servico) return
    // não duplica se já existe MAO_OBRA com mesmo nome
    setItens(prev => {
      if (prev.some(i => i.tipo === 'MAO_OBRA' && i.descricao === servico.nome)) return prev
      const preco = servico.precoBase + servico.precoHora * servico.duracaoHoras
      setSugestaoAdicionada(servico.nome)
      setTimeout(() => setSugestaoAdicionada(null), 3000)
      return [...prev, { tipo: 'MAO_OBRA', descricao: servico.nome, quantidade: 1, valorUnit: preco }]
    })
  }

  const [itens, setItens] = useState<ItemOrcamento[]>(
    orcamento?.itens.map(i => ({
      tipo: i.tipo,
      descricao: i.descricao,
      quantidade: Number(i.quantidade),
      valorUnit: Number(i.valorUnit),
    })) ?? [novoItem()]
  )
  const [prazoEntrega, setPrazoEntrega] = useState(
    orcamento?.prazoEntrega ? orcamento.prazoEntrega.substring(0, 10) : ''
  )
  const [observacoes, setObservacoes] = useState(orcamento?.observacoes ?? '')

  const salvar = useMutation({
    mutationFn: () =>
      api.put(`/os/${osId}/orcamento`, {
        itens,
        prazoEntrega: prazoEntrega ? new Date(prazoEntrega).toISOString() : undefined,
        observacoes: observacoes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['os', osId] })
      onSuccess?.()
    },
  })

  function atualizarItem(idx: number, campos: Partial<ItemOrcamento>) {
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, ...campos } : item))
  }

  function removerItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  const totalPecas   = itens.filter(i => i.tipo === 'PECA').reduce((s, i) => s + i.quantidade * i.valorUnit, 0)
  const totalMO      = itens.filter(i => i.tipo === 'MAO_OBRA').reduce((s, i) => s + i.quantidade * i.valorUnit, 0)
  const totalOutros  = itens.filter(i => i.tipo === 'OUTROS').reduce((s, i) => s + i.quantidade * i.valorUnit, 0)
  const totalGeral   = totalPecas + totalMO + totalOutros

  const fmt    = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const valido = itens.length > 0 && itens.every(i => i.descricao.trim() && i.quantidade > 0 && i.valorUnit > 0)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {itens.map((item, idx) => (
          <div key={idx} className="card p-3 space-y-2">
            {/* Tipo */}
            <div className="flex gap-2">
              {(['PECA', 'MAO_OBRA', 'OUTROS'] as const).map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => atualizarItem(idx, { tipo, descricao: '', valorUnit: 0 })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    item.tipo === tipo ? TIPO_COR[tipo] : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {TIPO_ICONE[tipo]}
                  {TIPO_LABEL[tipo]}
                </button>
              ))}
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => removerItem(idx)}
                className="text-gray-300 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Descrição — muda conforme tipo */}
            {item.tipo === 'PECA' && (
              <BuscaPeca
                value={item.descricao}
                onChange={(descricao, valorUnit) => atualizarItem(idx, { descricao, ...(valorUnit > 0 && { valorUnit }) })}
                onSelecionar={handlePecaSelecionada}
              />
            )}
            {item.tipo === 'MAO_OBRA' && (
              <BuscaServico
                value={item.descricao}
                onChange={(descricao, valorUnit) => atualizarItem(idx, { descricao, ...(valorUnit > 0 && { valorUnit }) })}
              />
            )}
            {item.tipo === 'OUTROS' && (
              <input
                className="input text-sm"
                placeholder="Descrição do item"
                value={item.descricao}
                onChange={e => atualizarItem(idx, { descricao: e.target.value })}
              />
            )}

            {/* Qtd + Valor unit + Total */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label text-xs">Qtd</label>
                <input
                  type="number" min={1} step={1} className="input text-sm"
                  value={item.quantidade}
                  onChange={e => atualizarItem(idx, { quantidade: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="label text-xs">Valor unit. (R$)</label>
                <input
                  type="number" min={0} step={0.01} className="input text-sm"
                  placeholder="0,00"
                  value={item.valorUnit || ''}
                  onChange={e => atualizarItem(idx, { valorUnit: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="label text-xs">Total</label>
                <div className="input text-sm bg-gray-50 text-gray-700 font-semibold flex items-center">
                  {fmt(item.quantidade * item.valorUnit)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {sugestaoAdicionada && (
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700">
            <Wrench className="w-3.5 h-3.5 flex-shrink-0" />
            Mão de obra <strong>"{sugestaoAdicionada}"</strong> adicionada automaticamente
          </div>
        )}

        <button
          type="button"
          onClick={() => setItens(prev => [...prev, novoItem()])}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-pink-300 hover:text-pink-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Adicionar item
        </button>
      </div>

      {/* Prazo + obs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Prazo de entrega</label>
          <input type="date" className="input" value={prazoEntrega} onChange={e => setPrazoEntrega(e.target.value)} />
        </div>
        <div>
          <label className="label">Observações</label>
          <input className="input" placeholder="Observações para o cliente…" value={observacoes} onChange={e => setObservacoes(e.target.value)} />
        </div>
      </div>

      {/* Totais */}
      {totalGeral > 0 && (
        <div className="card p-4 bg-gray-50 space-y-1.5">
          {totalPecas > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-blue-400" /> Peças</span>
              <span>{fmt(totalPecas)}</span>
            </div>
          )}
          {totalMO > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-purple-400" /> Mão de obra</span>
              <span>{fmt(totalMO)}</span>
            </div>
          )}
          {totalOutros > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Outros</span>
              <span>{fmt(totalOutros)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200">
            <span>Total geral</span>
            <span className="text-pink-700">{fmt(totalGeral)}</span>
          </div>
        </div>
      )}

      {salvar.isError && (
        <p className="text-xs text-red-600">Erro ao salvar orçamento. Verifique os itens.</p>
      )}

      <button
        type="button"
        className="btn-primary w-full justify-center py-2.5"
        disabled={!valido || salvar.isPending}
        onClick={() => salvar.mutate()}
      >
        {salvar.isPending ? 'Salvando…' : orcamento ? 'Atualizar orçamento' : 'Salvar orçamento'}
      </button>
    </div>
  )
}
