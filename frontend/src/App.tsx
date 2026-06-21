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
import ConciliacaoPage from './pages/financeiro/ConciliacaoPage'
import ExtratoPage from './pages/financeiro/ExtratoPage'
import CaixaPage from './pages/financeiro/CaixaPage'
import RecebiveisPage from './pages/financeiro/RecebiveisPage'

function RotaPrivada({ children }: { children: React.ReactNode }) {
  return isAutenticado() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
          <Route path="financeiro/conciliacao" element={<ConciliacaoPage />} />
          <Route path="financeiro/extrato" element={<ExtratoPage />} />
          <Route path="financeiro/caixa" element={<CaixaPage />} />
          <Route path="financeiro/recebiveis" element={<RecebiveisPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
