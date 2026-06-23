import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, ToggleLeft, ToggleRight, Building2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import Modal from '../../components/Modal'

interface Filial {
  id: string
  nome: string
  cnpj: string | null
  endereco: string | null
  telefone: string | null
  ativo: boolean
  _count: { usuarios: number; ordens: number }
}

interface FilialForm {
  nome: string; cnpj: string; endereco: string; telefone: string
}
const VAZIO: FilialForm = { nome: '', cnpj: '', endereco: '', telefone: '' }

export default function FiliaisPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando]   = useState<Filial | null>(null)
  const [form, setForm]           = useState<FilialForm>(VAZIO)
  const [erro, setErro]           = useState('')

  const { data: filiais = [], isLoading } = useQuery<Filial[]>({
    queryKey: ['filiais'],
    queryFn:  () => api.get('/filiais').then(r => r.data),
  })

  function abrirCriar() {
    setEditando(null); setForm(VAZIO); setErro(''); setShowModal(true)
  }
  function abrirEditar(f: Filial) {
    setEditando(f)
    setForm({ nome: f.nome, cnpj: f.cnpj ?? '', endereco: f.endereco ?? '', telefone: f.telefone ?? '' })
    setErro(''); setShowModal(true)
  }

  const salvar = useMutation({
    mutationFn: () => {
      const payload = {
        nome:     form.nome,
        cnpj:     form.cnpj     || undefined,
        endereco: form.endereco || undefined,
        telefone: form.telefone || undefined,
      }
      return editando ? api.patch(`/filiais/${editando.id}`, payload) : api.post('/filiais', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['filiais'] }); setShowModal(false) },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErro(msg ?? 'Erro ao salvar.')
    },
  })

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/filiais/${id}/toggle`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['filiais'] }),
  })

  function handleSubmit() {
    if (!form.nome.trim()) { setErro('Informe o nome da filial'); return }
    setErro(''); salvar.mutate()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-pink-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Filiais</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie as unidades da oficina</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={abrirCriar}>
          <Plus className="w-4 h-4" /> Nova filial
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando…</div>
      ) : filiais.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma filial cadastrada</p>
          <p className="text-sm mt-1">Crie a primeira filial para começar a segmentar dados por unidade.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Filial</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Contato</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Usuários</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">OS</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filiais.map(f => (
                <tr key={f.id} className={`border-b border-gray-50 last:border-0 ${!f.ativo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{f.nome}</p>
                    {f.cnpj && <p className="text-xs text-gray-400 mt-0.5">CNPJ: {f.cnpj}</p>}
                    {f.endereco && <p className="text-xs text-gray-400">{f.endereco}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{f.telefone ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {f._count.usuarios}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-pink-50 text-pink-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {f._count.ordens}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggle.mutate(f.id)} className="inline-flex items-center gap-1 text-xs font-medium">
                      {f.ativo
                        ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600">Ativa</span></>
                        : <><ToggleLeft  className="w-5 h-5 text-gray-400" /><span className="text-gray-400">Inativa</span></>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => abrirEditar(f)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal titulo={editando ? 'Editar filial' : 'Nova filial'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Nome *</label>
              <input className="input" placeholder="Ex: Unidade Centro" value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CNPJ</label>
                <input className="input" placeholder="00.000.000/0001-00" value={form.cnpj}
                  onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" placeholder="(11) 99999-9999" value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Endereço</label>
              <input className="input" placeholder="Rua, número, bairro" value={form.endereco}
                onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <div className="flex gap-3 pt-1">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary flex-1 justify-center" disabled={salvar.isPending} onClick={handleSubmit}>
                {salvar.isPending ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar filial'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
