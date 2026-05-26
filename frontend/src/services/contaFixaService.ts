// ContaFixa não tem modelo próprio no backend.
// Mapeada para TituloPagar com tipo='conta_fixa' e is_recorrente=true.
import { api } from '@/lib/api'
import { type TituloPagar } from '@/mocks/titulos'

type Paginated<T> = { count: number; results: T[] }
function unwrap<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results
}

// Tipo exposto para a página ContaFixa
export interface ContaFixa {
  id: number
  nome: string           // mapeado de TituloPagar.descricao
  descricao: string
  favorecido: string     // mapeado de TituloPagar.favorecido_nome
  favorecido_id: number  // mapeado de TituloPagar.favorecido
  valor: number
  dia_vencimento: number // extraído de TituloPagar.data_vencimento (dia do mês)
  is_active: boolean     // true quando status='aberto'
  is_recorrente: boolean
  periodicidade_dias: number | null
}

function toContaFixa(t: TituloPagar): ContaFixa {
  const dia = t.data_vencimento ? parseInt(t.data_vencimento.split('-')[2], 10) : 1
  return {
    id: t.id,
    nome: t.descricao,
    descricao: t.descricao,
    favorecido: t.favorecido_nome,
    favorecido_id: t.favorecido,
    valor: t.valor,
    dia_vencimento: dia,
    is_active: t.status === 'aberto',
    is_recorrente: t.is_recorrente,
    periodicidade_dias: t.periodicidade_dias,
  }
}

export async function getContasFixas(): Promise<ContaFixa[]> {
  const res = await api.get('/titulos-pagar/', { params: { tipo: 'conta_fixa' } })
  return unwrap<TituloPagar>(res.data).map(toContaFixa)
}

export interface ContaFixaFormData {
  nome: string
  descricao: string
  favorecido: number
  valor: number
  dia_vencimento: number
  is_active?: boolean
  periodicidade_dias?: number | null
}

function buildVencimento(dia: number): string {
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const ano = hoje.getFullYear()
  const diaStr = String(dia).padStart(2, '0')
  return `${ano}-${mes}-${diaStr}`
}

export async function createContaFixa(data: ContaFixaFormData): Promise<ContaFixa> {
  const payload = {
    tipo: 'conta_fixa',
    favorecido: data.favorecido,
    descricao: data.nome,
    valor: data.valor,
    data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: buildVencimento(data.dia_vencimento),
    is_recorrente: true,
    periodicidade_dias: data.periodicidade_dias ?? 30,
  }
  const res = await api.post('/titulos-pagar/', payload)
  return toContaFixa(res.data)
}

export async function updateContaFixa(
  id: number,
  data: Partial<ContaFixaFormData>,
): Promise<ContaFixa> {
  const patch: Record<string, unknown> = {}
  if (data.nome !== undefined) patch.descricao = data.nome
  if (data.favorecido !== undefined) patch.favorecido = data.favorecido
  if (data.valor !== undefined) patch.valor = data.valor
  if (data.dia_vencimento !== undefined) patch.data_vencimento = buildVencimento(data.dia_vencimento)
  if (data.periodicidade_dias !== undefined) patch.periodicidade_dias = data.periodicidade_dias
  const res = await api.patch(`/titulos-pagar/${id}/`, patch)
  return toContaFixa(res.data)
}

export async function deleteContaFixa(id: number): Promise<void> {
  await api.delete(`/titulos-pagar/${id}/`)
}

export type { ContaFixa }
