import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, ChevronDown, Crown, UserPlus, Car } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'
import dayjs from 'dayjs'

const STATUS_COR: Record<string, string> = {
  PENDENTE:     'bg-gray-100 text-gray-600',
  CONFIRMADO:   'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDO:    'bg-green-100 text-green-700',
  CANCELADO:    'bg-red-100 text-red-600',
}

const TIPOS_SERVICO = [
  'Troca de óleo e filtros',
  'Revisão geral',
  'Alinhamento e balanceamento',
  'Freios',
  'Suspensão',
  'Elétrica',
  'Ar condicionado',
  'Diagnóstico',
  'Funilaria e pintura',
  'Outros',
]

interface Cliente { id: string; nome: string; telefone: string }
interface Veiculo { id: string; placa: string; marca: string; modelo: string; ano: number }

function NovoAgendamentoForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const [clienteId,   setClienteId]   = useState('')
  const [veiculoId,   setVeiculoId]   = useState('')
  const [dataHora,    setDataHora]    = useState(dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:00'))
  const [tipoServico, setTipoServico] = useState('')
  const [tipoCustom,  setTipoCustom]  = useState('')
  const [queixa,      setQueixa]      = useState('')
  const [erro,        setErro]        = useState('')

  // Novo cliente inline
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [novoClienteTel,  setNovoClienteTel]  = useState('')
  const [erroCliente,     setErroCliente]     = useState('')

  // Novo veículo inline
  const [showNovoVeiculo,   setShowNovoVeiculo]   = useState(false)
  const [fipeMarcaCod,      setFipeMarcaCod]      = useState('')
  const [novoVeiculoMarca,  setNovoVeiculoMarca]  = useState('')
  const [fipeModeloCod,     setFipeModeloCod]     = useState('')
  const [novoVeiculoModelo, setNovoVeiculoModelo] = useState('')
  const [novoVeiculoAno,    setNovoVeiculoAno]    = useState(String(new Date().getFullYear()))
  const [novoVeiculoPlaca,  setNovoVeiculoPlaca]  = useState('')
  const [erroVeiculo,       setErroVeiculo]       = useState('')

  const ANOS = Array.from(
    { length: new Date().getFullYear() + 2 - 1960 },
    (_, i) => String(new Date().getFullYear() + 1 - i)
  )

  interface FipeMarca  { code: string; name: string }
  interface FipeModelo { code: string; name: string }

  const { data: fipeMarcas = [], isLoading: carregandoMarcas } = useQuery<FipeMarca[]>({
    queryKey: ['fipe-marcas'],
    queryFn:  () => fetch('https://parallelum.com.br/fipe/api/v2/cars/brands').then(r => r.json()),
    staleTime: Infinity,
    enabled:   showNovoVeiculo,
  })

  const { data: fipeModelos = [], isLoading: carregandoModelos } = useQuery<FipeModelo[]>({
    queryKey: ['fipe-modelos', fipeMarcaCod],
    queryFn:  async () => {
      const r = await fetch(`https://parallelum.com.br/fipe/api/v2/cars/brands/${fipeMarcaCod}/models`)
      if (!r.ok) throw new Error(`FIPE models ${r.status}`)
      const d = await r.json()
      return Array.isArray(d) ? d : (d.models ?? [])
    },
    staleTime: Infinity,
    enabled:   !!fipeMarcaCod,
  })

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes-select'],
    queryFn:  () => api.get('/clientes').then(r => r.data),
  })

  const { data: veiculos = [] } = useQuery<Veiculo[]>({
    queryKey: ['veiculos-select', clienteId],
    queryFn:  () => api.get(`/veiculos?clienteId=${clienteId}`).then(r => r.data),
    enabled:  !!clienteId,
  })

  const criarCliente = useMutation({
    mutationFn: () => api.post('/clientes', { nome: novoClienteNome.trim(), telefone: novoClienteTel.trim() }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['clientes-select'] })
      setClienteId(res.data.id)
      setVeiculoId('')
      setShowNovoCliente(false)
      setNovoClienteNome('')
      setNovoClienteTel('')
      setErroCliente('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErroCliente(msg ?? 'Erro ao criar cliente.')
    },
  })

  const criarVeiculo = useMutation({
    mutationFn: () => api.post('/veiculos', {
      clienteId,
      marca:  novoVeiculoMarca.trim(),
      modelo: novoVeiculoModelo.trim(),
      ano:    Number(novoVeiculoAno),
      placa:  novoVeiculoPlaca.trim().toUpperCase(),
    }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['veiculos-select', clienteId] })
      setVeiculoId(res.data.id)
      setShowNovoVeiculo(false)
      setFipeMarcaCod('')
      setNovoVeiculoMarca('')
      setFipeModeloCod('')
      setNovoVeiculoModelo('')
      setNovoVeiculoAno(String(new Date().getFullYear()))
      setNovoVeiculoPlaca('')
      setErroVeiculo('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErroVeiculo(msg ?? 'Erro ao criar veículo.')
    },
  })

  function salvarNovoCliente() {
    if (!novoClienteNome.trim()) { setErroCliente('Informe o nome'); return }
    if (!novoClienteTel.trim())  { setErroCliente('Informe o telefone'); return }
    setErroCliente('')
    criarCliente.mutate()
  }

  function salvarNovoVeiculo() {
    if (!novoVeiculoMarca.trim())  { setErroVeiculo('Informe a marca'); return }
    if (!novoVeiculoModelo.trim()) { setErroVeiculo('Informe o modelo'); return }
    if (!novoVeiculoPlaca.trim())  { setErroVeiculo('Informe a placa'); return }
    setErroVeiculo('')
    criarVeiculo.mutate()
  }

  const salvar = useMutation({
    mutationFn: () => api.post('/agendamentos', {
      clienteId,
      veiculoId,
      dataHora: new Date(dataHora).toISOString(),
      tipoServico: tipoServico === 'Outros' ? (tipoCustom || 'Outros') : tipoServico,
      queixa: queixa || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agendamentos'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErro(msg ?? 'Erro ao salvar. Verifique os campos.')
    },
  })

  function handleSubmit() {
    if (!clienteId)   { setErro('Selecione um cliente'); return }
    if (!veiculoId)   { setErro('Selecione um veículo'); return }
    if (!tipoServico) { setErro('Informe o tipo de serviço'); return }
    setErro('')
    salvar.mutate()
  }

  return (
    <div className="space-y-4">
      {/* Cliente */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Cliente *</label>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 font-medium"
            onClick={() => { setShowNovoCliente(v => !v); setErroCliente('') }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {showNovoCliente ? 'Cancelar' : 'Novo cliente'}
          </button>
        </div>

        {showNovoCliente ? (
          <div className="border border-pink-200 rounded-xl p-3 bg-pink-50/50 space-y-2">
            <p className="text-xs font-semibold text-pink-700">Criar novo cliente</p>
            <input
              className="input text-sm"
              placeholder="Nome completo * (mín. 2 caracteres)"
              value={novoClienteNome}
              onChange={e => setNovoClienteNome(e.target.value)}
            />
            <input
              className="input text-sm"
              placeholder="Telefone * (mín. 8 dígitos)"
              value={novoClienteTel}
              onChange={e => setNovoClienteTel(e.target.value)}
            />
            {erroCliente && <p className="text-xs text-red-600">{erroCliente}</p>}
            <button
              type="button"
              className="btn-primary text-sm w-full justify-center"
              disabled={criarCliente.isPending}
              onClick={salvarNovoCliente}
            >
              {criarCliente.isPending ? 'Criando…' : 'Criar e selecionar'}
            </button>
          </div>
        ) : (
          <div className="relative">
            <select
              className="input appearance-none pr-8"
              value={clienteId}
              onChange={e => { setClienteId(e.target.value); setVeiculoId(''); setShowNovoVeiculo(false) }}
            >
              <option value="">Selecione o cliente…</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome} — {c.telefone}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Veículo */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Veículo *</label>
          {clienteId && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 font-medium"
              onClick={() => { setShowNovoVeiculo(v => !v); setErroVeiculo('') }}
            >
              <Car className="w-3.5 h-3.5" />
              {showNovoVeiculo ? 'Cancelar' : 'Novo veículo'}
            </button>
          )}
        </div>

        {showNovoVeiculo ? (
          <div className="border border-pink-200 rounded-xl p-3 bg-pink-50/50 space-y-2">
            <p className="text-xs font-semibold text-pink-700">Criar novo veículo</p>

            {/* Marca */}
            <div className="relative">
              <select
                className="input text-sm appearance-none pr-8"
                value={fipeMarcaCod}
                onChange={e => {
                  const cod  = e.target.value
                  const nome = fipeMarcas.find(m => m.code === cod)?.name ?? ''
                  setFipeMarcaCod(cod)
                  setNovoVeiculoMarca(nome)
                  setFipeModeloCod('')
                  setNovoVeiculoModelo('')
                }}
              >
                <option value="">{carregandoMarcas ? 'Carregando marcas…' : 'Marca *'}</option>
                {fipeMarcas.map(m => (
                  <option key={m.code} value={m.code}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Modelo */}
            <div className="relative">
              <select
                className="input text-sm appearance-none pr-8"
                value={fipeModeloCod}
                disabled={!fipeMarcaCod}
                onChange={e => {
                  const cod  = e.target.value
                  const nome = fipeModelos.find(m => m.code === cod)?.name ?? ''
                  setFipeModeloCod(cod)
                  setNovoVeiculoModelo(nome)
                }}
              >
                <option value="">
                  {!fipeMarcaCod ? 'Primeiro selecione a marca' : carregandoModelos ? 'Carregando modelos…' : 'Modelo *'}
                </option>
                {fipeModelos.map(m => (
                  <option key={m.code} value={m.code}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Ano e Placa */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  className="input text-sm appearance-none pr-8"
                  value={novoVeiculoAno}
                  onChange={e => setNovoVeiculoAno(e.target.value)}
                >
                  {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
              </div>
              <input
                className="input text-sm uppercase"
                placeholder="Placa *"
                value={novoVeiculoPlaca}
                onChange={e => setNovoVeiculoPlaca(e.target.value.toUpperCase())}
              />
            </div>
            {erroVeiculo && <p className="text-xs text-red-600">{erroVeiculo}</p>}
            <button
              type="button"
              className="btn-primary text-sm w-full justify-center"
              disabled={criarVeiculo.isPending}
              onClick={salvarNovoVeiculo}
            >
              {criarVeiculo.isPending ? 'Criando…' : 'Criar e selecionar'}
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <select
                className="input appearance-none pr-8"
                value={veiculoId}
                onChange={e => setVeiculoId(e.target.value)}
                disabled={!clienteId}
              >
                <option value="">{clienteId ? 'Selecione o veículo…' : 'Primeiro selecione o cliente'}</option>
                {veiculos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} {v.ano} — {v.placa}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
            </div>
            {clienteId && veiculos.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Nenhum veículo cadastrado. Use <strong>"Novo veículo"</strong> acima para adicionar.
              </p>
            )}
          </>
        )}
      </div>

      {/* Data e hora */}
      <div>
        <label className="label">Data e hora *</label>
        <input
          type="datetime-local"
          className="input"
          value={dataHora}
          onChange={e => setDataHora(e.target.value)}
        />
      </div>

      {/* Tipo de serviço */}
      <div>
        <label className="label">Tipo de serviço *</label>
        <div className="relative">
          <select
            className="input appearance-none pr-8"
            value={tipoServico}
            onChange={e => setTipoServico(e.target.value)}
          >
            <option value="">Selecione…</option>
            {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
        </div>
        {tipoServico === 'Outros' && (
          <input
            className="input mt-2"
            placeholder="Descreva o serviço…"
            value={tipoCustom}
            onChange={e => setTipoCustom(e.target.value)}
          />
        )}
      </div>

      {/* Queixa */}
      <div>
        <label className="label">Queixa / observação</label>
        <textarea
          className="input resize-none h-20"
          placeholder="Descreva o problema relatado pelo cliente…"
          value={queixa}
          onChange={e => setQueixa(e.target.value)}
        />
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex gap-3 pt-1">
        <button
          className="btn-primary flex-1 justify-center"
          disabled={salvar.isPending}
          onClick={handleSubmit}
        >
          {salvar.isPending ? 'Salvando…' : 'Agendar'}
        </button>
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  )
}

export default function AgendamentosPage() {
  const qc = useQueryClient()
  const [data, setData] = useState(dayjs().format('YYYY-MM-DD'))
  const [showNovo, setShowNovo] = useState(false)

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos', data],
    queryFn: () => api.get(`/agendamentos?data=${data}`).then(r => r.data),
  })

  const atualizar = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/agendamentos/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agendamentos'] }),
  })

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-pink-600" />
          <h1 className="text-xl font-bold text-gray-900">Agendamentos</h1>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" className="input w-auto" value={data} onChange={e => setData(e.target.value)} />
          <button className="btn-primary" onClick={() => setShowNovo(true)}>
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Hora', 'Cliente', 'Veículo', 'Placa', 'Serviço', 'Status', 'Ação'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>}
            {!isLoading && !agendamentos.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Nenhum agendamento para este dia</p>
                  <button className="text-pink-500 text-sm mt-1 hover:underline" onClick={() => setShowNovo(true)}>
                    Criar agendamento
                  </button>
                </td>
              </tr>
            )}
            {agendamentos.map((a: Record<string, unknown>) => {
              const cliente = a.cliente as Record<string, string>
              const veiculo = a.veiculo as Record<string, string> | null
              return (
                <tr key={a.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500">{dayjs(a.dataHora as string).format('HH:mm')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <span className="flex items-center gap-1.5">
                      {cliente.nome}
                      {cliente.genero === 'F' && <Crown className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{veiculo ? `${veiculo.marca} ${veiculo.modelo}` : <span className="text-gray-400 italic">Não informado</span>}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{veiculo?.placa ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{a.tipoServico as string}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COR[a.status as string] ?? ''}`}>
                      {(a.status as string).replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'PENDENTE' && (
                      <button
                        className="text-xs text-pink-600 hover:text-pink-800 font-medium"
                        onClick={() => atualizar.mutate({ id: a.id as string, status: 'CONFIRMADO' })}
                      >
                        Confirmar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showNovo && (
        <Modal titulo="Novo agendamento" onClose={() => setShowNovo(false)}>
          <NovoAgendamentoForm onClose={() => setShowNovo(false)} />
        </Modal>
      )}
    </div>
  )
}
