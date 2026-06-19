import { apiList, apiPost, apiPatch, apiDelete } from '@/services/api/client'
import { type Aeronave } from '@/mocks/aeronaves'

interface BackendAviao {
  id: number
  nome: string
  tipo: string
  tarifa_solo: string
  tarifa_duplo_comando: string
  foto: string | null
  is_active: boolean
}

interface BackendPlanador {
  id: number
  nome: string
  tipo: string
  minutos_franquia: number
  valor_fixo_inicial: string
  valor_minuto_adicional: string
  valor_fixo_duplo: string | null
  valor_minuto_duplo: string | null
  foto: string | null
  is_active: boolean
}

function adaptAviao(a: BackendAviao): Aeronave {
  return {
    id: String(a.id),
    nome: a.nome,
    tipo: 'aviao',
    foto: a.foto ?? '',
    is_active: a.is_active,
    valor_solo: parseFloat(a.tarifa_solo),
    valor_duplo: parseFloat(a.tarifa_duplo_comando),
    valor_fixo_inicial: 0,
    tempo_limite: 0,
    valor_por_minuto: 0,
  }
}

function adaptPlanador(p: BackendPlanador): Aeronave {
  return {
    id: String(p.id),
    nome: p.nome,
    tipo: 'planador',
    foto: p.foto ?? '',
    is_active: p.is_active,
    valor_solo: 0,
    valor_duplo: 0,
    valor_fixo_inicial: parseFloat(p.valor_fixo_inicial),
    tempo_limite: p.minutos_franquia,
    valor_por_minuto: parseFloat(p.valor_minuto_adicional),
    valor_fixo_duplo: p.valor_fixo_duplo != null ? parseFloat(p.valor_fixo_duplo) : undefined,
    valor_minuto_duplo: p.valor_minuto_duplo != null ? parseFloat(p.valor_minuto_duplo) : undefined,
  }
}

export async function getAeronaves(): Promise<Aeronave[]> {
  const [avioes, planadores] = await Promise.all([
    apiList<BackendAviao>('/api/v1/avioes/?all=true'),
    apiList<BackendPlanador>('/api/v1/planadores/?all=true'),
  ])
  return [
    ...avioes.map(adaptAviao),
    ...planadores.map(adaptPlanador),
  ].sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function createAeronave(data: Omit<Aeronave, 'id'>): Promise<Aeronave> {
  if (data.tipo === 'aviao') {
    const payload = {
      nome: data.nome,
      foto: data.foto || null,
      is_active: data.is_active,
      tarifa_solo: data.valor_solo.toFixed(2),
      tarifa_duplo_comando: data.valor_duplo.toFixed(2),
    }
    const created = await apiPost<BackendAviao>('/api/v1/avioes/', payload)
    return adaptAviao(created)
  } else {
    const payload: Record<string, unknown> = {
      nome: data.nome,
      foto: data.foto || null,
      is_active: data.is_active,
      minutos_franquia: data.tempo_limite,
      valor_fixo_inicial: data.valor_fixo_inicial.toFixed(2),
      valor_minuto_adicional: data.valor_por_minuto.toFixed(2),
      valor_fixo_duplo: data.valor_fixo_duplo != null ? data.valor_fixo_duplo.toFixed(2) : null,
      valor_minuto_duplo: data.valor_minuto_duplo != null ? data.valor_minuto_duplo.toFixed(2) : null,
    }
    const created = await apiPost<BackendPlanador>('/api/v1/planadores/', payload)
    return adaptPlanador(created)
  }
}

export async function updateAeronave(
  id: string,
  data: Partial<Omit<Aeronave, 'id'>>,
): Promise<Aeronave> {
  const tipo = data.tipo
  if (tipo === 'aviao' || (!tipo && data.valor_solo !== undefined)) {
    const payload: Record<string, unknown> = {}
    if (data.nome !== undefined) payload.nome = data.nome
    if (data.foto !== undefined) payload.foto = data.foto || null
    if (data.is_active !== undefined) payload.is_active = data.is_active
    if (data.valor_solo !== undefined) payload.tarifa_solo = data.valor_solo.toFixed(2)
    if (data.valor_duplo !== undefined) payload.tarifa_duplo_comando = data.valor_duplo.toFixed(2)
    const updated = await apiPatch<BackendAviao>(`/api/v1/avioes/${id}/`, payload)
    return adaptAviao(updated)
  } else {
    const payload: Record<string, unknown> = {}
    if (data.nome !== undefined) payload.nome = data.nome
    if (data.foto !== undefined) payload.foto = data.foto || null
    if (data.is_active !== undefined) payload.is_active = data.is_active
    if (data.tempo_limite !== undefined) payload.minutos_franquia = data.tempo_limite
    if (data.valor_fixo_inicial !== undefined) payload.valor_fixo_inicial = data.valor_fixo_inicial.toFixed(2)
    if (data.valor_por_minuto !== undefined) payload.valor_minuto_adicional = data.valor_por_minuto.toFixed(2)
    if ('valor_fixo_duplo' in data) payload.valor_fixo_duplo = data.valor_fixo_duplo != null ? (data.valor_fixo_duplo as number).toFixed(2) : null
    if ('valor_minuto_duplo' in data) payload.valor_minuto_duplo = data.valor_minuto_duplo != null ? (data.valor_minuto_duplo as number).toFixed(2) : null
    const updated = await apiPatch<BackendPlanador>(`/api/v1/planadores/${id}/`, payload)
    return adaptPlanador(updated)
  }
}

export async function deleteAeronave(id: string, tipo: 'aviao' | 'planador'): Promise<void> {
  const endpoint = tipo === 'aviao' ? `/api/v1/avioes/${id}/` : `/api/v1/planadores/${id}/`
  await apiDelete(endpoint)
}

export interface HistoricoTarifa {
  id: number
  aeronave: number
  descricao_alteracao: string
  valores_anteriores: Record<string, string | number | null>
  valores_vigentes: Record<string, string | number | null>
  alterado_em: string
  alterado_por: number | null
  alterado_por_nome: string | null
}

export async function getHistoricoTarifas(aeronaveId: string): Promise<HistoricoTarifa[]> {
  return apiList<HistoricoTarifa>(`/api/v1/historico-tarifas/?aeronave=${aeronaveId}`)
}

export type { Aeronave }
