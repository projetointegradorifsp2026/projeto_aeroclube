export type EntidadeTipo = 'fornecedor' | 'funcionario' | 'instrutor' | 'cliente'

export const ENTIDADE_TIPO_LABELS: Record<EntidadeTipo, string> = {
  fornecedor: 'Fornecedor',
  funcionario: 'Funcionário',
  instrutor: 'Instrutor',
  cliente: 'Cliente',
}

export const ALL_ENTIDADE_TIPOS: EntidadeTipo[] = ['fornecedor', 'funcionario', 'instrutor', 'cliente']

export interface Entidade {
  id: string
  nome: string
  cpf_cnpj: string
  email: string
  contato: string
  tipo: EntidadeTipo
  is_active: boolean
}

export const mockEntidades: Entidade[] = [
  // Fornecedores
  {
    id: '1',
    nome: 'ABC Combustíveis Ltda',
    cpf_cnpj: '12.345.678/0001-90',
    email: 'financeiro@abccombustiveis.com.br',
    contato: '(11) 98765-4321',
    tipo: 'fornecedor',
    is_active: true,
  },
  {
    id: '2',
    nome: 'Manutenção Hangar S/A',
    cpf_cnpj: '98.765.432/0001-10',
    email: 'contato@manutencaohangar.com.br',
    contato: '(11) 91234-5678',
    tipo: 'fornecedor',
    is_active: true,
  },
  {
    id: '3',
    nome: 'AeroPartes Brasil',
    cpf_cnpj: '45.678.901/0001-23',
    email: 'vendas@aeropartes.com.br',
    contato: '(19) 99876-5432',
    tipo: 'fornecedor',
    is_active: true,
  },
  {
    id: '4',
    nome: 'Telecom Brasil',
    cpf_cnpj: '23.456.789/0001-34',
    email: 'empresas@telecombrasil.com.br',
    contato: '(11) 4002-8922',
    tipo: 'fornecedor',
    is_active: true,
  },
  {
    id: '5',
    nome: 'Seguradora Aérea S/A',
    cpf_cnpj: '67.890.123/0001-45',
    email: 'contratos@seguradoraaerea.com.br',
    contato: '(11) 97654-3210',
    tipo: 'fornecedor',
    is_active: true,
  },
  {
    id: '6',
    nome: 'GLP Gás & Serviços',
    cpf_cnpj: '34.567.890/0001-56',
    email: 'comercial@glpgas.com.br',
    contato: '(19) 98877-6655',
    tipo: 'fornecedor',
    is_active: true,
  },
  {
    id: '7',
    nome: 'Papelaria Central',
    cpf_cnpj: '78.901.234/0001-67',
    email: 'contato@papelariacentral.com.br',
    contato: '(11) 3456-7890',
    tipo: 'fornecedor',
    is_active: false,
  },
  // Clientes
  {
    id: '9',
    nome: 'Empresa Aero Turismo Ltda',
    cpf_cnpj: '56.789.012/0001-78',
    email: 'operacoes@aeroturismo.com.br',
    contato: '(11) 95544-3322',
    tipo: 'cliente',
    is_active: true,
  },
  {
    id: '10',
    nome: 'Escola de Pilotos SP',
    cpf_cnpj: '89.012.345/0001-89',
    email: 'adm@escoladepilotos.com.br',
    contato: '(11) 92233-4455',
    tipo: 'cliente',
    is_active: true,
  },
  {
    id: '11',
    nome: 'João Pedro Oliveira',
    cpf_cnpj: '321.654.987-00',
    email: 'joao.oliveira@email.com',
    contato: '(11) 99001-2345',
    tipo: 'cliente',
    is_active: true,
  },
  {
    id: '12',
    nome: 'Maria Fernanda Lima',
    cpf_cnpj: '654.321.098-11',
    email: 'maria.lima@email.com',
    contato: '(19) 98765-4321',
    tipo: 'cliente',
    is_active: true,
  },
  {
    id: '13',
    nome: 'Roberto Souza',
    cpf_cnpj: '111.222.333-44',
    email: 'roberto.souza@email.com',
    contato: '(11) 91234-5678',
    tipo: 'cliente',
    is_active: false,
  },
  // Funcionários (IDs 101+)
  {
    id: '101',
    nome: 'Carlos Eduardo Silva',
    cpf_cnpj: '123.456.789-00',
    email: 'carlos.silva@aeroclube.com',
    contato: '(11) 98888-7777',
    tipo: 'funcionario',
    is_active: true,
  },
  {
    id: '102',
    nome: 'Marcos Costa',
    cpf_cnpj: '789.123.456-44',
    email: 'marcos.costa@aeroclube.com',
    contato: '(11) 95555-4444',
    tipo: 'funcionario',
    is_active: true,
  },
  {
    id: '103',
    nome: 'Lucas Araújo',
    cpf_cnpj: '445.566.778-88',
    email: 'lucas.araujo@aeroclube.com',
    contato: '(11) 94444-3333',
    tipo: 'funcionario',
    is_active: true,
  },
  // Instrutores (IDs 104+)
  {
    id: '104',
    nome: 'Ricardo Almeida',
    cpf_cnpj: '456.789.123-33',
    email: 'ricardo.almeida@aeroclube.com',
    contato: '(11) 96666-5555',
    tipo: 'instrutor',
    is_active: true,
  },
  {
    id: '105',
    nome: 'Ana Paula Santos',
    cpf_cnpj: '987.654.321-11',
    email: 'ana.santos@aeroclube.com',
    contato: '(11) 97777-6666',
    tipo: 'instrutor',
    is_active: true,
  },
  {
    id: '106',
    nome: 'Fernando Rocha',
    cpf_cnpj: '558.669.770-22',
    email: 'fernando.rocha@aeroclube.com',
    contato: '(11) 93333-2222',
    tipo: 'instrutor',
    is_active: true,
  },
]
