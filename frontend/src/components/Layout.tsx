import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, ClipboardList, Users,
  CreditCard, FileText, Wallet, TrendingUp, TrendingDown,
  LogOut, Wrench, Store, Shield, Package, Map, BarChart2, Receipt, Star, Tag, Building2, HardHat,
} from 'lucide-react'
import { logout, getUsuarioAtual } from '../lib/auth'
import { clsx } from 'clsx'

type NavItem = { to: string; icon: React.ElementType; label: string; perfis?: string[] }

const navPrincipal: NavItem[] = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agendamentos', icon: Calendar,         label: 'Agendamentos' },
  { to: '/os',           icon: ClipboardList,    label: 'Ordens de Serviço' },
  { to: '/clientes',     icon: Users,            label: 'Clientes',           perfis: ['ADMIN', 'RECEPCAO'] },
  { to: '/fornecedores', icon: Store,            label: 'Fornecedores',       perfis: ['ADMIN', 'RECEPCAO', 'FINANCEIRO'] },
  { to: '/servicos',      icon: Tag,      label: 'Serviços',      perfis: ['ADMIN', 'RECEPCAO'] },
  { to: '/inventario',    icon: Package,  label: 'Inventário',    perfis: ['ADMIN', 'RECEPCAO', 'TECNICO', 'FINANCEIRO'] },
  { to: '/notas-fiscais', icon: Receipt,  label: 'Notas Fiscais', perfis: ['ADMIN', 'RECEPCAO', 'FINANCEIRO'] },
  { to: '/avaliacoes',    icon: Star,     label: 'Avaliações',    perfis: ['ADMIN', 'FINANCEIRO'] },
]

const navFinanceiro: NavItem[] = [
  { to: '/financeiro/conciliacao',  icon: CreditCard,   label: 'Conciliação' },
  { to: '/financeiro/extrato',      icon: FileText,     label: 'Extrato' },
  { to: '/financeiro/caixa',        icon: Wallet,       label: 'Caixa' },
  { to: '/financeiro/recebiveis',   icon: TrendingUp,   label: 'A Receber' },
  { to: '/financeiro/contas-pagar', icon: TrendingDown, label: 'Contas a Pagar' },
  { to: '/financeiro/relatorios',   icon: BarChart2,   label: 'Relatórios' },
]

const navAdmin: NavItem[] = [
  { to: '/admin/usuarios', icon: Shield,    label: 'Usuários',  perfis: ['ADMIN'] },
  { to: '/admin/filiais',  icon: Building2, label: 'Filiais',   perfis: ['ADMIN'] },
  { to: '/admin/tecnicos', icon: HardHat,   label: 'Técnicos',  perfis: ['ADMIN'] },
  { to: '/roadmap',        icon: Map,       label: 'Roadmap',   perfis: ['ADMIN'] },
]

const FINANCEIRO_PERFIS = ['ADMIN', 'FINANCEIRO']
const TECNICO_BLOCK_OP  = ['TECNICO']

export default function Layout() {
  const navigate = useNavigate()
  const usuario = getUsuarioAtual()
  const perfil = usuario?.perfil ?? ''

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function podeVer(item: NavItem) {
    if (!item.perfis) return true
    return item.perfis.includes(perfil)
  }

  const mostrarFinanceiro = FINANCEIRO_PERFIS.includes(perfil)
  const opVisivel = navPrincipal.filter(podeVer).filter(i => !TECNICO_BLOCK_OP.includes(perfil) || i.to !== '/clientes')

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base">Pink Manager</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Operação</p>
          {opVisivel.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-pink-50 text-pink-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {mostrarFinanceiro && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mt-5 mb-2">Financeiro</p>
              {navFinanceiro.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'bg-pink-50 text-pink-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </>
          )}

          {perfil === 'ADMIN' && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mt-5 mb-2">Administração</p>
              {navAdmin.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'bg-pink-50 text-pink-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-pink-700 font-semibold text-xs">
                {usuario?.nome?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{usuario?.nome}</p>
              <p className="text-xs text-gray-400 truncate">
                {usuario?.filialNome
                  ? <span className="text-pink-500 font-medium">{usuario.filialNome}</span>
                  : usuario?.perfil}
              </p>
            </div>
            <button onClick={handleLogout} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
