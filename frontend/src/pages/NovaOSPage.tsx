import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { api } from '../lib/api'
import ClienteVeiculoSelector from '../components/ClienteVeiculoSelector'

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

  const [veiculoId, setVeiculoId] = useState('')
  const [queixa, setQueixa] = useState('')
  const [dataPrevista, setDataPrevista] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [km, setKm] = useState('')
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST_CAMPOS.map(c => [c.key, true]))
  )
  const [checklistObs, setChecklistObs] = useState<Record<string, string>>({})
  const [selecionado, setSelecionado] = useState<{ clienteNome: string; veiculoDesc: string } | null>(null)

  const criarOS = useMutation({
    mutationFn: () =>
      api.post('/os', {
        veiculoId,
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

        {/* Queixa + Info */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-pink-600 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
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
            <span className="w-5 h-5 bg-pink-600 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
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
