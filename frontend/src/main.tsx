import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate, useParams } from "react-router-dom";

import './index.css'
import Login from './pages/Login'
import ResetarSenha from './pages/ResetarSenha'
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios'
import Movimentacoes from './pages/Movimentacoes';
import Layout from './pages/Layout';
import TitulosReceber from './pages/TitulosReceber';
import TitulosPagar from './pages/TitulosPagar';
import Receitas from './pages/Receitas';
import Custos from './pages/Custos';
import ConfiguracaoBancaria from './pages/ConfiguracaoBancaria';
import RemessasCNAB from './pages/RemessasCNAB';
import Clientes from './pages/Clientes';
import Aeronaves from './pages/Aeronaves';
import Fornecedores from './pages/Fornecedores';
import ContaFixa from './pages/ContaFixa';
import Voos from './pages/Voos';
import VooFormPage from './pages/VooFormPage'
import UsuarioPerfilPage from './pages/UsuarioPerfilPage'
import Relatorios from './pages/Relatorios'
import NotFound from './pages/NotFound'
import { getCurrentUser, isAuthenticated } from './services/api/auth';
import { canAccess } from './lib/permissions';
import type { UserProfile } from './mocks/users';
import { AlertProvider } from './components/feedback/alert-provider';

function ProtectedRoute({ route, allowSelf, children }: { route: string; allowSelf?: boolean; children: ReactNode }) {
  const params = useParams()
  if (!isAuthenticated()) return <Navigate to="/" replace />
  const user = getCurrentUser()
  if (canAccess(user?.perfil_ativo as UserProfile, route)) {
    return <>{children}</>
  }
  // Autoatendimento: usuário sem acesso à tela pode ver o PRÓPRIO perfil.
  if (allowSelf && params.id && String(params.id) === String(user?.id)) {
    return <>{children}</>
  }
  return <Navigate to="/dashboard" replace />
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />
  },
  {
    path: "/resetar-senha",
    element: <ResetarSenha />
  },
  {
    element: <Layout />,
    children: [
      {
        path: "dashboard",
        element: <ProtectedRoute route="/dashboard"><Dashboard /></ProtectedRoute>
      },
      {
        path: "usuarios",
        element: <ProtectedRoute route="/usuarios"><Usuarios /></ProtectedRoute>
      },
      {
        path: "usuarios/:id",
        element: <ProtectedRoute route="/usuarios/:id" allowSelf><UsuarioPerfilPage /></ProtectedRoute>
      },
      {
        path: "movimentacoes",
        element: <ProtectedRoute route="/movimentacoes"><Movimentacoes /></ProtectedRoute>
      },
      {
        path: "titulos-a-receber",
        element: <ProtectedRoute route="/titulos-a-receber"><TitulosReceber /></ProtectedRoute>
      },
      {
        path: "titulos-a-pagar",
        element: <ProtectedRoute route="/titulos-a-pagar"><TitulosPagar /></ProtectedRoute>
      },
      {
        path: "receitas",
        element: <ProtectedRoute route="/receitas"><Receitas /></ProtectedRoute>
      },
      {
        path: "custos",
        element: <ProtectedRoute route="/custos"><Custos /></ProtectedRoute>
      },
      {
        path: "remessas-cnab",
        element: <ProtectedRoute route="/remessas-cnab"><RemessasCNAB /></ProtectedRoute>
      },
      {
        path: "config-bancaria",
        element: <ProtectedRoute route="/config-bancaria"><ConfiguracaoBancaria /></ProtectedRoute>
      },
      {
        path: "clientes",
        element: <ProtectedRoute route="/clientes"><Clientes /></ProtectedRoute>
      },
      {
        path: "aeronaves",
        element: <ProtectedRoute route="/aeronaves"><Aeronaves /></ProtectedRoute>
      },
      {
        path: "fornecedores",
        element: <ProtectedRoute route="/fornecedores"><Fornecedores /></ProtectedRoute>
      },
      {
        path: "conta-fixa",
        element: <ProtectedRoute route="/conta-fixa"><ContaFixa /></ProtectedRoute>
      },
      {
        path: "voos",
        element: <ProtectedRoute route="/voos"><Voos /></ProtectedRoute>
      },
      { path: "voos/novo", element: <VooFormPage /> },
      { path: "voos/:id/editar", element: <VooFormPage /> },
      {
        path: "relatorios",
        element: <ProtectedRoute route="/relatorios"><Relatorios /></ProtectedRoute>
      },
    ]
  },
  {
    path: "*",
    element: <NotFound />,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertProvider>
      <RouterProvider router={router} />
    </AlertProvider>
  </StrictMode>
)
