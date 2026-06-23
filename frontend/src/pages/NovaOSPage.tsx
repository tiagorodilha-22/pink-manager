import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ClipboardList, ChevronDown, Plus } from 'lucide-react'
import { api } from '../lib/api'
import ClienteVeiculoSelector from '../components/ClienteVeiculoSelector'

interface Servico {
  id: string; nome: string; descricao: string | null
  duracaoHoras: number; precoBase: number; precoHora: number
}

const CHECKLIST_CAMPOS = [
  { key: 'para_choque_dianteiro', label: 'Para-choque dianteiro' },
  { key: 'para_choque_traseiro',  label: 'Para-choque traseiro' },
  { key: 'farois',                label: 'Faróis' },
  { key: 'lanternas',             label: 'Lanternas' },
  { key: 'retrovisores',          label: 'Retrovisores' },
  { key: 'vidros',                label: 'Vidros' },
  { key: 'rodas_pneus',           label: 'Rodas e pneus' },
  { key: 'lataria',               label: 'Lataria (amassados/arranhões)' },
  { key: 'interior',              label: 'Interior / estofamento' },
  { key: 'documentos',            label: 'Documentos no veículo' },
  { key: 'estepe',                label: 'Estepe' },
  { key: 'macaco_chave_roda',     label: 'Macaco e chave de roda' },
]

export default function NovaOSPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [veiculoId,  setVeiculoId]  = useState('')
  const [servicoId,  setServicoId]  = useState('')

  // Novo serviço inline
  const [showNovoServico,     setShowNovoServico]     = useState(false)
  const [novoServicoNome,     setNovoServicoNome]     = useState('')
  const [novoServicoDuracao,  setNovoServicoDuracao]  = useState('1')
  const [novoServicoBase,     setNovoServicoBase]     = useState('0')
  const [novoServicoHora,     setNovoServicoHora]     = useState('0')
  const [erroServico,         setErroServico]         = useState('')
  const [queixa, setQueixa] = useState('')
  const [dataPrevista, setDataPrevista] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [km, setKm] = useState('')
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST_CAMPOS.map(c => [c.key, true]))
  )
  const [checklistObs, setChecklistObs] = useState<Record<string, string>>({})
  const [selecionado, setSelecionado] = useState<{ clienteNome: string; veiculoDesc: string } | null>(null)

  const { data: servicos = [] } = useQuery<Servico[]>({
    queryKey: ['servicos'],
    queryFn:  () => api.get('/servicos').then(r => r.data),
  })

  function selecionarServico(id: string) {
    setServicoId(id)
    const s = servicos.find(x => x.id === id)
    if (s && !queixa) setQueixa(s.nome)
  }

  const criarServico = useMutation({
    mutationFn: () => api.post('/servicos', {
      nome:         novoServicoNome.trim(),
      duracaoHoras: Number(novoServicoDuracao),
      precoBase:    Number(novoServicoBase),
      precoHora:    Number(novoServicoHora),
    }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['servicos'] })
      selecionarServico(res.data.id)
      setShowNovoServico(false)
      setNovoServicoNome('')
      setNovoServicoDuracao('1')
      setNovoServicoBase('0')
      setNovoServicoHora('0')
      setErroServico('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErroServico(msg ?? 'Erro ao criar serviço.')
    },
  })

  function fmt(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const criarOS = useMutation({
    mutationFn: () =>
      api.post('/os', {
        veiculoId,
        servicoId: servicoId || undefined,
        queixa,
        dataPrevista: dataPrevista ? new Date(dataPrevista).toISOString() : undefined,
        observacoes,
      }).then(r => r.data),
    onSuccess: async (os) => {
      // Salvar checklist
      const itens = CHECKLIST_CAMPOS.map(c => ({
        campo: c.label,
        valor: checklist[c.key],
        obs: checklistObs[c.key] || undefined,
      }))
      await api.put(`/os/${os.id}/checklist`, { itens })
      navigate(`/os/${os.id}`)
    },
  })

  const podeSubmeter = veiculoId && queixa.trim().length > 0

  return (
    <div className="p-6 max-w-3xl">
      <button className="btn-ghost mb-4 -ml-2" onClick={() => navigate('/os')}>
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-center gap-2 mb-6">
        <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-pink-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nova Ordem de Serviço</h1>
          <p className="text-sm text-gray-500">Recepção do veículo e abertura da OS</p>
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); criarOS.mutate() }} className="space-y-6">

        {/* Cliente + Veículo */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-pink-600 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
            Cliente e Veículo
          </h2>
          <ClienteVeiculoSelector
            onSelect={(cId, vId, clienteNome, veiculoDesc) => {
              setVeiculoId(vId)
              setSelecionado({ clienteNome, veiculoDesc })
              void cId
            }}
          />
        </div>

        {/* Tipo de Serviço */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-5 h-5 bg-pink-600 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
              Tipo de serviço
              <span className="text-xs font-normal text-gray-400">opcional</span>
            </h2>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 font-medium"
              onClick={() => { setShowNovoServico(v => !v); setErroServico('') }}
            >
              <Plus className="w-3.5 h-3.5" />
              {showNovoServico ? 'Cancelar' : 'Novo serviço'}
            </button>
          </div>

          {showNovoServico ? (
            <div className="border border-pink-200 rounded-xl p-3 bg-pink-50/50 space-y-3">
              <p className="text-xs font-semibold text-pink-700">Criar novo serviço</p>
              <input
                className="input text-sm"
                placeholder="Nome do serviço *"
                value={novoServicoNome}
                onChange={e => setNovoServicoNome(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duração (h)</label>
                  <input className="input text-sm" type="number" min="0.25" step="0.25"
                    value={novoServicoDuracao} onChange={e => setNovoServicoDuracao(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Preço base (R$)</label>
                  <input className="input text-sm" type="number" min="0" step="0.01"
                    value={novoServicoBase} onChange={e => setNovoServicoBase(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Hora/Homem (R$/h)</label>
                  <input className="input text-sm" type="number" min="0" step="0.01"
                    value={novoServicoHora} onChange={e => setNovoServicoHora(e.target.value)} />
                </div>
              </div>
              {erroServico && <p className="text-xs text-red-600">{erroServico}</p>}
              <button
                type="button"
                className="btn-primary text-sm w-full justify-center"
                disabled={criarServico.isPending || !novoServicoNome.trim()}
                onClick={() => {
                  if (!novoServicoNome.trim()) { setErroServico('Informe o nome'); return }
                  setErroServico('')
                  criarServico.mutate()
                }}
              >
                {criarServico.isPending ? 'Criando…' : 'Criar e selecionar'}
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <select
                  className="input appearance-none pr-8"
                  value={servicoId}
                  onChange={e => selecionarServico(e.target.value)}
                >
                  <option value="">Selecionar da tabela de serviços…</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
              </div>
              {servicoId && (() => {
                const s = servicos.find(x => x.id === servicoId)
                if (!s) return null
                const total = s.precoBase + s.precoHora * s.duracaoHoras
                return (
                  <div className="mt-3 bg-pink-50 rounded-xl p-3 text-sm flex items-center gap-4 flex-wrap">
                    <span className="text-gray-600">Duração: <strong>{s.duracaoHoras}h</strong></span>
                    <span className="text-gray-600">Base: <strong>{fmt(s.precoBase)}</strong></span>
                    <span className="text-gray-600">H/H: <strong>{fmt(s.precoHora)}/h</strong></span>
                    <span className="text-pink-700 font-semibold ml-auto">Total: {fmt(total)}</span>
                  </div>
                )
              })()}
            </>
          )}
        </div>

        {/* Queixa + Info */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-pink-600 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
            Queixa e informações
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Queixa do cliente <span className="text-red-500">*</span></label>
              <textarea
                className="input min-h-24 resize-none"
                placeholder="Descreva o que o cliente relatou…"
                value={queixa}
                onChange={e => setQueixa(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prazo previsto de entrega</label>
                <input type="datetime-local" className="input" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} />
              </div>
              <div>
                <label className="label">KM atual do veículo</label>
                <input type="number" className="input" placeholder="Ex: 45000" value={km} onChange={e => setKm(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Observações internas</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Anotações internas (não vai para o cliente)…"
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <span className="w-5 h-5 bg-pink-600 text-white rounded-full text-xs flex items-center justify-center font-bold">4</span>
            Checklist de entrada
          </h2>
          <p className="text-xs text-gray-400 mb-4 ml-7">Marque os itens que estão em bom estado. Desmarque os que apresentam problemas.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CHECKLIST_CAMPOS.map(c => (
              <div key={c.key} className={`rounded-lg border px-3 py-2.5 transition-colors ${checklist[c.key] ? 'border-gray-200 bg-gray-50' : 'border-orange-200 bg-orange-50'}`}>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist[c.key]}
                    onChange={e => setChecklist(prev => ({ ...prev, [c.key]: e.target.checked }))}
                    className="w-4 h-4 accent-pink-600"
                  />
                  <span className="text-sm text-gray-800">{c.label}</span>
                </label>
                {!checklist[c.key] && (
                  <input
                    className="mt-1.5 w-full text-xs border-none bg-transparent outline-none text-orange-700 placeholder-orange-300 focus:outline-none"
                    placeholder="Descreva o problema…"
                    value={checklistObs[c.key] ?? ''}
                    onChange={e => setChecklistObs(prev => ({ ...prev, [c.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pb-6">
          <button
            type="submit"
            disabled={!podeSubmeter || criarOS.isPending}
            className="btn-primary px-8 py-2.5"
          >
            {criarOS.isPending ? 'Abrindo OS…' : 'Abrir Ordem de Serviço'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/os')}>
            Cancelar
          </button>
          {!podeSubmeter && (
            <p className="text-xs text-gray-400">
              {!veiculoId ? 'Selecione o cliente e veículo' : 'Informe a queixa do cliente'}
            </p>
          )}
        </div>

        {criarOS.isError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            Erro ao criar OS. Verifique os dados e tente novamente.
          </div>
        )}
      </form>
    </div>
  )
}
