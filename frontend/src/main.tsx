import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter,  RouterProvider } from "react-router-dom";

import './index.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios'
import Movimentacoes from './pages/Movimentacoes';
import Layout from './pages/Layout';
import TitulosReceber from './pages/TitulosReceber';
import TitulosPagar from './pages/TitulosPagar';
import Funcionario from './pages/Funcionario';
import Clientes from './pages/Clientes';
import Aeronaves from './pages/Aeronaves';
import Fornecedores from './pages/Fornecedores';
import ContaFixa from './pages/ContaFixa';


const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />
  },

  {
    element: <Layout />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "usuarios", element: <Usuarios /> },
      { path: "movimentacoes", element: <Movimentacoes /> },
      { path: "titulos-a-receber", element: <TitulosReceber /> },
      { path: "titulos-a-pagar", element: <TitulosPagar /> },
      { path: "funcionario", element: <Funcionario /> },
      { path: "clientes", element: <Clientes /> },
      { path: "aeronaves", element: <Aeronaves /> },
      { path: "fornecedores", element: <Fornecedores /> },
      { path: "conta-fixa", element: <ContaFixa /> }
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)