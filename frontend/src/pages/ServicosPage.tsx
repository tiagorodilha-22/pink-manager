import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'

interface Servico {
  id: string
  nome: string
  descricao: string | null
  duracaoHoras: number
  precoBase: number
  precoHora: number
  ativo: boolean
}

interface ServicoForm {
  nome: string; descricao: string; duracaoHoras: number; precoBase: number; precoHora: number
}
const VAZIO: ServicoForm = { nome: '', descricao: '', duracaoHoras: 1, precoBase: 0, precoHora: 0 }

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ServicosPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal]   = useState(false)
  const [editando, setEditando]     = useState<Servico | null>(null)
  const [form, setForm]             = useState<ServicoForm>(VAZIO)
  const [erro, setErro]             = useState('')
  const [showInativos, setShowInativos] = useState(false)

  const { data: servicos = [], isLoading } = useQuery<Servico[]>({
    queryKey: ['servicos', showInativos],
    queryFn:  () => api.get(`/servicos${showInativos ? '?ativo=false' : ''}`).then(r => r.data),
  })

  function abrirCriar() {
    setEditando(null)
    setForm(VAZIO)
    setErro('')
    setShowModal(true)
  }

  function abrirEditar(s: Servico) {
    setEditando(s)
    setForm({ nome: s.nome, descricao: s.descricao ?? '', duracaoHoras: s.duracaoHoras, precoBase: s.precoBase, precoHora: s.precoHora })
    setErro('')
    setShowModal(true)
  }

  const salvar = useMutation({
    mutationFn: () => editando
      ? api.patch(`/servicos/${editando.id}`, { ...form, descricao: form.descricao || undefined })
      : api.post('/servicos', { ...form, descricao: form.descricao || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicos'] })
      setShowModal(false)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErro(msg ?? 'Erro ao salvar.')
    },
  })

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/servicos/${id}/toggle`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['servicos'] }),
  })

  const excluir = useMutation({
    mutationFn: (id: string) => api.delete(`/servicos/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['servicos'] }),
  })

  function handleSubmit() {
    if (!form.nome.trim()) { setErro('Informe o nome do serviço'); return }
    setErro('')
    salvar.mutate()
  }

  const totalPreco = (s: Servico) => s.precoBase + s.precoHora * s.duracaoHoras

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tabela de Serviços</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie serviços, preços e hora/homem</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded"
              checked={showInativos}
              onChange={e => setShowInativos(e.target.checked)}
            />
            Mostrar inativos
          </label>
          <button className="btn-primary flex items-center gap-2" onClick={abrirCriar}>
            <Plus className="w-4 h-4" /> Novo serviço
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando…</div>
      ) : servicos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">Nenhum serviço cadastrado</p>
          <p className="text-sm mt-1">Crie o primeiro serviço usando o botão acima.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Serviço</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Duração (h)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Preço base</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Hora/Homem</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total estimado</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {servicos.map(s => (
                <tr key={s.id} className={`border-b border-gray-50 last:border-0 ${!s.ativo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.nome}</p>
                    {s.descricao && <p className="text-xs text-gray-400 mt-0.5">{s.descricao}</p>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {s.duracaoHoras.toLocaleString('pt-BR')}h
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{fmt(s.precoBase)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{fmt(s.precoHora)}/h</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-pink-700">{fmt(totalPreco(s))}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle.mutate(s.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium"
                      title={s.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {s.ativo
                        ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600">Ativo</span></>
                        : <><ToggleLeft  className="w-5 h-5 text-gray-400" /><span className="text-gray-400">Inativo</span></>
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Excluir "${s.nome}"?`)) excluir.mutate(s.id) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal titulo={editando ? 'Editar serviço' : 'Novo serviço'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Nome *</label>
              <input
                className="input"
                placeholder="Ex: Troca de óleo completa"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Descrição</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Detalhes do serviço (opcional)"
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Duração (horas)</label>
                <input
                  className="input"
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={form.duracaoHoras}
                  onChange={e => setForm(f => ({ ...f, duracaoHoras: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Preço base (R$)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precoBase}
                  onChange={e => setForm(f => ({ ...f, precoBase: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Hora/Homem (R$/h)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precoHora}
                  onChange={e => setForm(f => ({ ...f, precoHora: Number(e.target.value) }))}
                />
              </div>
            </div>

            {(form.precoBase > 0 || form.precoHora > 0) && (
              <div className="bg-pink-50 rounded-xl p-3 text-sm">
                <span className="text-pink-600 font-medium">Total estimado: </span>
                <span className="font-bold text-pink-700">
                  {fmt(form.precoBase + form.precoHora * form.duracaoHoras)}
                </span>
                <span className="text-pink-400 text-xs ml-2">
                  ({fmt(form.precoBase)} base + {fmt(form.precoHora)}/h × {form.duracaoHoras}h)
                </span>
              </div>
            )}

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            <div className="flex gap-3 pt-1">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1 justify-center"
                disabled={salvar.isPending}
                onClick={handleSubmit}
              >
                {salvar.isPending ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar serviço'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
