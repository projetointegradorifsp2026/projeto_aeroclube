import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import './index.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios'
import Movimentacoes from './pages/Movimentacoes';
import Layout from './pages/Layout';
import TitulosReceber from './pages/TitulosReceber';
import TitulosPagar from './pages/TitulosPagar';
import Clientes from './pages/Clientes';
import Aeronaves from './pages/Aeronaves';
import Fornecedores from './pages/Fornecedores';
import ContaFixa from './pages/ContaFixa';
import Voos from './pages/Voos';
import VooFormPage from './pages/VooFormPage'
import UsuarioPerfilPage from './pages/UsuarioPerfilPage'
import { getCurrentUser, isAuthenticated } from './services/api/auth';
import { canAccess } from './lib/permissions';
import type { UserProfile } from './mocks/users';

function ProtectedRoute({ route, children }: { route: string; children: ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/" replace />
  const user = getCurrentUser()
  if (!canAccess(user?.perfil_ativo as UserProfile, route)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />
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
        element: <ProtectedRoute route="/usuarios/:id"><UsuarioPerfilPage /></ProtectedRoute>
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
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
