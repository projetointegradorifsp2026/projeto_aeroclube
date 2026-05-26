import { apiList, apiPost, apiDelete } from '@/services/api/client'
import { type TituloReceber, type TituloReceberTipo, type TituloReceberStatus } from '@/mocks/titulos'

interface BackendTituloReceber {
  id: number
  participante: number
  participante_nome: string
  tipo: string
  descricao: string
  voo: number | null
  num_parcela: number
  total_parcelas: number
  valor_original: string
  juros_aplicado: string
  valor_pago: string
  valor_total_com_juros: string
  saldo_devedor: string
  data_emissao: string
  data_vencimento: string
  data_pagamento: string | null
  status: string
}

const TIPO_BACKEND_TO_FRONTEND: Record<string, TituloReceberTipo> = {
  mensalidade: 'mensalidade',
  voo: 'voo',
  horas_pre_pagas: 'carteira',
  servico: 'servico',
  outros: 'pontual',
}

const TIPO_FRONTEND_TO_BACKEND: Record<string, string> = {
  mensalidade: 'mensalidade',
  voo: 'voo',
  carteira: 'horas_pre_pagas',
  servico: 'servico',
  pontual: 'outros',
}

function adaptTitulo(t: BackendTituloReceber): TituloReceber {
  const valorPago = parseFloat(t.valor_pago)
  const isAberto = t.status === 'aberto'
  let status: TituloReceberStatus
  if (t.status === 'baixado') {
    status = 'baixado'
  } else if (isAberto && valorPago > 0) {
    status = 'pago_parcial'
  } else {
    status = 'em_aberto'
  }

  return {
    id: String(t.id),
    usuario_id: String(t.participante),
    usuario_nome: t.participante_nome,
    tipo: (TIPO_BACKEND_TO_FRONTEND[t.tipo] ?? 'pontual') as TituloReceberTipo,
    descricao: t.descricao,
    num_parcela: t.num_parcela,
    total_parcelas: t.total_parcelas,
    valor: parseFloat(t.valor_original),
    valor_pago: valorPago,
    juros_aplicado: parseFloat(t.juros_aplicado),
    data_emissao: t.data_emissao,
    data_vencimento: t.data_vencimento,
    data_pagamento: t.data_pagamento,
    status,
  }
}

export async function getTitulosReceber(): Promise<TituloReceber[]> {
  const titulos = await apiList<BackendTituloReceber>('/api/v1/titulos-receber/')
  return titulos.map(adaptTitulo)
}

export async function createTituloReceber(data: Omit<TituloReceber, 'id'>): Promise<TituloReceber> {
  const payload = {
    participante: data.usuario_id ? parseInt(data.usuario_id) : undefined,
    tipo: TIPO_FRONTEND_TO_BACKEND[data.tipo] ?? 'outros',
    descricao: data.descricao,
    num_parcela: data.num_parcela,
    total_parcelas: data.total_parcelas,
    valor_original: data.valor.toFixed(2),
    data_emissao: data.data_emissao,
    data_vencimento: data.data_vencimento,
  }
  const created = await apiPost<BackendTituloReceber>('/api/v1/titulos-receber/', payload)
  return adaptTitulo(created)
}

export async function updateTituloReceber(
  id: string,
  data: Partial<Omit<TituloReceber, 'id'>>,
): Promise<TituloReceber> {
  // TituloReceber updates are mostly done via baixar endpoint
  // Only allow non-financial field updates here
  const payload: Record<string, unknown> = {}
  if (data.descricao !== undefined) payload.descricao = data.descricao
  if (data.data_vencimento !== undefined) payload.data_vencimento = data.data_vencimento

  const res = await fetch(
    `${import.meta.env.VITE_API_URL ?? ''}/api/v1/titulos-receber/${id}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) throw new Error(`PATCH /titulos-receber/${id} → ${res.status}`)
  return adaptTitulo(await res.json() as BackendTituloReceber)
}

export async function deleteTituloReceber(id: string): Promise<void> {
  await apiDelete(`/api/v1/titulos-receber/${id}/`)
}

export async function baixarTituloReceber(
  id: string,
  valorNovoPagamento: number,
  dataPagamento: string,
  multa = 0,
  _valorCarteira = 0,
): Promise<TituloReceber> {
  const updated = await apiPost<BackendTituloReceber>(
    `/api/v1/titulos-receber/${id}/baixa-parcial/`,
    {
      valor: valorNovoPagamento.toFixed(2),
      juros: multa.toFixed(2),
      data_pagamento: dataPagamento,
    },
  )
  return adaptTitulo(updated)
}

export type { TituloReceber, TituloReceberTipo, TituloReceberStatus }
