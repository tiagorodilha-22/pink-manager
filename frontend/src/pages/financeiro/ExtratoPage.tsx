import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText } from 'lucide-react'
import { useRef, useState } from 'react'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

type Origem = 'ofx' | 'rede' | 'stone'

const ORIGENS: { key: Origem; label: string; desc: string; ext: string }[] = [
  { key: 'ofx',   label: 'Inter (OFX)',  desc: 'Extrato bancário exportado do app ou internet banking', ext: '.ofx' },
  { key: 'rede',  label: 'Rede (CSV)',   desc: 'Relatório de vendas do portal Meu Posto Rede',          ext: '.csv' },
  { key: 'stone', label: 'Stone (CSV)',  desc: 'Relatório de transações do portal Stone',               ext: '.csv' },
]

export default function ExtratoPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [origemSelecionada, setOrigemSelecionada] = useState<Origem>('ofx')
  const [resultado, setResultado] = useState<{ novos: number; duplicados: number; total: number } | null>(null)

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['extrato'],
    queryFn: () => api.get('/extrato').then(r => r.data),
  })

  const importar = useMutation({
    mutationFn: async (conteudo: string) => {
      const endpoint = origemSelecionada === 'ofx' ? '/extrato/importar/ofx'
        : origemSelecionada === 'rede' ? '/extrato/importar/rede'
        : '/extrato/importar/stone'
      return api.post(endpoint, { conteudo }).then(r => r.data)
    },
    onSuccess: (data) => {
      setResultado(data)
      qc.invalidateQueries({ queryKey: ['extrato'] })
    },
  })

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => importar.mutate(ev.target?.result as string)
    reader.readAsText(file, 'latin1')
    e.target.value = ''
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Extrato Bancário</h1>
      <p className="text-sm text-gray-500 mb-6">Importe extratos do Inter, Rede e Stone para alimentar a conciliação</p>

      {/* Importação */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Importar arquivo</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {ORIGENS.map(o => (
            <button
              key={o.key}
              onClick={() => setOrigemSelecionada(o.key)}
              className={`border rounded-xl p-4 text-left transition-colors ${
                origemSelecionada === o.key
                  ? 'border-pink-400 bg-pink-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <p className="font-semibold text-sm text-gray-900">{o.label}</p>
              <p className="text-xs text-gray-500 mt-1">{o.desc}</p>
              <p className="text-xs font-mono text-gray-400 mt-2">{o.ext}</p>
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" className="hidden" accept=".ofx,.csv,.txt" onChange={handleArquivo} />
        <button
          className="btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={importar.isPending}
        >
          <Upload className="w-4 h-4" />
          {importar.isPending ? 'Importando…' : `Selecionar arquivo ${ORIGENS.find(o => o.key === origemSelecionada)?.label}`}
        </button>

        {resultado && (
          <div className="mt-3 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-700">
            ✓ {resultado.novos} novos lançamentos importados · {resultado.duplicados} duplicatas ignoradas
          </div>
        )}
        {importar.isError && (
          <div className="mt-3 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700">
            Erro ao importar. Verifique se o arquivo está no formato correto.
          </div>
        )}
      </div>

      {/* Lançamentos */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-sm text-gray-800">Lançamentos importados</span>
          <span className="ml-auto text-xs text-gray-400">{lancamentos.length} registros</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Data', 'Descrição', 'Origem', 'NSU', 'Valor', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!lancamentos.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum lançamento importado ainda</td></tr>
            )}
            {lancamentos.map((l: Record<string, unknown>) => (
              <tr key={l.id as string} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-600">{dayjs(l.data as string).format('DD/MM/YYYY')}</td>
                <td className="px-4 py-2.5 text-gray-900 max-w-xs truncate">{l.descricao as string}</td>
                <td className="px-4 py-2.5">
                  <span className="badge bg-gray-100 text-gray-600">{l.origem as string}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{(l.nsuRef as string) ?? '—'}</td>
                <td className="px-4 py-2.5 font-semibold text-green-700">
                  +{Number(l.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${l.conciliado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {l.conciliado ? 'Conciliado' : 'Pendente'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
