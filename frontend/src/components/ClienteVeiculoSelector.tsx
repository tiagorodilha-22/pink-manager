import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, User, Car, ChevronDown } from 'lucide-react'
import { api } from '../lib/api'

interface Cliente { id: string; nome: string; telefone: string; cpfCnpj?: string }
interface Veiculo { id: string; placa: string; marca: string; modelo: string; ano: number; cor?: string }

interface Props {
  onSelect: (clienteId: string, veiculoId: string, clienteNome: string, veiculoDesc: string) => void
}

export default function ClienteVeiculoSelector({ onSelect }: Props) {
  const [busca, setBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | null>(null)
  const [etapa, setEtapa] = useState<'cliente' | 'veiculo'>('cliente')

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-busca', busca],
    queryFn: () => api.get(`/clientes${busca.length > 1 ? `?q=${busca}` : ''}`).then(r => r.data),
    enabled: busca.length > 1 || busca === '',
  })

  const { data: veiculos = [] } = useQuery({
    queryKey: ['veiculos-cliente', clienteSelecionado?.id],
    queryFn: () => api.get(`/veiculos?clienteId=${clienteSelecionado!.id}`).then(r => r.data),
    enabled: !!clienteSelecionado,
  })

  function selecionarCliente(c: Cliente) {
    setClienteSelecionado(c)
    setVeiculoSelecionado(null)
    setEtapa('veiculo')
    setBusca('')
  }

  function selecionarVeiculo(v: Veiculo) {
    setVeiculoSelecionado(v)
    onSelect(
      clienteSelecionado!.id,
      v.id,
      clienteSelecionado!.nome,
      `${v.marca} ${v.modelo} ${v.ano} · ${v.placa}`,
    )
  }

  function resetar() {
    setClienteSelecionado(null)
    setVeiculoSelecionado(null)
    setEtapa('cliente')
    setBusca('')
  }

  if (veiculoSelecionado && clienteSelecionado) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-3.5 h-3.5 text-green-600" />
            <span className="text-sm font-semibold text-gray-900">{clienteSelecionado.nome}</span>
            <span className="text-xs text-gray-400">{clienteSelecionado.telefone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Car className="w-3.5 h-3.5 text-green-600" />
            <span className="text-sm text-gray-700">
              {veiculoSelecionado.marca} {veiculoSelecionado.modelo} {veiculoSelecionado.ano}
            </span>
            <span className="text-xs font-mono text-gray-500">{veiculoSelecionado.placa}</span>
            {veiculoSelecionado.cor && <span className="text-xs text-gray-400">{veiculoSelecionado.cor}</span>}
          </div>
        </div>
        <button onClick={resetar} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <ChevronDown className="w-3 h-3" /> Alterar
        </button>
      </div>
    )
  }

  return (
    <div>
      {etapa === 'cliente' && (
        <div>
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Buscar cliente pelo nome…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              autoFocus
            />
          </div>
          {clientes.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {clientes.map((c: Cliente) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selecionarCliente(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-pink-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                >
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                    <p className="text-xs text-gray-400">{c.telefone}{c.cpfCnpj ? ` · ${c.cpfCnpj}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {busca.length > 1 && clientes.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-3">Nenhum cliente encontrado</p>
          )}
        </div>
      )}

      {etapa === 'veiculo' && clienteSelecionado && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <User className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-semibold text-gray-900">{clienteSelecionado.nome}</span>
            <button onClick={resetar} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">
              Trocar cliente
            </button>
          </div>
          {veiculos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-xl">
              Nenhum veículo cadastrado para este cliente
            </p>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {veiculos.map((v: Veiculo) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selecionarVeiculo(v)}
                  className="w-full text-left px-4 py-3 hover:bg-pink-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                >
                  <Car className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{v.marca} {v.modelo} {v.ano}</p>
                    <p className="text-xs text-gray-400 font-mono">{v.placa}{v.cor ? ` · ${v.cor}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
