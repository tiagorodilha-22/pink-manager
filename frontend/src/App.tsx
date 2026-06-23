import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isAutenticado } from './lib/auth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AgendamentosPage from './pages/AgendamentosPage'
import OSListPage from './pages/OSListPage'
import OSDetailPage from './pages/OSDetailPage'
import NovaOSPage from './pages/NovaOSPage'
import ClientesPage from './pages/ClientesPage'
import FornecedoresPage from './pages/FornecedoresPage'
import UsuariosPage from './pages/admin/UsuariosPage'
import ConciliacaoPage from './pages/financeiro/ConciliacaoPage'
import ExtratoPage from './pages/financeiro/ExtratoPage'
import CaixaPage from './pages/financeiro/CaixaPage'
import RecebiveisPage from './pages/financeiro/RecebiveisPage'
import ContasPagarPage from './pages/financeiro/ContasPagarPage'
import RelatoriosPage from './pages/financeiro/RelatoriosPage'
import InventarioPage from './pages/InventarioPage'
import NotasFiscaisPage from './pages/NotasFiscaisPage'
import AvaliacoesPage from './pages/AvaliacoesPage'
import AvaliacaoPublicaPage from './pages/AvaliacaoPublicaPage'
import AgendamentoPublicoPage from './pages/AgendamentoPublicoPage'
import PortalClientePage from './pages/PortalClientePage'
import RoadmapPage from './pages/RoadmapPage'
import ServicosPage from './pages/ServicosPage'
import FiliaisPage   from './pages/admin/FiliaisPage'
import TecnicosPage  from './pages/admin/TecnicosPage'

function RotaPrivada({ children }: { children: React.ReactNode }) {
  return isAutenticado() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/avaliar/:token" element={<AvaliacaoPublicaPage />} />
        <Route path="/agendar" element={<AgendamentoPublicoPage />} />
        <Route path="/portal/:token" element={<PortalClientePage />} />
        <Route
          path="/"
          element={
            <RotaPrivada>
              <Layout />
            </RotaPrivada>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="agendamentos" element={<AgendamentosPage />} />
          <Route path="os" element={<OSListPage />} />
          <Route path="os/nova" element={<NovaOSPage />} />
          <Route path="os/:id" element={<OSDetailPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="fornecedores" element={<FornecedoresPage />} />
          <Route path="admin/usuarios" element={<UsuariosPage />} />
          <Route path="admin/filiais"   element={<FiliaisPage />} />
          <Route path="admin/tecnicos"  element={<TecnicosPage />} />
          <Route path="financeiro/conciliacao" element={<ConciliacaoPage />} />
          <Route path="financeiro/extrato" element={<ExtratoPage />} />
          <Route path="financeiro/caixa" element={<CaixaPage />} />
          <Route path="financeiro/recebiveis" element={<RecebiveisPage />} />
          <Route path="financeiro/contas-pagar" element={<ContasPagarPage />} />
          <Route path="financeiro/relatorios"   element={<RelatoriosPage />} />
          <Route path="inventario"    element={<InventarioPage />} />
          <Route path="notas-fiscais"  element={<NotasFiscaisPage />} />
          <Route path="avaliacoes"     element={<AvaliacoesPage />} />
          <Route path="servicos"       element={<ServicosPage />} />
          <Route path="roadmap"       element={<RoadmapPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
