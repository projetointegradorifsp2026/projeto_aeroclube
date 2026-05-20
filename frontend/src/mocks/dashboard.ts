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
  titulosPagar: 29760,
  titulosReceber: 12480,
  saldoCarteira: 7106,
}

export const mockPeriodoData: PeriodoData[] = [
  { periodo: 'Dez', entradas: 5200, saidas: 3800 },
  { periodo: 'Jan', entradas: 4800, saidas: 4100 },
  { periodo: 'Fev', entradas: 6300, saidas: 3200 },
  { periodo: 'Mar', entradas: 5700, saidas: 4600 },
  { periodo: 'Abr', entradas: 8400, saidas: 5100 },
  { periodo: 'Mai', entradas: 7200, saidas: 4800 },
]

export const mockDespesas: DespesaCategoria[] = [
  { categoria: 'Jan', valor: 4100 },
  { categoria: 'Fev', valor: 3200 },
  { categoria: 'Mar', valor: 4600 },
  { categoria: 'Abr', valor: 5100 },
  { categoria: 'Mai', valor: 4800 },
  { categoria: 'Jun', valor: 3900 },
  { categoria: 'Jul', valor: 4200 },
  { categoria: 'Ago', valor: 3600 },
]

export const mockMovimentacoes: Movimentacao[] = [
  {
    id: '1',
    tipo: 'Pagamento',
    pessoa: 'Ana Paula Santos',
    tags: ['Mensalidade', 'Aluno', 'Ativo'],
    data: '2026-05-15',
  },
  {
    id: '2',
    tipo: 'Registro de Voo',
    pessoa: 'Roberto Ferreira',
    tags: ['Sócio Solo', 'PP-ABC'],
    data: '2026-05-14',
  },
  {
    id: '3',
    tipo: 'Pagamento',
    pessoa: 'Beatriz Cardoso',
    tags: ['Mensalidade', 'Sócio'],
    data: '2026-05-13',
  },
  {
    id: '4',
    tipo: 'Registro de Voo',
    pessoa: 'Paulo Mendes',
    tags: ['Externo', 'Instrução', 'PT-DEF'],
    data: '2026-05-10',
  },
  {
    id: '5',
    tipo: 'Pagamento',
    pessoa: 'Seguradora Aérea S/A',
    tags: ['Conta Fixa', 'Seguro'],
    data: '2026-05-05',
  },
  {
    id: '6',
    tipo: 'Pagamento',
    pessoa: 'Carlos Eduardo Silva',
    tags: ['Folha', 'Funcionário'],
    data: '2026-05-05',
  },
  {
    id: '7',
    tipo: 'Recarga Carteira',
    pessoa: 'Fernanda Lima',
    tags: ['Carteira', 'Sócio'],
    data: '2026-04-22',
  },
  {
    id: '8',
    tipo: 'Registro de Voo',
    pessoa: 'Thiago Barbosa',
    tags: ['Instrução Duplo', 'Aluno', 'PP-XYZ'],
    data: '2026-04-08',
  },
]

export const mockTitulosVencer: TituloVencer[] = [
  {
    id: '1',
    descricao: 'Energia elétrica – Maio 2026',
    valor: 450,
    data: '2026-05-20',
    tipo: 'pagar',
  },
  {
    id: '2',
    descricao: 'Mensalidades sócios/alunos – Maio',
    valor: 2450,
    data: '2026-05-30',
    tipo: 'receber',
  },
  {
    id: '3',
    descricao: 'Combustível – Maio 2026',
    valor: 1350,
    data: '2026-05-31',
    tipo: 'pagar',
  },
  {
    id: '4',
    descricao: 'Peças de reposição – Parcela 1/2',
    valor: 8500,
    data: '2026-05-20',
    tipo: 'pagar',
  },
  {
    id: '5',
    descricao: 'Água e saneamento – Maio 2026',
    valor: 180,
    data: '2026-05-25',
    tipo: 'pagar',
  },
  {
    id: '6',
    descricao: 'Voos em aberto – Maio',
    valor: 4125,
    data: '2026-06-15',
    tipo: 'receber',
  },
  {
    id: '7',
    descricao: 'Salários – Junho 2026',
    valor: 9500,
    data: '2026-06-05',
    tipo: 'pagar',
  },
  {
    id: '8',
    descricao: 'Comissões instrutores – Maio',
    valor: 2940,
    data: '2026-06-05',
    tipo: 'pagar',
  },
  {
    id: '9',
    descricao: 'Manutenção preventiva – Parcela 1/3',
    valor: 5000,
    data: '2026-06-10',
    tipo: 'pagar',
  },
]
