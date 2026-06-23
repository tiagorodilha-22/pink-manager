import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Calendar, Clock, CheckCircle, ChevronLeft, Wrench } from 'lucide-react'
import axios from 'axios'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
dayjs.locale('pt-br')

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001' })

interface Config {
  nomeOficina: string
  horarioAbertura: string
  horarioFechamento: string
  intervaloMinutos: number
  servicos: string[]
}
interface Slot { hora: string; disponivel: boolean }

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function gerarProximosDias(n: number): dayjs.Dayjs[] {
  const dias: dayjs.Dayjs[] = []
  let d = dayjs().add(1, 'day')
  while (dias.length < n) {
    if (d.day() !== 0) dias.push(d) // pula domingos
    d = d.add(1, 'day')
  }
  return dias
}

export default function AgendamentoPublicoPage() {
  const [passo,        setPasso]        = useState<1 | 2 | 3 | 'ok'>(1)
  const [servico,      setServico]      = useState('')
  const [dataSel,      setDataSel]      = useState<dayjs.Dayjs | null>(null)
  const [horaSel,      setHoraSel]      = useState('')
  const [nome,         setNome]         = useState('')
  const [telefone,     setTelefone]     = useState('')
  const [observacao,   setObservacao]   = useState('')
  const [erro,         setErro]         = useState('')

  const dias = gerarProximosDias(14)

  const { data: config } = useQuery<Config>({
    queryKey: ['agendar-config'],
    queryFn:  () => api.get('/publico/config').then(r => r.data),
  })

  const { data: slots = [], isFetching: carregandoSlots } = useQuery<Slot[]>({
    queryKey: ['agendar-slots', dataSel?.format('YYYY-MM-DD')],
    queryFn:  () => api.get(`/publico/horarios?data=${dataSel!.format('YYYY-MM-DD')}`).then(r => r.data),
    enabled:  !!dataSel,
  })

  const confirmar = useMutation({
    mutationFn: () => api.post('/publico', {
      nome, telefone, tipoServico: servico,
      dataHora: `${dataSel!.format('YYYY-MM-DD')}T${horaSel}:00`,
      observacao: observacao || undefined,
    }),
    onSuccess: () => setPasso('ok'),
    onError:   () => setErro('Erro ao confirmar. Tente novamente.'),
  })

  function avancar() {
    if (passo === 1) {
      if (!servico)  { setErro('Selecione o tipo de serviço'); return }
      if (!dataSel)  { setErro('Selecione uma data'); return }
      if (!horaSel)  { setErro('Selecione um horário'); return }
      setErro(''); setPasso(2)
    } else if (passo === 2) {
      if (!nome.trim())     { setErro('Informe seu nome'); return }
      if (!telefone.trim()) { setErro('Informe seu telefone'); return }
      setErro(''); confirmar.mutate()
    }
  }

  const nomeLoja = config?.nomeOficina ?? 'Pink Manager'

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="bg-pink-600 text-white px-4 py-5 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-2">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg font-bold">{nomeLoja}</h1>
        <p className="text-pink-200 text-sm mt-0.5">Agendamento online</p>
      </div>

      {/* Indicador de passos */}
      {passo !== 'ok' && (
        <div className="flex items-center justify-center gap-2 py-4 bg-white border-b border-gray-100">
          {[1, 2].map(p => (
            <div key={p} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                passo >= p ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{p}</div>
              {p < 2 && <div className={`w-8 h-0.5 ${passo > p ? 'bg-pink-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="text-xs text-gray-400 ml-2">
            {passo === 1 ? 'Serviço e horário' : 'Seus dados'}
          </span>
        </div>
      )}

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Passo 1: Serviço + Data + Hora */}
        {passo === 1 && (
          <>
            {/* Tipo de serviço */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-pink-500" /> Tipo de serviço
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(config?.servicos ?? []).map(s => (
                  <button
                    key={s}
                    className={`text-sm px-3 py-2.5 rounded-xl text-left border transition-colors ${
                      servico === s
                        ? 'bg-pink-600 text-white border-pink-600 font-medium'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
                    }`}
                    onClick={() => { setServico(s); setErro('') }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Seleção de data */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-500" /> Escolha a data
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dias.map(d => {
                  const sel = dataSel?.format('YYYY-MM-DD') === d.format('YYYY-MM-DD')
                  return (
                    <button
                      key={d.format('YYYY-MM-DD')}
                      className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-sm transition-colors ${
                        sel ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
                      }`}
                      onClick={() => { setDataSel(d); setHoraSel(''); setErro('') }}
                    >
                      <span className={`text-xs ${sel ? 'text-pink-200' : 'text-gray-400'}`}>{DIAS_SEMANA[d.day()]}</span>
                      <span className="font-bold text-base">{d.date()}</span>
                      <span className={`text-xs ${sel ? 'text-pink-200' : 'text-gray-400'}`}>{d.format('MMM')}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Horários */}
            {dataSel && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-pink-500" /> Horários disponíveis
                </p>
                {carregandoSlots ? (
                  <p className="text-sm text-gray-400 text-center py-4">Verificando disponibilidade…</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(s => (
                      <button
                        key={s.hora}
                        disabled={!s.disponivel}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                          !s.disponivel        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' :
                          horaSel === s.hora   ? 'bg-pink-600 text-white border-pink-600' :
                          'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
                        }`}
                        onClick={() => { setHoraSel(s.hora); setErro('') }}
                      >
                        {s.hora}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Passo 2: Dados pessoais */}
        {passo === 2 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <div className="bg-pink-50 rounded-xl p-3 text-sm text-pink-800">
              <p className="font-semibold">{servico}</p>
              <p className="text-pink-600 mt-0.5">
                {dataSel?.format('dddd, D [de] MMMM')} às {horaSel}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Seu nome *</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="Como prefere ser chamado(a)?"
                value={nome}
                onChange={e => { setNome(e.target.value); setErro('') }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Telefone / WhatsApp *</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="(00) 00000-0000"
                type="tel"
                value={telefone}
                onChange={e => { setTelefone(e.target.value); setErro('') }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Observações (opcional)</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-300 resize-none h-20"
                placeholder="Descreva o problema que está sentindo no veículo…"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Confirmação */}
        {passo === 'ok' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Agendamento solicitado!</h2>
            <p className="text-gray-500 text-sm mb-4">
              Aguarde a confirmação da nossa equipe via WhatsApp.
            </p>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-left space-y-1">
              <p><span className="font-medium text-gray-700">Serviço:</span> <span className="text-gray-600">{servico}</span></p>
              <p><span className="font-medium text-gray-700">Data:</span> <span className="text-gray-600">{dataSel?.format('DD/MM/YYYY')} às {horaSel}</span></p>
              <p><span className="font-medium text-gray-700">Nome:</span> <span className="text-gray-600">{nome}</span></p>
            </div>
          </div>
        )}

        {/* Erro */}
        {erro && <p className="text-sm text-red-600 text-center font-medium">{erro}</p>}

        {/* Botões de navegação */}
        {passo !== 'ok' && (
          <div className="flex gap-3 pb-8">
            {passo === 2 && (
              <button
                className="flex items-center gap-1 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                onClick={() => { setPasso(1); setErro('') }}
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            <button
              className="flex-1 bg-pink-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-pink-700 active:scale-95 transition-all disabled:opacity-50"
              disabled={confirmar.isPending}
              onClick={avancar}
            >
              {confirmar.isPending ? 'Confirmando…' : passo === 1 ? 'Continuar →' : 'Confirmar agendamento'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
