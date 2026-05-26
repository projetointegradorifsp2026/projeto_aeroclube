import { api } from '@/lib/api'
import { type Aeronave, type TipoAeronave } from '@/mocks/aeronaves'

type Paginated<T> = { count: number; results: T[] }
function unwrap<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results
}

function normalizeAviao(a: Record<string, unknown>): Aeronave {
  return {
    id: a.id as number,
    nome: a.nome as string,
    tipo: 'aviao',
    foto: (a.foto as string | null) ?? null,
    is_active: a.is_active as boolean,
    tarifa_solo: (a.tarifa_solo as number | null) ?? null,
    tarifa_duplo_comando: (a.tarifa_duplo_comando as number | null) ?? null,
    minutos_franquia: null,
    valor_fixo_inicial: null,
    valor_minuto_adicional: null,
  }
}

function normalizePlanador(p: Record<string, unknown>): Aeronave {
  return {
    id: p.id as number,
    nome: p.nome as string,
    tipo: 'planador',
    foto: (p.foto as string | null) ?? null,
    is_active: p.is_active as boolean,
    tarifa_solo: null,
    tarifa_duplo_comando: null,
    minutos_franquia: (p.minutos_franquia as number | null) ?? null,
    valor_fixo_inicial: (p.valor_fixo_inicial as number | null) ?? null,
    valor_minuto_adicional: (p.valor_minuto_adicional as number | null) ?? null,
  }
}

// Cache id → tipo para operações sem tipo explícito
const tipoCache = new Map<number, TipoAeronave>()

export async function getAeronaves(): Promise<Aeronave[]> {
  const [avioesRes, planadoresRes] = await Promise.all([
    api.get('/avioes/'),
    api.get('/planadores/'),
  ])
  const avioes = unwrap<Record<string, unknown>>(avioesRes.data).map(normalizeAviao)
  const planadores = unwrap<Record<string, unknown>>(planadoresRes.data).map(normalizePlanador)
  const all = [...avioes, ...planadores].sort((a, b) => a.nome.localeCompare(b.nome))
  all.forEach(a => tipoCache.set(a.id, a.tipo))
  return all
}

export async function createAeronave(data: Omit<Aeronave, 'id'>): Promise<Aeronave> {
  if (data.tipo === 'aviao') {
    const res = await api.post('/avioes/', {
      nome: data.nome,
      foto: data.foto,
      tarifa_solo: data.tarifa_solo,
      tarifa_duplo_comando: data.tarifa_duplo_comando,
    })
    return normalizeAviao(res.data)
  }
  const res = await api.post('/planadores/', {
    nome: data.nome,
    foto: data.foto,
    minutos_franquia: data.minutos_franquia,
    valor_fixo_inicial: data.valor_fixo_inicial,
    valor_minuto_adicional: data.valor_minuto_adicional,
  })
  return normalizePlanador(res.data)
}

export async function updateAeronave(
  id: number,
  data: Partial<Omit<Aeronave, 'id'>>,
): Promise<Aeronave> {
  const tipo = data.tipo ?? tipoCache.get(id)
  if (tipo === 'aviao') {
    const res = await api.patch(`/avioes/${id}/`, data)
    return normalizeAviao(res.data)
  }
  const res = await api.patch(`/planadores/${id}/`, data)
  return normalizePlanador(res.data)
}

export async function deleteAeronave(id: number): Promise<void> {
  const tipo = tipoCache.get(id)
  if (tipo === 'aviao') {
    await api.delete(`/avioes/${id}/`)
  } else {
    await api.delete(`/planadores/${id}/`)
  }
}

export type { Aeronave }
