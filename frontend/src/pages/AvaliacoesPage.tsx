import { useQuery } from '@tanstack/react-query'
import { Star, TrendingUp, Users, ThumbsUp, ThumbsDown, Minus, MessageSquare } from 'lucide-react'
import { api } from '../lib/api'
import dayjs from 'dayjs'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface Avaliacao {
  id: string
  nota: number
  comentario: string | null
  respondidoEm: string
  os: { numero: number; veiculo: { marca: string; modelo: string; placa: string } }
}

interface Resumo {
  nps: number | null
  total: number
  promotores: number
  neutros: number
  detratores: number
  distribuicao: { nota: number; total: number }[]
}

const corBarra = (nota: number) =>
  nota >= 9 ? '#22c55e' : nota >= 7 ? '#eab308' : '#ef4444'

const corNota = (n: number) =>
  n >= 9 ? 'bg-green-100 text-green-700' : n >= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'

const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n}`

export default function AvaliacoesPage() {
  const { data: resumo } = useQuery<Resumo>({
    queryKey: ['avaliacoes-resumo'],
    queryFn:  () => api.get('/avaliacoes/resumo').then(r => r.data),
  })

  const { data: lista } = useQuery<{ avaliacoes: Avaliacao[]; total: number }>({
    queryKey: ['avaliacoes-lista'],
    queryFn:  () => api.get('/avaliacoes').then(r => r.data),
  })

  const nps = resumo?.nps ?? null

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Star className="w-5 h-5 text-pink-600" />
        <h1 className="text-xl font-bold text-gray-900">Avaliações — NPS</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NPS Score */}
        <div className="card p-5 col-span-2 lg:col-span-1 flex flex-col items-center justify-center gap-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">NPS</p>
          {nps === null ? (
            <p className="text-3xl font-black text-gray-300">—</p>
          ) : (
            <p className={`text-4xl font-black ${nps >= 50 ? 'text-green-600' : nps >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>
              {fmt(nps)}
            </p>
          )}
          <p className="text-xs text-gray-400">
            {nps === null ? 'Sem dados' : nps >= 75 ? 'Excelente' : nps >= 50 ? 'Muito bom' : nps >= 0 ? 'Razoável' : 'Crítico'}
          </p>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{resumo?.total ?? 0}</p>
            <p className="text-xs text-gray-400">Respostas</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ThumbsUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{resumo?.promotores ?? 0}</p>
            <p className="text-xs text-gray-400">Promotores (9–10)</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ThumbsDown className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{resumo?.detratores ?? 0}</p>
            <p className="text-xs text-gray-400">Detratores (0–6)</p>
          </div>
        </div>
      </div>

      {/* Gráfico distribuição */}
      {resumo && resumo.total > 0 && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Distribuição das notas</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={resumo.distribuicao} barSize={28}>
              <XAxis dataKey="nota" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [v, 'respostas']} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {resumo.distribuicao.map(d => (
                  <Cell key={d.nota} fill={corBarra(d.nota)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 justify-center text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Detratores (0–6)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Neutros (7–8)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Promotores (9–10)</span>
          </div>
        </div>
      )}

      {/* Barra de composição */}
      {resumo && resumo.total > 0 && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Composição</p>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            {resumo.promotores > 0 && (
              <div className="bg-green-500 transition-all" style={{ width: `${(resumo.promotores / resumo.total) * 100}%` }} />
            )}
            {resumo.neutros > 0 && (
              <div className="bg-yellow-400 transition-all" style={{ width: `${(resumo.neutros / resumo.total) * 100}%` }} />
            )}
            {resumo.detratores > 0 && (
              <div className="bg-red-400 transition-all" style={{ width: `${(resumo.detratores / resumo.total) * 100}%` }} />
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className="text-green-600 font-medium">{Math.round((resumo.promotores / resumo.total) * 100)}% promotores</span>
            <span className="text-yellow-600">{Math.round((resumo.neutros / resumo.total) * 100)}% neutros</span>
            <span className="text-red-500 font-medium">{Math.round((resumo.detratores / resumo.total) * 100)}% detratores</span>
          </div>
        </div>
      )}

      {/* Lista de avaliações */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="font-semibold text-gray-800 text-sm">Avaliações recentes</p>
          <span className="text-xs text-gray-400">{lista?.total ?? 0} respostas</span>
        </div>

        {!lista?.avaliacoes.length ? (
          <div className="py-12 text-center">
            <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma avaliação recebida ainda.</p>
            <p className="text-xs text-gray-300 mt-1">Envie o link de avaliação nas OS concluídas.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {lista.avaliacoes.map(av => (
              <div key={av.id} className="px-5 py-4 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${corNota(av.nota)}`}>
                  {av.nota}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">OS #{av.os.numero}</span>
                    <span className="text-xs text-gray-400">{av.os.veiculo.marca} {av.os.veiculo.modelo} — {av.os.veiculo.placa}</span>
                    <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                      {dayjs(av.respondidoEm).format('DD/MM/YYYY HH:mm')}
                    </span>
                  </div>
                  {av.comentario && (
                    <p className="text-sm text-gray-600 mt-1 italic">"{av.comentario}"</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    {av.nota >= 9
                      ? <><ThumbsUp className="w-3 h-3 text-green-500" /><span className="text-xs text-green-600">Promotor</span></>
                      : av.nota >= 7
                      ? <><Minus className="w-3 h-3 text-yellow-500" /><span className="text-xs text-yellow-600">Neutro</span></>
                      : <><ThumbsDown className="w-3 h-3 text-red-500" /><span className="text-xs text-red-600">Detrator</span></>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fórmula */}
      <div className="bg-gray-50 rounded-xl px-5 py-4 text-xs text-gray-400 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
        <span>NPS = % Promotores (9–10) − % Detratores (0–6). Neutros (7–8) não entram no cálculo.</span>
      </div>
    </div>
  )
}
