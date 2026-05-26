// Alinhado com backend: EntidadePagar (fornecedor, funcionario, instrutor)
// Clientes externos são Usuários (perfil 'externo'), não EntidadePagar
export type EntidadeTipo = 'fornecedor' | 'funcionario' | 'instrutor'

export const ENTIDADE_TIPO_LABELS: Record<EntidadeTipo, string> = {
  fornecedor: 'Fornecedor',
  funcionario: 'Funcionário',
  instrutor: 'Instrutor',
}

export const ALL_ENTIDADE_TIPOS: EntidadeTipo[] = ['fornecedor', 'funcionario', 'instrutor']

export interface Entidade {
  id: number
  nome: string
  cpf_cnpj: string | null
  email: string | null
  contato: string | null
  tipo: EntidadeTipo
  is_active: boolean
  // Fornecedor
  produto_servico?: string | null
  // Funcionario/Instrutor
  funcao?: string | null
  is_instrutor?: boolean
  salario_base?: number | null
}

export const mockEntidades: Entidade[] = [
  // Fornecedores
  { id: 1, nome: 'ABC Combustíveis Ltda', cpf_cnpj: '12.345.678/0001-90', email: 'financeiro@abccombustiveis.com.br', contato: '(11) 98765-4321', tipo: 'fornecedor', is_active: true, produto_servico: 'Combustível aeronáutico' },
  { id: 2, nome: 'Manutenção Hangar S/A', cpf_cnpj: '98.765.432/0001-10', email: 'contato@manutencaohangar.com.br', contato: '(11) 91234-5678', tipo: 'fornecedor', is_active: true, produto_servico: 'Manutenção de hangar' },
  { id: 3, nome: 'AeroPartes Brasil', cpf_cnpj: '45.678.901/0001-23', email: 'vendas@aeropartes.com.br', contato: '(19) 99876-5432', tipo: 'fornecedor', is_active: true, produto_servico: 'Peças aeronáuticas' },
  { id: 4, nome: 'Telecom Brasil', cpf_cnpj: '23.456.789/0001-34', email: 'empresas@telecombrasil.com.br', contato: '(11) 4002-8922', tipo: 'fornecedor', is_active: true, produto_servico: 'Internet e telefonia' },
  { id: 5, nome: 'Seguradora Aérea S/A', cpf_cnpj: '67.890.123/0001-45', email: 'contratos@seguradoraaerea.com.br', contato: '(11) 97654-3210', tipo: 'fornecedor', is_active: true, produto_servico: 'Seguro aeronáutico' },
  { id: 6, nome: 'GLP Gás & Serviços', cpf_cnpj: '34.567.890/0001-56', email: 'comercial@glpgas.com.br', contato: '(19) 98877-6655', tipo: 'fornecedor', is_active: true, produto_servico: 'Gás' },
  { id: 7, nome: 'Papelaria Central', cpf_cnpj: '78.901.234/0001-67', email: 'contato@papelariacentral.com.br', contato: '(11) 3456-7890', tipo: 'fornecedor', is_active: false, produto_servico: 'Material de escritório' },
  // Funcionários
  { id: 101, nome: 'Carlos Eduardo Silva', cpf_cnpj: '123.456.789-00', email: 'carlos.silva@aeroclube.com', contato: '(11) 98888-7777', tipo: 'funcionario', is_active: true, funcao: 'Secretário', is_instrutor: false, salario_base: 3500 },
  { id: 102, nome: 'Marcos Costa', cpf_cnpj: '789.123.456-44', email: 'marcos.costa@aeroclube.com', contato: '(11) 95555-4444', tipo: 'funcionario', is_active: true, funcao: 'Auxiliar administrativo', is_instrutor: false, salario_base: 2800 },
  { id: 103, nome: 'Lucas Araújo', cpf_cnpj: '445.566.778-88', email: 'lucas.araujo@aeroclube.com', contato: '(11) 94444-3333', tipo: 'funcionario', is_active: true, funcao: 'Mecânico', is_instrutor: false, salario_base: 3200 },
  // Instrutores
  { id: 104, nome: 'Ricardo Almeida', cpf_cnpj: '456.789.123-33', email: 'ricardo.almeida@aeroclube.com', contato: '(11) 96666-5555', tipo: 'instrutor', is_active: true, funcao: 'Instrutor de voo', is_instrutor: true, salario_base: 2800 },
  { id: 105, nome: 'Ana Paula Santos', cpf_cnpj: '987.654.321-11', email: 'ana.santos@aeroclube.com', contato: '(11) 97777-6666', tipo: 'instrutor', is_active: true, funcao: 'Instrutora de voo', is_instrutor: true, salario_base: 2800 },
  { id: 106, nome: 'Fernando Rocha', cpf_cnpj: '558.669.770-22', email: 'fernando.rocha@aeroclube.com', contato: '(11) 93333-2222', tipo: 'instrutor', is_active: true, funcao: 'Instrutor de voo', is_instrutor: true, salario_base: 2800 },
]
