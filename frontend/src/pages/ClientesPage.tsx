import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'

export default function ClientesPage() {
  const [busca, setBusca] = useState('')
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', busca],
    queryFn: () => api.get(`/clientes${busca ? `?q=${busca}` : ''}`).then(r => r.data),
  })

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-5 h-5 text-pink-600" />
        <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
      </div>
      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
        <input className="input pl-9" placeholder="Buscar por nome…" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Nome', 'Telefone', 'Email', 'Veículos'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>}
            {!isLoading && !clientes.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhum cliente encontrado</td></tr>
            )}
            {clientes.map((c: Record<string, unknown>) => (
              <tr key={c.id as string} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.nome as string}</td>
                <td className="px-4 py-3 text-gray-600">{c.telefone as string}</td>
                <td className="px-4 py-3 text-gray-500">{(c.email as string) ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{(c.veiculos as unknown[])?.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
