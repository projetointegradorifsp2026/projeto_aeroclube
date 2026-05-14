export interface ContaFixa {
  id: string
  nome: string
  descricao: string
  favorecido: string
  valor: number
  dia_vencimento: number
  is_active: boolean
}

export const mockContasFixas: ContaFixa[] = [
  {
    id: '1',
    nome: 'Energia Elétrica',
    descricao: 'Conta de energia do hangar e escritório',
    favorecido: 'Companhia de Energia',
    valor: 450,
    dia_vencimento: 20,
    is_active: true,
  },
  {
    id: '2',
    nome: 'Aluguel do Terreno',
    descricao: 'Aluguel mensal do terreno junto ao aeroporto',
    favorecido: 'Imobiliária Aeroporto',
    valor: 1800,
    dia_vencimento: 15,
    is_active: true,
  },
  {
    id: '3',
    nome: 'Internet e Telefone',
    descricao: 'Plano de internet e telefonia corporativa',
    favorecido: 'Telecom Brasil',
    valor: 350,
    dia_vencimento: 10,
    is_active: true,
  },
  {
    id: '4',
    nome: 'Seguro das Aeronaves',
    descricao: 'Seguro anual dividido em mensalidades',
    favorecido: 'Seguradora Aérea S/A',
    valor: 1200,
    dia_vencimento: 5,
    is_active: true,
  },
  {
    id: '5',
    nome: 'Manutenção Preventiva',
    descricao: 'Contrato de manutenção periódica do hangar',
    favorecido: 'Manutenção Hangar S/A',
    valor: 800,
    dia_vencimento: 1,
    is_active: false,
  },
]
