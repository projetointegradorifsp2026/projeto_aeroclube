import { api } from '@/lib/api'
import { type Voo, type TipoVoo } from '@/mocks/voos'

type Paginated<T> = { count: number; results: T[] }
function unwrap<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results
}

export interface VooFilters {
  participante?: number
  aeronave?: number
  data_inicio?: string
  data_fim?: string
}

export async function getVoos(filters?: VooFilters): Promise<Voo[]> {
  const res = await api.get('/voos/', { params: filters })
  const voos = unwrap<Voo>(res.data)
  return voos.sort((a, b) => b.data_voo.localeCompare(a.data_voo))
}

export async function getVoo(id: number): Promise<Voo> {
  const res = await api.get(`/voos/${id}/`)
  return res.data
}

export interface CreateVooPayload {
  aeronave: number
  participante: number
  instrutor?: number | null
  tipo_voo: TipoVoo
  hora_inicio: string
  hora_fim: string
  data_voo: string
  origem?: string | null
  destino?: string | null
}

export async function createVoo(data: CreateVooPayload): Promise<Voo> {
  const res = await api.post('/voos/', data)
  return res.data
}

export async function updateVoo(id: number, data: Partial<CreateVooPayload>): Promise<Voo> {
  const res = await api.patch(`/voos/${id}/`, data)
  return res.data
}

export async function deleteVoo(id: number): Promise<void> {
  await api.delete(`/voos/${id}/`)
}

// Simula o tempo decimal antes de registrar o voo (RF08)
export async function simularTempoDecimal(
  hora_inicio: string,
  hora_fim: string,
): Promise<{ duracao_minutos: number; tempo_decimal: number }> {
  const res = await api.get('/voos/simular-decimal/', {
    params: { hora_inicio, hora_fim },
  })
  return res.data
}

export type { Voo, TipoVoo }
