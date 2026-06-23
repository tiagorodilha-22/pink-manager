import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Store, Edit2, ToggleLeft, ToggleRight, Package } from 'lucide-react'
import { api } from '../lib/api'
import Modal from '../components/Modal'

interface Fornecedor {
  id: string
  nome: string
  cnpj?: string
  contato?: string
  telefone?: string
  email?: string
  ativo: boolean
  _count?: { itens: number }
}

function FornecedorForm({ inicial, onSuccess, onCancel }: {
  inicial?: Fornecedor
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const [nome,     setNome]     = useState(inicial?.nome ?? '')
  const [cnpj,     setCnpj]     = useState(inicial?.cnpj ?? '')
  const [contato,  setContato]  = useState(inicial?.contato ?? '')
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '')
  const [email,    setEmail]    = useState(inicial?.email ?? '')
  const [erro,     setErro]     = useState('')

  const salvar = useMutation({
    mutationFn: () => {
      const body = { nome, cnpj: cnpj || undefined, contato: contato || undefined, telefone: telefone || undefined, email: email || undefined }
      return inicial ? api.put(`/fornecedores/${inicial.id}`, body) : api.post('/fornecedores', body)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fornecedores'] }); onSuccess() },
    onError: () => setErro('Erro ao salvar. Verifique os campos.'),
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nome / Razão social *</label>
          <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="AutoPeças Central Ltda" />
        </div>
        <div>
          <label className="label">CNPJ</label>
          <input className="input" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-0000" />
        </div>
        <div>
          <label className="label">Contato (pessoa)</label>
          <input className="input" value={contato} onChange={e => setContato(e.target.value)} placeholder="João Vendas" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vendas@fornecedor.com" />
        </div>
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-3 pt-1">
        <button className="btn-primary flex-1 justify-center" disabled={!nome || salvar.isPending} onClick={() => salvar.mutate()}>
          {salvar.isPending ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Cadastrar fornecedor'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

export default function FornecedoresPage() {
  const qc = useQueryClient()
  const [busca,        setBusca]        = useState('')
  const [soAtivos,     setSoAtivos]     = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editando,     setEditando]     = useState<Fornecedor | null>(null)

  const { data: fornecedores = [], isLoading } = useQuery<Fornecedor[]>({
    queryKey: ['fornecedores', busca, soAtivos],
    queryFn: () => api.get(`/fornecedores?${busca ? `q=${busca}&` : ''}ativo=${soAtivos}`).then(r => r.data),
  })

  const toggleAtivo = useMutation({
    mutationFn: (id: string) => api.patch(`/fornecedores/${id}/toggle-ativo`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fornecedores'] }),
  })

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-pink-600" />
          <h1 className="text-xl font-bold text-gray-900">Fornecedores</h1>
          <span className="text-sm text-gray-400">({fornecedores.length})</span>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Novo fornecedor
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nome…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <button
          onClick={() => setSoAtivos(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            soAtivos ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'
          }`}
        >
          {soAtivos ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {soAtivos ? 'Somente ativos' : 'Todos'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Fornecedor', 'CNPJ', 'Contato', 'Telefone', 'Peças usadas', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>}
            {!isLoading && !fornecedores.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <Store className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Nenhum fornecedor cadastrado</p>
                </td>
              </tr>
            )}
            {fornecedores.map(f => (
              <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${!f.ativo ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{f.nome}</p>
                  {f.email && <p className="text-xs text-gray-400">{f.email}</p>}
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{f.cnpj ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{f.contato ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{f.telefone ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Package className="w-3.5 h-3.5" /> {f._count?.itens ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${f.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {f.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" title="Editar" onClick={() => setEditando(f)}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-1.5 rounded-lg transition-colors ${f.ativo ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      title={f.ativo ? 'Desativar' : 'Ativar'}
                      onClick={() => toggleAtivo.mutate(f.id)}
                    >
                      {f.ativo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal titulo="Novo fornecedor" onClose={() => setShowForm(false)}>
          <FornecedorForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
      {editando && (
        <Modal titulo="Editar fornecedor" onClose={() => setEditando(null)}>
          <FornecedorForm inicial={editando} onSuccess={() => setEditando(null)} onCancel={() => setEditando(null)} />
        </Modal>
      )}
    </div>
  )
}
