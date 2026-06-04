import { apiList, apiPost, apiDelete } from '@/services/api/client'
import { type TituloReceber, type TituloReceberTipo, type TituloReceberStatus } from '@/mocks/titulos'

interface BackendTituloReceber {
  id: number
  participante: number | null
  cliente: number | null
  participante_nome: string
  tipo: string
  descricao: string
  voo: number | null
  num_parcela: number
  total_parcelas: number
  valor_original: string
  multa: string
  juros_aplicado?: string  // compatibilidade temporária com campo antigo
  valor_pago: string
  valor_via_carteira: string
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

  const multaVal = parseFloat(t.multa ?? t.juros_aplicado ?? '0')
  const valorViaCarteira = parseFloat(t.valor_via_carteira || '0')
  return {
    id: String(t.id),
    usuario_id: t.participante ? String(t.participante) : String(t.cliente ?? ''),
    usuario_nome: t.participante_nome,
    is_cliente: t.cliente !== null && t.participante === null,
    tipo: (TIPO_BACKEND_TO_FRONTEND[t.tipo] ?? 'pontual') as TituloReceberTipo,
    descricao: t.descricao,
    num_parcela: t.num_parcela,
    total_parcelas: t.total_parcelas,
    valor: parseFloat(t.valor_original),
    valor_pago: valorPago,
    juros_aplicado: multaVal,
    multa: multaVal,
    valor_carteira: valorViaCarteira > 0 ? valorViaCarteira : undefined,
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

export async function createTituloReceber(
  data: Omit<TituloReceber, 'id'> & { cliente_id?: string },
): Promise<TituloReceber> {
  const isCliente = !!data.cliente_id
  const payload = {
    participante: isCliente ? undefined : (data.usuario_id ? parseInt(data.usuario_id) : undefined),
    cliente: isCliente ? parseInt(data.cliente_id!) : undefined,
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
  if (data.multa !== undefined) payload.multa = data.multa.toFixed ? data.multa.toFixed(2) : String(data.multa)

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
  valorCarteira = 0,
): Promise<TituloReceber> {
  const updated = await apiPost<BackendTituloReceber>(
    `/api/v1/titulos-receber/${id}/baixa-parcial/`,
    {
      valor: valorNovoPagamento.toFixed(2),
      multa: multa.toFixed(2),
      data_pagamento: dataPagamento,
      valor_via_carteira: valorCarteira.toFixed(2),
    },
  )
  return adaptTitulo(updated)
}

export type { TituloReceber, TituloReceberTipo, TituloReceberStatus }
