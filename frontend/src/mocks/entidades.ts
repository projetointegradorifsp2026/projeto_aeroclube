export type EntidadeTipo = 'fornecedor' | 'funcionario' | 'instrutor'

export const ENTIDADE_TIPO_LABELS: Record<EntidadeTipo, string> = {
  fornecedor: 'Fornecedor',
  funcionario: 'Funcionário',
  instrutor: 'Instrutor',
}

export const ALL_ENTIDADE_TIPOS: EntidadeTipo[] = ['fornecedor', 'funcionario', 'instrutor']

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
    nome: 'Papelaria Central',
    cpf_cnpj: '78.901.234/0001-56',
    email: 'contato@papelariacentral.com.br',
    contato: '(11) 3456-7890',
    tipo: 'fornecedor',
    is_active: false,
  },
  {
    id: '5',
    nome: 'Carlos Eduardo Silva',
    cpf_cnpj: '123.456.789-00',
    email: 'carlos.silva@aeroclube.com',
    contato: '(11) 98888-7777',
    tipo: 'funcionario',
    is_active: true,
  },
  {
    id: '6',
    nome: 'Marcos Costa',
    cpf_cnpj: '789.123.456-44',
    email: 'marcos.costa@aeroclube.com',
    contato: '(11) 95555-4444',
    tipo: 'funcionario',
    is_active: true,
  },
  {
    id: '7',
    nome: 'Ana Paula Santos',
    cpf_cnpj: '987.654.321-11',
    email: 'ana.santos@aeroclube.com',
    contato: '(11) 97777-6666',
    tipo: 'instrutor',
    is_active: true,
  },
  {
    id: '8',
    nome: 'Ricardo Almeida',
    cpf_cnpj: '456.789.123-33',
    email: 'ricardo.almeida@aeroclube.com',
    contato: '(11) 96666-5555',
    tipo: 'instrutor',
    is_active: true,
  },
]
