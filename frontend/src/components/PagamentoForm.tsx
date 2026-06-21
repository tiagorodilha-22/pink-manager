import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Info } from 'lucide-react'
import { api } from '../lib/api'

interface Props {
  osId: string
  onSuccess?: () => void
}

const METODOS = [
  { value: 'PIX',            label: 'PIX',            icone: '⚡', adquirente: false },
  { value: 'CARTAO_CREDITO', label: 'Crédito',        icone: '💳', adquirente: true  },
  { value: 'CARTAO_DEBITO',  label: 'Débito',         icone: '💳', adquirente: true  },
  { value: 'DINHEIRO',       label: 'Dinheiro',       icone: '💵', adquirente: false },
  { value: 'TRANSFERENCIA',  label: 'Transferência',  icone: '🏦', adquirente: false },
]

export default function PagamentoForm({ osId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [metodo, setMetodo] = useState('PIX')
  const [adquirente, setAdquirente] = useState('REDE')
  const [nsu, setNsu] = useState('')
  const [valor, setValor] = useState('')
  const [parcelas, setParcelas] = useState(1)
  const [mostrarNsuHelp, setMostrarNsuHelp] = useState(false)

  const metodoAtual = METODOS.find(m => m.value === metodo)!
  const exigeAdquirente = metodoAtual.adquirente
  const exibeNsu = exigeAdquirente
  const exibeParcelas = metodo === 'CARTAO_CREDITO'

  const registrar = useMutation({
    mutationFn: () =>
      api.post('/pagamentos', {
        osId,
        metodo,
        adquirente: exigeAdquirente ? adquirente : undefined,
        nsu: nsu.trim() || undefined,
        valor: parseFloat(valor),
        qtdParcelas: parcelas,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['os', osId] })
      qc.invalidateQueries({ queryKey: ['conciliacao-dashboard'] })
      setValor('')
      setNsu('')
      setParcelas(1)
      onSuccess?.()
    },
  })

  return (
    <div className="space-y-4">
      {/* Método */}
      <div>
        <label className="label">Forma de pagamento</label>
        <div className="grid grid-cols-5 gap-2">
          {METODOS.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => { setMetodo(m.value); setParcelas(1) }}
              className={`border rounded-lg py-2.5 text-center transition-colors ${
                metodo === m.value
                  ? 'border-pink-400 bg-pink-50 text-pink-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <div className="text-lg mb-0.5">{m.icone}</div>
              <div className="text-xs font-medium">{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Adquirente */}
      {exigeAdquirente && (
        <div>
          <label className="label">Maquininha</label>
          <div className="flex gap-2">
            {['REDE', 'STONE', 'CIELO', 'PAGSEGURO', 'OUTROS'].map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setAdquirente(a)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  adquirente === a
                    ? 'border-pink-400 bg-pink-50 text-pink-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {a === 'REDE' ? '🟠 Rede' : a === 'STONE' ? '🟢 Stone' : a}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Valor */}
        <div>
          <label className="label">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="input"
            placeholder="0,00"
            value={valor}
            onChange={e => setValor(e.target.value)}
          />
        </div>

        {/* Parcelas */}
        {exibeParcelas && (
          <div>
            <label className="label">Parcelas</label>
            <select className="input" value={parcelas} onChange={e => setParcelas(Number(e.target.value))}>
              {[1,2,3,4,5,6].map(n => (
                <option key={n} value={n}>{n === 1 ? '1x (à vista)' : `${n}x sem juros`}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* NSU */}
      {exibeNsu && (
        <div>
          <label className="label flex items-center gap-1.5">
            NSU do comprovante
            <button
              type="button"
              onClick={() => setMostrarNsuHelp(!mostrarNsuHelp)}
              className="text-gray-400 hover:text-gray-600"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            <span className="text-gray-400 font-normal">(pode preencher depois)</span>
          </label>

          {mostrarNsuHelp && (
            <div className="mb-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
              O NSU é o número de 9 dígitos impresso no comprovante da maquininha, após <strong>NSU:</strong> ou <strong>Doc:</strong>.
              É essencial para a conciliação automática com o relatório da {adquirente}.
              <div className="mt-1.5 font-mono bg-blue-100 rounded px-2 py-1 text-blue-800">
                COMPROVANTE REDE · Crédito 3x<br />
                <span className="text-yellow-700 font-bold">NSU: 123456789</span> · AUT: 087432
              </div>
            </div>
          )}

          <input
            type="text"
            inputMode="numeric"
            className="input font-mono"
            placeholder="123456789"
            maxLength={12}
            value={nsu}
            onChange={e => setNsu(e.target.value.replace(/\D/g, ''))}
          />
        </div>
      )}

      {registrar.isError && (
        <p className="text-xs text-red-600">Erro ao registrar pagamento. Verifique os campos.</p>
      )}

      <button
        type="button"
        disabled={!valor || parseFloat(valor) <= 0 || registrar.isPending}
        onClick={() => registrar.mutate()}
        className="btn-primary w-full justify-center py-2.5"
      >
        <CreditCard className="w-4 h-4" />
        {registrar.isPending ? 'Registrando…' : 'Registrar pagamento'}
      </button>
    </div>
  )
}
