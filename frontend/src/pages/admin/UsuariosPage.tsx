import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield, Edit2, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react'
import { api } from '../../lib/api'
import { getUsuarioAtual } from '../../lib/auth'
import Modal from '../../components/Modal'

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: string
  filialId: string | null
  ativo: boolean
  createdAt: string
}

interface Filial { id: string; nome: string; ativo: boolean }

const PERFIS = [
  { value: 'ADMIN',      label: 'Administrador', cor: 'bg-pink-100 text-pink-700' },
  { value: 'RECEPCAO',   label: 'Recepção',       cor: 'bg-blue-100 text-blue-700' },
  { value: 'TECNICO',    label: 'Técnico',         cor: 'bg-orange-100 text-orange-700' },
  { value: 'FINANCEIRO', label: 'Financeiro',      cor: 'bg-green-100 text-green-700' },
]

const perfilLabel = (v: string) => PERFIS.find(p => p.value === v)?.label ?? v
const perfilCor   = (v: string) => PERFIS.find(p => p.value === v)?.cor ?? 'bg-gray-100 text-gray-600'

function UsuarioForm({ inicial, onSuccess, onCancel }: {
  inicial?: Usuario
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const [nome,     setNome]     = useState(inicial?.nome ?? '')
  const [email,    setEmail]    = useState(inicial?.email ?? '')
  const [perfil,   setPerfil]   = useState(inicial?.perfil ?? 'RECEPCAO')
  const [filialId, setFilialId] = useState<string | null>(inicial?.filialId ?? null)
  const [senha,    setSenha]    = useState('')
  const [erro,     setErro]     = useState('')

  const { data: filiais = [] } = useQuery<Filial[]>({
    queryKey: ['filiais'],
    queryFn:  () => api.get('/filiais').then(r => r.data),
  })

  const salvar = useMutation({
    mutationFn: () => {
      if (inicial) return api.put(`/usuarios/${inicial.id}`, { nome, perfil, filialId })
      return api.post('/usuarios', { nome, email, perfil, senha })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); onSuccess() },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      setErro(e?.response?.data?.error ?? 'Erro ao salvar.'),
  })

  const valido = inicial ? !!nome : !!(nome && email && senha.length >= 6)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nome *</label>
          <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do usuário" />
        </div>
        {!inicial && (
          <div className="col-span-2">
            <label className="label">E-mail *</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@oficina.com" />
          </div>
        )}
        <div className="col-span-2">
          <label className="label">Perfil de acesso *</label>
          <div className="grid grid-cols-2 gap-2">
            {PERFIS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPerfil(p.value)}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors ${
                  perfil === p.value ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className={`badge text-xs mr-2 ${p.cor}`}>{p.label}</span>
                <span className="text-xs text-gray-400">{
                  p.value === 'ADMIN' ? 'Acesso total' :
                  p.value === 'RECEPCAO' ? 'OS + Clientes' :
                  p.value === 'TECNICO' ? 'OS + Agendamentos' :
                  'Financeiro'
                }</span>
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className="label">Filial</label>
          <select
            className="input"
            value={filialId ?? ''}
            onChange={e => setFilialId(e.target.value || null)}
          >
            <option value="">Sem filial (acesso a todas)</option>
            {filiais.filter(f => f.ativo).map(f => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>
        {!inicial && (
          <div className="col-span-2">
            <label className="label">Senha inicial * (mín. 6 caracteres)</label>
            <input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••" />
          </div>
        )}
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-3 pt-1">
        <button className="btn-primary flex-1 justify-center" disabled={!valido || salvar.isPending} onClick={() => salvar.mutate()}>
          {salvar.isPending ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Criar usuário'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

function ResetSenhaForm({ usuario, onSuccess, onCancel }: { usuario: Usuario; onSuccess: () => void; onCancel: () => void }) {
  const qc = useQueryClient()
  const [senha, setSenha] = useState('')
  const [erro,  setErro]  = useState('')

  const salvar = useMutation({
    mutationFn: () => api.patch(`/usuarios/${usuario.id}/senha`, { senha }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); onSuccess() },
    onError: () => setErro('Erro ao redefinir senha.'),
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Redefinir senha de <strong>{usuario.nome}</strong></p>
      <div>
        <label className="label">Nova senha (mín. 6 caracteres)</label>
        <input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••" />
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-3 pt-1">
        <button className="btn-primary flex-1 justify-center" disabled={senha.length < 6 || salvar.isPending} onClick={() => salvar.mutate()}>
          {salvar.isPending ? 'Salvando…' : 'Redefinir senha'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  const qc = useQueryClient()
  const atual = getUsuarioAtual()
  const [showForm,       setShowForm]       = useState(false)
  const [editando,       setEditando]       = useState<Usuario | null>(null)
  const [resetandoSenha, setResetandoSenha] = useState<Usuario | null>(null)

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
  })

  const toggleAtivo = useMutation({
    mutationFn: (id: string) => api.patch(`/usuarios/${id}/toggle-ativo`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  const isAdmin = atual?.perfil === 'ADMIN'

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-pink-600" />
          <h1 className="text-xl font-bold text-gray-900">Gestão de Usuários</h1>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Novo usuário
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="card p-4 mb-4 bg-yellow-50 border-yellow-200 text-sm text-yellow-700">
          Apenas administradores podem criar ou editar usuários.
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Usuário', 'E-mail', 'Perfil', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>}
            {usuarios.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.ativo ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-pink-700 font-semibold text-xs">{u.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.nome}</p>
                      {u.id === atual?.id && <span className="text-xs text-pink-500">você</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${perfilCor(u.perfil)}`}>{perfilLabel(u.perfil)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isAdmin && u.id !== atual?.id && (
                    <div className="flex items-center gap-1 justify-end">
                      <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" title="Editar" onClick={() => setEditando(u)}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" title="Redefinir senha" onClick={() => setResetandoSenha(u)}>
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        className={`p-1.5 rounded-lg transition-colors ${u.ativo ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={u.ativo ? 'Desativar' : 'Ativar'}
                        onClick={() => toggleAtivo.mutate(u.id)}
                      >
                        {u.ativo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal titulo="Novo usuário" onClose={() => setShowForm(false)}>
          <UsuarioForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
      {editando && (
        <Modal titulo="Editar usuário" onClose={() => setEditando(null)}>
          <UsuarioForm inicial={editando} onSuccess={() => setEditando(null)} onCancel={() => setEditando(null)} />
        </Modal>
      )}
      {resetandoSenha && (
        <Modal titulo="Redefinir senha" largura="sm" onClose={() => setResetandoSenha(null)}>
          <ResetSenhaForm usuario={resetandoSenha} onSuccess={() => setResetandoSenha(null)} onCancel={() => setResetandoSenha(null)} />
        </Modal>
      )}
    </div>
  )
}
