import { apiGet, apiFetch } from '@/services/api/client'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface RelatorioMetadados {
  campos: {
    receber: Record<string, string>
    pagar: Record<string, string>
  }
  campos_inteiros: string[]
  tipos: {
    receber: { value: string; label: string }[]
    pagar: { value: string; label: string }[]
  }
  status: {
    receber: { value: string; label: string }[]
    pagar: { value: string; label: string }[]
  }
  data_fields: {
    receber: { value: string; label: string }[]
    pagar: { value: string; label: string }[]
  }
  ordenar_por: {
    receber: { value: string; label: string }[]
    pagar: { value: string; label: string }[]
  }
}

export interface RelatorioResultado {
  count: number
  page: number
  page_size: number
  num_pages: number
  campos: Record<string, string>
  results: Record<string, string | number>[]
}

export interface RelatorioParams {
  fonte: 'receber' | 'pagar'
  campos?: string[]
  data_inicio?: string
  data_fim?: string
  data_field?: string
  status?: string
  tipo?: string
  busca?: string
  ordenar_por?: string
  ordenar_dir?: 'asc' | 'desc'
  page?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQS(params: RelatorioParams & { formato?: string }): string {
  const qs = new URLSearchParams()
  qs.set('fonte', params.fonte)
  if (params.formato) qs.set('formato', params.formato)
  if (params.campos?.length) qs.set('campos', params.campos.join(','))
  if (params.data_inicio) qs.set('data_inicio', params.data_inicio)
  if (params.data_fim) qs.set('data_fim', params.data_fim)
  if (params.data_field) qs.set('data_field', params.data_field)
  if (params.status) qs.set('status', params.status)
  if (params.tipo) qs.set('tipo', params.tipo)
  if (params.busca) qs.set('busca', params.busca)
  if (params.ordenar_por) qs.set('ordenar_por', params.ordenar_por)
  if (params.ordenar_dir) qs.set('ordenar_dir', params.ordenar_dir)
  if (params.page) qs.set('page', String(params.page))
  return qs.toString()
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function getRelatorioMetadados(): Promise<RelatorioMetadados> {
  return apiGet<RelatorioMetadados>('/api/v1/relatorios/metadados/')
}

export async function getRelatorioPreview(params: RelatorioParams): Promise<RelatorioResultado> {
  return apiGet<RelatorioResultado>(`/api/v1/relatorios/titulos/?${buildQS(params)}`)
}

export async function exportarRelatorio(
  params: RelatorioParams,
  formato: 'excel' | 'csv',
): Promise<void> {
  const qs = buildQS({ ...params, formato })
  const resp = await apiFetch(`/api/v1/relatorios/titulos/?${qs}`)
  if (!resp.ok) throw new Error(`Erro ao exportar: ${resp.status}`)

  const blob = await resp.blob()
  const ext = formato === 'excel' ? 'xlsx' : 'csv'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio_${params.fonte}_${new Date().toISOString().slice(0, 10)}.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
