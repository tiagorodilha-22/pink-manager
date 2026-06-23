import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HardHat, Plus, ToggleLeft, ToggleRight, Edit2 } from 'lucide-react'
import { api } from '../../lib/api'
import Modal from '../../components/Modal'

interface Tecnico {
  id: string; nome: string; matricula: string | null
  cargo: string; telefone: string | null; ativo: boolean
}

const CARGOS = [
  { value: 'MECANICO',     label: 'Mecânico' },
  { value: 'ELETRICISTA',  label: 'Eletricista' },
  { value: 'FUNILEIRO',    label: 'Funileiro' },
  { value: 'PINTOR',       label: 'Pintor' },
  { value: 'AUXILIAR',     label: 'Auxiliar' },
  { value: 'GERENTE',      label: 'Gerente' },
]

const CARGO_LABEL: Record<string, string> = Object.fromEntries(CARGOS.map(c => [c.value, c.label]))
const CARGO_COR: Record<string, string> = {
  MECANICO:    'bg-blue-100 text-blue-700',
  ELETRICISTA: 'bg-yellow-100 text-yellow-700',
  FUNILEIRO:   'bg-orange-100 text-orange-700',
  PINTOR:      'bg-purple-100 text-purple-700',
  AUXILIAR:    'bg-gray-100 text-gray-600',
  GERENTE:     'bg-pink-100 text-pink-700',
}

interface Form { nome: string; matricula: string; cargo: string; telefone: string }
const FORM_VAZIO: Form = { nome: '', matricula: '', cargo: 'MECANICO', telefone: '' }

export default function TecnicosPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ aberto: boolean; tecnico: Tecnico | null }>({ aberto: false, tecnico: null })
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [erro, setErro] = useState('')

  const { data: tecnicos = [] } = useQuery<Tecnico[]>({
    queryKey: ['tecnicos-todos'],
    queryFn: () => api.get('/tecnicos/todos').then(r => r.data),
  })

  const salvar = useMutation({
    mutationFn: () => modal.tecnico
      ? api.patch(`/tecnicos/${modal.tecnico.id}`, form)
      : api.post('/tecnicos', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tecnicos-todos'] })
      qc.invalidateQueries({ queryKey: ['tecnicos'] })
      fechar()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErro(msg ?? 'Erro ao salvar.')
    },
  })

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/tecnicos/${id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tecnicos-todos'] })
      qc.invalidateQueries({ queryKey: ['tecnicos'] })
    },
  })

  function abrir(tecnico?: Tecnico) {
    setErro('')
    if (tecnico) {
      setForm({ nome: tecnico.nome, matricula: tecnico.matricula ?? '', cargo: tecnico.cargo, telefone: tecnico.telefone ?? '' })
      setModal({ aberto: true, tecnico })
    } else {
      setForm(FORM_VAZIO)
      setModal({ aberto: true, tecnico: null })
    }
  }

  function fechar() { setModal({ aberto: false, tecnico: null }); setErro('') }
  function set(f: Partial<Form>) { setForm(prev => ({ ...prev, ...f })) }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center">
            <HardHat className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Técnicos</h1>
            <p className="text-sm text-gray-500">Cadastro da equipe técnica</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => abrir()}>
          <Plus className="w-4 h-4" /> Novo técnico
        </button>
      </div>

      <div className="card overflow-hidden">
        {tecnicos.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Nenhum técnico cadastrado ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nome', 'Matrícula', 'Cargo', 'Telefone', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tecnicos.map(t => (
                <tr key={t.id} className={t.ativo ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.nome}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.matricula ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${CARGO_COR[t.cargo] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CARGO_LABEL[t.cargo] ?? t.cargo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.telefone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${t.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {t.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button className="btn-ghost py-1 px-2 text-xs" onClick={() => abrir(t)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="btn-ghost py-1 px-2 text-xs"
                        onClick={() => toggle.mutate(t.id)}
                        title={t.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {t.ativo
                          ? <ToggleRight className="w-4 h-4 text-green-600" />
                          : <ToggleLeft  className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal.aberto && (
        <Modal titulo={modal.tecnico ? 'Editar técnico' : 'Novo técnico'} onClose={fechar} largura="sm">
          <div className="space-y-3">
            <div>
              <label className="label">Nome <span className="text-red-500">*</span></label>
              <input className="input" placeholder="Nome completo" value={form.nome} onChange={e => set({ nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Matrícula</label>
                <input className="input" placeholder="Ex: TEC-001" value={form.matricula} onChange={e => set({ matricula: e.target.value })} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" placeholder="(11) 99999-9999" value={form.telefone} onChange={e => set({ telefone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Cargo</label>
              <select className="input" value={form.cargo} onChange={e => set({ cargo: e.target.value })}>
                {CARGOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            <div className="flex gap-2 pt-1">
              <button className="btn-primary flex-1 justify-center" disabled={!form.nome.trim() || salvar.isPending} onClick={() => salvar.mutate()}>
                {salvar.isPending ? 'Salvando…' : 'Salvar'}
              </button>
              <button className="btn-secondary" onClick={fechar}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
