// Tipos da camada de ORIGEM financeira: Receita (a receber) e Custo (a pagar).
// Espelham os tipos de títulos, mas representam o estágio anterior ao título.

export type ReceitaTipo = 'mensalidade' | 'voo' | 'horas_pre_pagas' | 'servico' | 'outros'
export type ReceitaStatus = 'pendente' | 'faturada' | 'quitada' | 'cancelada'

export interface Receita {
  id: string
  participante_id?: string
  cliente_id?: string
  devedor_nome: string
  is_cliente: boolean
  tipo: ReceitaTipo
  descricao: string
  valor: number
  data_emissao: string
  data_vencimento: string
  status: ReceitaStatus
  esta_faturada: boolean
  titulos_info: TitulosInfo | null
  titulos_resumo: TituloResumo[]
  created_at: string
}

export type CustoTipo = 'fornecedor' | 'folha_pagamento' | 'conta_fixa' | 'outros'
export type CustoStatus = 'pendente' | 'faturado' | 'quitado' | 'cancelado'

export interface TituloResumo {
  id: number
  num_parcela: number
  total_parcelas: number
  valor: number
  valor_pago: number | null
  multa: number
  data_vencimento: string
  data_pagamento: string | null
  status: string
  status_display: string
  esta_atrasado: boolean
}

export interface TitulosInfo {
  total: number
  baixados: number
  todos_pagos: boolean
  parcialmente_pago: boolean
}

export interface Custo {
  id: string
  favorecido_id?: string
  favorecido_nome: string
  tipo: CustoTipo
  descricao: string
  valor: number
  data_emissao: string
  data_vencimento: string
  status: CustoStatus
  esta_faturado: boolean
  is_recorrente: boolean
  titulos_info: TitulosInfo | null
  titulos_resumo: TituloResumo[]
  created_at: string
}

export const RECEITA_TIPO_LABELS: Record<ReceitaTipo, string> = {
  mensalidade: 'Mensalidade',
  voo: 'Cobrança de Voo',
  horas_pre_pagas: 'Horas Pré-pagas',
  servico: 'Serviço',
  outros: 'Outros',
}

export const RECEITA_STATUS_LABELS: Record<ReceitaStatus, string> = {
  pendente: 'Pendente',
  faturada: 'Faturada',
  quitada: 'Quitada',
  cancelada: 'Cancelada',
}

export const RECEITA_STATUS_COLORS: Record<ReceitaStatus, string> = {
  pendente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  faturada: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  quitada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelada: 'bg-muted text-muted-foreground',
}

export const CUSTO_TIPO_LABELS: Record<CustoTipo, string> = {
  fornecedor: 'Fornecedor',
  folha_pagamento: 'Folha de Pagamento',
  conta_fixa: 'Conta Fixa',
  outros: 'Outros',
}

export const CUSTO_STATUS_LABELS: Record<CustoStatus, string> = {
  pendente: 'Pendente',
  faturado: 'Faturado',
  quitado: 'Quitado',
  cancelado: 'Cancelado',
}

export const CUSTO_STATUS_COLORS: Record<CustoStatus, string> = {
  pendente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  faturado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  quitado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelado: 'bg-muted text-muted-foreground',
}

export const ALL_RECEITA_TIPOS: ReceitaTipo[] = ['mensalidade', 'voo', 'horas_pre_pagas', 'servico', 'outros']
export const ALL_CUSTO_TIPOS: CustoTipo[] = ['fornecedor', 'folha_pagamento', 'conta_fixa', 'outros']
// Tipos selecionáveis na criação manual (origem criada pelo operador)
export const RECEITA_TIPOS_MANUAIS: ReceitaTipo[] = ['mensalidade', 'servico', 'outros']
export const CUSTO_TIPOS_MANUAIS: CustoTipo[] = ['fornecedor', 'folha_pagamento', 'conta_fixa', 'outros']
