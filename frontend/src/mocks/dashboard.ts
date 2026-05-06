export interface ResumoFinanceiro {
  titulosPagar: number
  titulosReceber: number
  saldoCarteira: number
}

export interface PeriodoData {
  periodo: string
  entradas: number
  saidas: number
}

export interface DespesaCategoria {
  categoria: string
  valor: number
}

export interface Movimentacao {
  id: string
  tipo: string
  pessoa: string
  tags: string[]
  data: string
}

export type TituloVencerTipo = 'pagar' | 'receber'

export interface TituloVencer {
  id: string
  descricao: string
  valor: number
  data: string
  tipo: TituloVencerTipo
}

export const mockResumo: ResumoFinanceiro = {
  titulosPagar: 5000,
  titulosReceber: 3500,
  saldoCarteira: 10000,
}

export const mockPeriodoData: PeriodoData[] = [
  { periodo: 'Dez', entradas: 4200, saidas: 2800 },
  { periodo: 'Jan', entradas: 3800, saidas: 3200 },
  { periodo: 'Fev', entradas: 5100, saidas: 2400 },
  { periodo: 'Mar', entradas: 4600, saidas: 3800 },
  { periodo: 'Abr', entradas: 6200, saidas: 2900 },
  { periodo: 'Mai', entradas: 5800, saidas: 3400 },
]

export const mockDespesas: DespesaCategoria[] = [
  { categoria: 'Jan', valor: 2800 },
  { categoria: 'Fev', valor: 1800 },
  { categoria: 'Mar', valor: 3200 },
  { categoria: 'Abr', valor: 2200 },
  { categoria: 'Mai', valor: 1400 },
  { categoria: 'Jun', valor: 2600 },
  { categoria: 'Jul', valor: 1900 },
  { categoria: 'Ago', valor: 2400 },
]

export const mockMovimentacoes: Movimentacao[] = [
  {
    id: '1',
    tipo: 'Pagamento',
    pessoa: 'Ana Paula Santos',
    tags: ['Mensalidade', 'Aluno', 'Ativo'],
    data: '2025-05-04',
  },
  {
    id: '2',
    tipo: 'Pagamento',
    pessoa: 'Roberto Ferreira',
    tags: ['Voo', 'Sócio', 'PP-RCA'],
    data: '2025-05-04',
  },
  {
    id: '3',
    tipo: 'Recebimento',
    pessoa: 'Paulo Mendes',
    tags: ['Externo', 'Instrução', 'PP-XAB'],
    data: '2025-05-03',
  },
  {
    id: '4',
    tipo: 'Pagamento',
    pessoa: 'Fernanda Lima',
    tags: ['Mensalidade', 'Sócio'],
    data: '2025-05-03',
  },
  {
    id: '5',
    tipo: 'Pagamento',
    pessoa: 'Marcos Costa',
    tags: ['Folha', 'Colaborador'],
    data: '2025-05-02',
  },
  {
    id: '6',
    tipo: 'Recebimento',
    pessoa: 'Júlia Oliveira',
    tags: ['Instrução Solo', 'Aluno', 'PP-RCA'],
    data: '2025-05-02',
  },
]

export const mockTitulosVencer: TituloVencer[] = [
  {
    id: '1',
    descricao: 'Títulos a Pagar em Aberto',
    valor: 5000,
    data: '2025-05-11',
    tipo: 'pagar',
  },
  {
    id: '2',
    descricao: 'Títulos a Receber em Aberto',
    valor: 3500,
    data: '2025-05-11',
    tipo: 'receber',
  },
  {
    id: '3',
    descricao: 'Títulos a Pagar em Aberto',
    valor: 10000,
    data: '2025-05-12',
    tipo: 'pagar',
  },
  {
    id: '4',
    descricao: 'Conta Fixa — Hangar',
    valor: 1500,
    data: '2025-05-12',
    tipo: 'pagar',
  },
  {
    id: '5',
    descricao: 'Títulos a Pagar em Aberto',
    valor: 10000,
    data: '2025-05-13',
    tipo: 'pagar',
  },
  {
    id: '6',
    descricao: 'Títulos a Receber em Aberto',
    valor: 2800,
    data: '2025-05-13',
    tipo: 'receber',
  },
  {
    id: '7',
    descricao: 'Títulos a Pagar em Aberto',
    valor: 10000,
    data: '2025-05-14',
    tipo: 'pagar',
  },
  {
    id: '8',
    descricao: 'Seguro Aeronave',
    valor: 800,
    data: '2025-05-14',
    tipo: 'pagar',
  },
  {
    id: '9',
    descricao: 'Mensalidade Alunos',
    valor: 840,
    data: '2025-05-15',
    tipo: 'receber',
  },
]
