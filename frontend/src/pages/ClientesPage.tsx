import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Users, Plus, Car, Edit2, Trash2, ChevronDown, ChevronUp, Crown } from 'lucide-react'
import { api } from '../lib/api'
import Modal from '../components/Modal'
import ManutencaoVeiculo from '../components/ManutencaoVeiculo'

interface Veiculo {
  id: string
  placa: string
  marca: string
  modelo: string
  ano: number
  cor?: string
  km?: number
}

interface Cliente {
  id: string
  nome: string
  cpfCnpj?: string
  telefone: string
  email?: string
  genero?: string
  veiculos?: Veiculo[]
}

// ─── Formulário de Cliente (wizard 2 etapas para novo cadastro) ──────────────

function ClienteForm({ inicial, onSuccess, onCancel }: {
  inicial?: Cliente
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()

  // Etapa 1 — dados do cliente
  const [nome,     setNome]     = useState(inicial?.nome ?? '')
  const [cpfCnpj,  setCpfCnpj]  = useState(inicial?.cpfCnpj ?? '')
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '')
  const [email,    setEmail]    = useState(inicial?.email ?? '')
  const [genero,   setGenero]   = useState(inicial?.genero ?? '')
  const [erro,     setErro]     = useState('')

  // Wizard (só para novo cliente)
  const [step,        setStep]        = useState<'cliente' | 'veiculo'>('cliente')
  const [clienteId,   setClienteId]   = useState<string | null>(inicial?.id ?? null)

  const salvarCliente = useMutation({
    mutationFn: () => {
      const body = { nome, cpfCnpj: cpfCnpj || undefined, telefone, email: email || undefined, genero: genero || undefined }
      return inicial
        ? api.put(`/clientes/${inicial.id}`, body)
        : api.post('/clientes', body)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      if (inicial) {
        qc.invalidateQueries({ queryKey: ['cliente', inicial.id] })
        onSuccess()
      } else {
        setClienteId(res.data.id)
        setStep('veiculo')
      }
    },
    onError: () => setErro('Erro ao salvar. Verifique os campos.'),
  })

  // Etapa 2 — veículo (reutiliza VeiculoForm)
  if (step === 'veiculo' && clienteId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm mb-1">
          <span className="flex items-center gap-1.5 font-medium text-green-600">
            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center">✓</span>
            Cliente
          </span>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="flex items-center gap-1.5 font-medium text-pink-600">
            <span className="w-5 h-5 rounded-full bg-pink-600 text-white text-xs flex items-center justify-center">2</span>
            Veículo
          </span>
        </div>
        <p className="text-sm text-gray-500">Cliente cadastrado! Adicione o veículo agora ou pule para fazer depois.</p>
        <VeiculoForm
          clienteId={clienteId}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['clientes'] }); onSuccess() }}
          onCancel={() => { qc.invalidateQueries({ queryKey: ['clientes'] }); onSuccess() }}
          cancelLabel="Pular"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!inicial && (
        <div className="flex items-center gap-2 text-sm mb-1">
          <span className="flex items-center gap-1.5 font-medium text-pink-600">
            <span className="w-5 h-5 rounded-full bg-pink-600 text-white text-xs flex items-center justify-center">1</span>
            Cliente
          </span>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="flex items-center gap-1.5 font-medium text-gray-400">
            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs flex items-center justify-center">2</span>
            Veículo
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nome *</label>
          <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
        </div>
        <div>
          <label className="label">CPF / CNPJ</label>
          <input className="input" value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="000.000.000-00" />
        </div>
        <div>
          <label className="label">Telefone *</label>
          <input className="input" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
        </div>
        <div className="col-span-2">
          <label className="label">E-mail</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" />
        </div>
        <div className="col-span-2">
          <label className="label">Gênero</label>
          <div className="flex gap-3">
            {[
              { value: '',  label: 'Não informado' },
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Feminino', crown: true },
            ].map(op => (
              <button
                key={op.value}
                type="button"
                onClick={() => setGenero(op.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  genero === op.value
                    ? op.crown ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-400 bg-gray-100 text-gray-800'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {op.crown && <Crown className="w-3.5 h-3.5 text-pink-500" />}
                {op.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex gap-3 pt-1">
        <button
          className="btn-primary flex-1 justify-center"
          disabled={!nome || !telefone || salvarCliente.isPending}
          onClick={() => salvarCliente.mutate()}
        >
          {salvarCliente.isPending ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Próximo: Veículo →'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

// ─── Formulário de Veículo ───────────────────────────────────────────────────

function VeiculoForm({ clienteId, inicial, onSuccess, onCancel, cancelLabel = 'Cancelar' }: {
  clienteId: string
  inicial?: Veiculo
  onSuccess: () => void
  onCancel: () => void
  cancelLabel?: string
}) {
  const qc = useQueryClient()
  const [placa, setPlaca] = useState(inicial?.placa ?? '')
  const [marca, setMarca] = useState(inicial?.marca ?? '')
  const [modelo, setModelo] = useState(inicial?.modelo ?? '')
  const [ano, setAno] = useState(String(inicial?.ano ?? new Date().getFullYear()))
  const [cor, setCor] = useState(inicial?.cor ?? '')
  const [km, setKm] = useState(String(inicial?.km ?? ''))
  const [erro, setErro] = useState('')

  const salvar = useMutation({
    mutationFn: () => {
      const body = {
        clienteId,
        placa: placa.toUpperCase().replace(/\s/g, ''),
        marca,
        modelo,
        ano: parseInt(ano),
        cor: cor || undefined,
        km: km ? parseInt(km) : undefined,
      }
      return inicial
        ? api.put(`/veiculos/${inicial.id}`, body)
        : api.post('/veiculos', body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['clientes'] })
      onSuccess()
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err?.response?.data?.message ?? ''
      setErro(msg.includes('placa') || msg.includes('Unique') ? 'Esta placa já está cadastrada.' : 'Erro ao salvar veículo.')
    },
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Placa *</label>
          <input
            className="input font-mono uppercase"
            value={placa}
            onChange={e => setPlaca(e.target.value.toUpperCase())}
            placeholder="ABC1D23"
            maxLength={8}
            disabled={!!inicial}
          />
        </div>
        <div>
          <label className="label">Ano *</label>
          <input className="input" type="number" value={ano} onChange={e => setAno(e.target.value)} min={1950} max={2026} />
        </div>
        <div>
          <label className="label">Marca *</label>
          <input className="input" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Honda" />
        </div>
        <div>
          <label className="label">Modelo *</label>
          <input className="input" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Civic" />
        </div>
        <div>
          <label className="label">Cor</label>
          <input className="input" value={cor} onChange={e => setCor(e.target.value)} placeholder="Prata" />
        </div>
        <div>
          <label className="label">KM atual</label>
          <input className="input" type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="0" min={0} />
        </div>
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex gap-3 pt-1">
        <button
          className="btn-primary flex-1 justify-center"
          disabled={!placa || !marca || !modelo || !ano || salvar.isPending}
          onClick={() => salvar.mutate()}
        >
          {salvar.isPending ? 'Salvando…' : inicial ? 'Salvar veículo' : 'Cadastrar veículo'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
      </div>
    </div>
  )
}

// ─── Modal de detalhe do cliente ─────────────────────────────────────────────

function ClienteDetalheModal({ clienteId, onClose }: { clienteId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [modo, setModo] = useState<'view' | 'edit-cliente' | 'novo-veiculo' | 'edit-veiculo'>('view')
  const [veiculoEditando,  setVeiculoEditando]  = useState<Veiculo | null>(null)
  const [veiculoExpandido, setVeiculoExpandido] = useState<string | null>(null)

  const { data: cliente, isLoading } = useQuery<Cliente>({
    queryKey: ['cliente', clienteId],
    queryFn: () => api.get(`/clientes/${clienteId}`).then(r => r.data),
  })

  const excluirCliente = useMutation({
    mutationFn: () => api.delete(`/clientes/${clienteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      onClose()
    },
  })

  if (isLoading || !cliente) {
    return (
      <Modal titulo="Detalhes do cliente" onClose={onClose}>
        <p className="text-sm text-gray-400 text-center py-4">Carregando…</p>
      </Modal>
    )
  }

  if (modo === 'edit-cliente') {
    return (
      <Modal titulo="Editar cliente" onClose={onClose}>
        <ClienteForm
          inicial={cliente}
          onSuccess={() => setModo('view')}
          onCancel={() => setModo('view')}
        />
      </Modal>
    )
  }

  if (modo === 'novo-veiculo') {
    return (
      <Modal titulo="Novo veículo" onClose={onClose}>
        <VeiculoForm
          clienteId={clienteId}
          onSuccess={() => setModo('view')}
          onCancel={() => setModo('view')}
        />
      </Modal>
    )
  }

  if (modo === 'edit-veiculo' && veiculoEditando) {
    return (
      <Modal titulo="Editar veículo" onClose={onClose}>
        <VeiculoForm
          clienteId={clienteId}
          inicial={veiculoEditando}
          onSuccess={() => { setModo('view'); setVeiculoEditando(null) }}
          onCancel={() => { setModo('view'); setVeiculoEditando(null) }}
        />
      </Modal>
    )
  }

  const tituloModal = (
    <span className="flex items-center gap-2">
      {cliente.nome}
      {cliente.genero === 'F' && <Crown className="w-4 h-4 text-pink-400" />}
    </span>
  )

  return (
    <Modal titulo={tituloModal as unknown as string} onClose={onClose} largura="lg">
      {/* Info do cliente */}
      <div className="card p-4 mb-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {cliente.cpfCnpj && <p className="text-sm text-gray-600"><span className="text-gray-400 text-xs">CPF/CNPJ</span> {cliente.cpfCnpj}</p>}
            <p className="text-sm text-gray-800"><span className="text-gray-400 text-xs mr-1">Tel.</span>{cliente.telefone}</p>
            {cliente.email && <p className="text-sm text-gray-500">{cliente.email}</p>}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs py-1.5" onClick={() => setModo('edit-cliente')}>
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
            <button
              className="btn-secondary text-xs py-1.5 text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => {
                if (confirm(`Excluir ${cliente.nome}? Esta ação não pode ser desfeita.`))
                  excluirCliente.mutate()
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Veículos */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <Car className="w-4 h-4 text-gray-400" /> Veículos ({cliente.veiculos?.length ?? 0})
        </h3>
        <button className="btn-primary text-xs py-1.5" onClick={() => setModo('novo-veiculo')}>
          <Plus className="w-3.5 h-3.5" /> Novo veículo
        </button>
      </div>

      {!cliente.veiculos?.length ? (
        <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          <Car className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum veículo cadastrado</p>
          <button className="text-pink-600 text-sm mt-1 hover:underline" onClick={() => setModo('novo-veiculo')}>
            Cadastrar primeiro veículo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {cliente.veiculos.map(v => {
            const expandido = veiculoExpandido === v.id
            return (
              <div key={v.id} className="card overflow-hidden">
                <div
                  className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setVeiculoExpandido(expandido ? null : v.id)}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Car className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{v.marca} {v.modelo} <span className="text-gray-400 font-normal">{v.ano}</span></p>
                    <p className="text-xs text-gray-400 font-mono">{v.placa}{v.cor ? ` · ${v.cor}` : ''}{v.km ? ` · ${v.km.toLocaleString('pt-BR')} km` : ''}</p>
                  </div>
                  <button
                    className="btn-ghost text-xs py-1 px-2"
                    onClick={e => { e.stopPropagation(); setVeiculoEditando(v); setModo('edit-veiculo') }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {expandido
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </div>
                {expandido && (
                  <div className="border-t border-gray-100 p-4">
                    <ManutencaoVeiculo veiculoId={v.id} kmAtual={v.km} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [busca, setBusca] = useState('')
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null)

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', busca],
    queryFn: () => api.get(`/clientes${busca ? `?q=${busca}` : ''}`).then(r => r.data),
  })

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-pink-600" />
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <span className="text-sm text-gray-400">({clientes.length})</span>
        </div>
        <button className="btn-primary" onClick={() => setShowNovoCliente(true)}>
          <Plus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por nome…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Nome', 'Telefone', 'Email', 'Veículos', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>
            )}
            {!isLoading && !clientes.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Nenhum cliente encontrado</p>
                  {busca && <p className="text-gray-300 text-xs mt-1">Tente remover os filtros</p>}
                </td>
              </tr>
            )}
            {clientes.map((c: Cliente) => (
              <tr
                key={c.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setClienteSelecionadoId(c.id)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  <span className="flex items-center gap-1.5">
                    {c.nome}
                    {c.genero === 'F' && <Crown className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.telefone}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{c.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Car className="w-3.5 h-3.5" />
                    {(c.veiculos as Veiculo[] | undefined)?.length ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs text-pink-500 font-medium hover:text-pink-700">Ver detalhes →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Cliente */}
      {showNovoCliente && (
        <Modal titulo="Novo cliente" onClose={() => setShowNovoCliente(false)}>
          <ClienteForm
            onSuccess={() => setShowNovoCliente(false)}
            onCancel={() => setShowNovoCliente(false)}
          />
        </Modal>
      )}

      {/* Modal Detalhe Cliente */}
      {clienteSelecionadoId && (
        <ClienteDetalheModal
          clienteId={clienteSelecionadoId}
          onClose={() => setClienteSelecionadoId(null)}
        />
      )}
    </div>
  )
}
