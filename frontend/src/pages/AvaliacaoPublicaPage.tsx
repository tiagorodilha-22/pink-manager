import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Star, CheckCircle2, Wrench } from 'lucide-react'
import { api } from '../lib/api'

interface DadosPublicos {
  respondido: boolean
  nota: number | null
  os: { numero: number; veiculo: string }
}

const LABELS: Record<number, string> = {
  0: 'Péssimo', 1: 'Muito ruim', 2: 'Ruim', 3: 'Ruim', 4: 'Regular',
  5: 'Regular', 6: 'Regular', 7: 'Bom', 8: 'Bom', 9: 'Ótimo', 10: 'Excelente!',
}

const corNota = (n: number) =>
  n >= 9 ? 'bg-green-500' : n >= 7 ? 'bg-yellow-400' : 'bg-red-500'

export default function AvaliacaoPublicaPage() {
  const { token } = useParams<{ token: string }>()
  const [notaSelecionada, setNotaSelecionada] = useState<number | null>(null)
  const [comentario, setComentario]           = useState('')
  const [enviado, setEnviado]                 = useState(false)

  const { data, isLoading, error } = useQuery<DadosPublicos>({
    queryKey: ['avaliacao-publica', token],
    queryFn:  () => api.get(`/avaliacoes/publica/${token}`).then(r => r.data),
    retry: false,
  })

  const enviar = useMutation({
    mutationFn: () => api.post(`/avaliacoes/publica/${token}`, {
      nota: notaSelecionada,
      comentario: comentario || undefined,
    }),
    onSuccess: () => setEnviado(true),
  })

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Carregando…</p>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
      <Wrench className="w-8 h-8 text-gray-300" />
      <p className="text-gray-500 font-medium">Link de avaliação inválido ou expirado.</p>
    </div>
  )

  // Já respondido
  if (data.respondido || enviado) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        <h1 className="text-xl font-bold text-gray-900">Obrigado pelo feedback!</h1>
        <p className="text-sm text-gray-500">Sua avaliação foi registrada e nos ajuda a melhorar cada vez mais.</p>
        {enviado && notaSelecionada !== null && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-lg ${corNota(notaSelecionada)}`}>
            {notaSelecionada} / 10
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
        <div className="w-5 h-5 bg-pink-600 rounded flex items-center justify-center">
          <Wrench className="w-3 h-3 text-white" />
        </div>
        Pink Manager
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Pink Manager</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Como foi o seu atendimento?</h1>
          <p className="text-sm text-gray-400 mt-1">
            OS #{data.os.numero} · {data.os.veiculo}
          </p>
        </div>

        {/* Escala NPS */}
        <div>
          <p className="text-sm text-center text-gray-500 mb-3">
            De 0 a 10, quanto você recomendaria nossos serviços?
          </p>
          <div className="flex gap-1.5 justify-center flex-wrap">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => setNotaSelecionada(i)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all border-2 ${
                  notaSelecionada === i
                    ? `${corNota(i)} text-white border-transparent scale-110 shadow-md`
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-pink-300 hover:bg-pink-50'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
            <span>Não recomendo</span>
            <span>Recomendo muito</span>
          </div>
          {notaSelecionada !== null && (
            <p className={`text-center text-sm font-semibold mt-2 ${
              notaSelecionada >= 9 ? 'text-green-600' : notaSelecionada >= 7 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {LABELS[notaSelecionada]}
            </p>
          )}
        </div>

        {/* Comentário */}
        <div>
          <label className="block text-sm text-gray-500 mb-1.5">
            Quer deixar um comentário? <span className="text-gray-400">(opcional)</span>
          </label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent h-24"
            placeholder="Conte-nos o que achou do serviço…"
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            maxLength={500}
          />
        </div>

        {/* Botão */}
        <button
          className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          disabled={notaSelecionada === null || enviar.isPending}
          onClick={() => enviar.mutate()}
        >
          {enviar.isPending ? 'Enviando…' : 'Enviar avaliação'}
          {notaSelecionada !== null && !enviar.isPending && (
            <span className="ml-2">
              {Array.from({ length: Math.min(notaSelecionada, 5) }, (_, i) => (
                <Star key={i} className="w-3.5 h-3.5 inline fill-current" />
              ))}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
