import { apiList, apiPost, apiPatch, apiDelete } from '@/services/api/client'
import { type Voo, type TipoVoo } from '@/mocks/voos'

interface BackendVoo {
  id: number
  data_voo: string
  tipo_voo: string
  participante: number
  participante_nome: string
  instrutor: number | null
  instrutor_nome: string | null
  aeronave: number
  aeronave_nome: string
  hora_inicio: string
  hora_fim: string
  duracao_minutos: number
  tempo_decimal: string
  origem: string | null
  destino: string | null
  valor_tarifa_snapshot: string
  valor_total: string
  taxa_instrutor: string
  valor_repasse_instrutor: string
  detalhe_cobranca: {
    tipo_aeronave?: string
    [key: string]: unknown
  } | null
  created_at: string
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function adaptVoo(v: BackendVoo): Voo {
  const tipoAeronave = (v.detalhe_cobranca?.tipo_aeronave ?? 'aviao') as 'aviao' | 'planador'
  return {
    id: String(v.id),
    aeronave_id: String(v.aeronave),
    aeronave_nome: v.aeronave_nome,
    tipo_aeronave: tipoAeronave,
    participante_id: String(v.participante),
    participante_nome: v.participante_nome,
    instrutor_id: v.instrutor ? String(v.instrutor) : null,
    instrutor_nome: v.instrutor_nome,
    tipo_voo: v.tipo_voo as TipoVoo,
    inicio: v.hora_inicio.substring(0, 5),
    fim: v.hora_fim.substring(0, 5),
    tempo_decimal: parseFloat(v.tempo_decimal),
    origem: v.origem ?? '',
    destino: v.destino ?? '',
    valor_hora: parseFloat(v.valor_tarifa_snapshot),
    valor_voo: parseFloat(v.valor_total),
    taxa_instrutor: v.instrutor ? parseFloat(v.taxa_instrutor) : null,
    data: v.data_voo,
    data_vencimento: addDays(v.data_voo, 30),
    created_at: v.created_at,
  }
}

export async function getVoos(): Promise<Voo[]> {
  const voos = await apiList<BackendVoo>('/api/v1/voos/')
  return voos.map(adaptVoo).sort((a, b) => b.data.localeCompare(a.data))
}

export async function createVoo(data: Omit<Voo, 'id' | 'created_at'>): Promise<Voo> {
  const payload = {
    participante: parseInt(data.participante_id),
    instrutor: data.instrutor_id ? parseInt(data.instrutor_id) : null,
    aeronave: parseInt(data.aeronave_id),
    tipo_voo: data.tipo_voo,
    hora_inicio: data.inicio,
    hora_fim: data.fim,
    data_voo: data.data,
    origem: data.origem || null,
    destino: data.destino || null,
    taxa_instrutor: data.taxa_instrutor ?? 10,
  }
  const created = await apiPost<BackendVoo>('/api/v1/voos/', payload)
  return adaptVoo(created)
}

export async function updateVoo(
  id: string,
  data: Partial<Omit<Voo, 'id' | 'created_at'>>,
): Promise<Voo> {
  const payload: Record<string, unknown> = {}
  if (data.participante_id !== undefined) payload.participante = parseInt(data.participante_id)
  if (data.instrutor_id !== undefined) payload.instrutor = data.instrutor_id ? parseInt(data.instrutor_id) : null
  if (data.aeronave_id !== undefined) payload.aeronave = parseInt(data.aeronave_id)
  if (data.tipo_voo !== undefined) payload.tipo_voo = data.tipo_voo
  if (data.inicio !== undefined) payload.hora_inicio = data.inicio
  if (data.fim !== undefined) payload.hora_fim = data.fim
  if (data.data !== undefined) payload.data_voo = data.data
  if (data.origem !== undefined) payload.origem = data.origem || null
  if (data.destino !== undefined) payload.destino = data.destino || null
  if (data.taxa_instrutor !== undefined) payload.taxa_instrutor = data.taxa_instrutor ?? 10

  const updated = await apiPatch<BackendVoo>(`/api/v1/voos/${id}/`, payload)
  return adaptVoo(updated)
}

export async function deleteVoo(id: string): Promise<void> {
  await apiDelete(`/api/v1/voos/${id}/`)
}

export type { Voo, TipoVoo }
