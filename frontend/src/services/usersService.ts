import { apiList, apiGet, apiPost, apiPatch } from '@/services/api/client'
import { type User, type UserProfile } from '@/mocks/users'

interface BackendPerfil {
  id: number
  perfil: string
}

interface BackendUser {
  id: number
  nome: string
  cpf_cnpj: string | null
  email: string
  cep: string | null
  logradouro: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  perfil_ativo: string
  perfis: BackendPerfil[]
  is_active: boolean
  date_joined: string
}

interface BackendCarteira {
  id: number
  participante: number
  saldo: string
}

function adaptUser(u: BackendUser, saldo = 0): User {
  return {
    id: String(u.id),
    nome: u.nome,
    email: u.email,
    cpf: u.cpf_cnpj ?? '',
    cep: u.cep ?? '',
    logradouro: u.logradouro ?? '',
    numero: u.numero ?? '',
    bairro: u.bairro ?? '',
    cidade: u.cidade ?? '',
    uf: u.uf ?? '',
    is_active: u.is_active,
    created_at: u.date_joined?.split('T')[0] ?? '',
    perfis: u.perfis.map(p => p.perfil as UserProfile),
    perfil_ativo: u.perfil_ativo as UserProfile,
    saldo_carteira: saldo,
  }
}

async function getSaldoMap(): Promise<Map<number, number>> {
  const carteiras = await apiList<BackendCarteira>('/api/v1/carteiras/')
  return new Map(carteiras.map(c => [c.participante, parseFloat(c.saldo)]))
}

async function getOrCreateCarteira(userId: string): Promise<BackendCarteira> {
  const existing = await apiList<BackendCarteira>(`/api/v1/carteiras/?participante=${userId}`)
  if (existing.length) return existing[0]
  return apiPost<BackendCarteira>('/api/v1/carteiras/', { participante: parseInt(userId) })
}

export async function getUsers(): Promise<User[]> {
  const [users, saldoMap] = await Promise.all([
    apiList<BackendUser>('/api/v1/usuarios/'),
    getSaldoMap(),
  ])
  return users.map(u => adaptUser(u, saldoMap.get(u.id) ?? 0))
}

export async function createUser(
  data: {
    nome: string; email: string; cpf: string; perfis: UserProfile[]; is_active: boolean
    cep?: string; logradouro?: string; numero?: string; bairro?: string; cidade?: string; uf?: string
  },
): Promise<User> {
  const payload = {
    nome: data.nome,
    email: data.email,
    cpf_cnpj: data.cpf || null,
    perfil_ativo: data.perfis[0] ?? 'aluno',
    cep: data.cep || '',
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    bairro: data.bairro || '',
    cidade: data.cidade || '',
    uf: data.uf || '',
  }
  const created = await apiPost<BackendUser>('/api/v1/usuarios/', payload)

  for (const perfil of data.perfis ?? []) {
    try {
      await apiPost(`/api/v1/usuarios/${created.id}/adicionar-perfil/`, { perfil })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (!msg.includes('já possui este perfil')) throw e
    }
  }

  const updated = await apiGet<BackendUser>(`/api/v1/usuarios/${created.id}/`)
  return adaptUser(updated)
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'created_at'>>,
  currentPerfis?: UserProfile[],
): Promise<User> {
  const payload: Record<string, unknown> = {}
  if (data.nome !== undefined) payload.nome = data.nome
  if (data.email !== undefined) payload.email = data.email
  if (data.cpf !== undefined) payload.cpf_cnpj = data.cpf || null
  if (data.cep !== undefined) payload.cep = data.cep || ''
  if (data.logradouro !== undefined) payload.logradouro = data.logradouro || ''
  if (data.numero !== undefined) payload.numero = data.numero || ''
  if (data.bairro !== undefined) payload.bairro = data.bairro || ''
  if (data.cidade !== undefined) payload.cidade = data.cidade || ''
  if (data.uf !== undefined) payload.uf = data.uf || ''
  if (data.is_active !== undefined) payload.is_active = data.is_active

  if (Object.keys(payload).length > 0) {
    await apiPatch<BackendUser>(`/api/v1/usuarios/${id}/`, payload)
  }

  // Sincroniza perfis: adiciona os novos, remove os excluídos
  if (data.perfis !== undefined && currentPerfis !== undefined) {
    const toAdd = data.perfis.filter(p => !currentPerfis.includes(p))
    const toRemove = currentPerfis.filter(p => !data.perfis!.includes(p))

    for (const perfil of toAdd) {
      try {
        await apiPost(`/api/v1/usuarios/${id}/adicionar-perfil/`, { perfil })
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (!msg.includes('já possui este perfil')) throw e
      }
    }
    for (const perfil of toRemove) {
      await apiPost(`/api/v1/usuarios/${id}/remover-perfil/`, { perfil })
    }
  }

  const updated = await apiGet<BackendUser>(`/api/v1/usuarios/${id}/`)
  const saldoMap = await getSaldoMap()
  return adaptUser(updated, saldoMap.get(updated.id) ?? 0)
}

export async function deleteUser(id: string): Promise<void> {
  await apiPatch(`/api/v1/usuarios/${id}/`, { is_active: false })
}

export async function resetPassword(id: string): Promise<void> {
  await apiPost(`/api/v1/usuarios/${id}/resetar-senha/`, {})
}

export interface CreditoHorasMetadados {
  aeronave_id: number
  aeronave_nome: string
  aeronave_tipo: 'aviao' | 'planador'
  tipo_voo: 'solo' | 'duplo' | null
  tarifa: number
  horas: number
}

/**
 * Adicionar saldo: cria uma Receita pendente de horas pré-pagas.
 * O saldo NA CARTEIRA só é creditado quando o TituloReceber vinculado for baixado.
 * Retorna o usuário com o saldo INALTERADO (pois ainda não foi efetivado).
 */
export async function addSaldoCarteira(
  id: string,
  valor: number,
  descricao: string,
  dataVencimento: string,
  horasMetadados?: CreditoHorasMetadados,
): Promise<User> {
  const carteira = await getOrCreateCarteira(id)
  await apiPost(`/api/v1/carteiras/${carteira.id}/creditar/`, {
    valor: valor.toFixed(2),
    descricao,
    data_vencimento: dataVencimento,
    ...(horasMetadados
      ? {
          aeronave_id: horasMetadados.aeronave_id,
          tipo_voo: horasMetadados.tipo_voo,
          horas: horasMetadados.horas.toFixed(2),
        }
      : {}),
  })
  // Saldo não mudou ainda — retorna usuário com saldo atual
  const [user, saldoMap] = await Promise.all([
    apiGet<BackendUser>(`/api/v1/usuarios/${id}/`),
    getSaldoMap(),
  ])
  return adaptUser(user, saldoMap.get(user.id) ?? 0)
}

/**
 * Remover saldo: cria um Custo pendente de remoção de saldo.
 * O débito NA CARTEIRA só ocorre quando o TituloPagar vinculado for baixado.
 */
export async function removerSaldoCarteira(
  id: string,
  valor: number,
  descricao?: string,
): Promise<{ custo_id: number }> {
  const carteira = await getOrCreateCarteira(id)
  return apiPost<{ custo_id: number }>(`/api/v1/carteiras/${carteira.id}/debitar/`, {
    valor: valor.toFixed(2),
    descricao: descricao || 'Remoção de saldo da carteira',
    remocao_saldo: true,
  })
}

export interface TarifaHistoricaItem {
  nome: string
  tipo: 'aviao' | 'planador'
  tarifa_solo?: string
  tarifa_duplo_comando?: string
  minutos_franquia?: number
  valor_fixo_inicial?: string
  valor_minuto_adicional?: string
  valor_fixo_duplo?: string | null
  valor_minuto_duplo?: string | null
}

export interface MovimentacaoCarteira {
  id: string
  tipo: 'credito' | 'debito' | 'ajuste'
  valor: number
  saldo_restante: number | null
  status_lote: 'valido' | 'expirado' | null
  descricao: string
  data_transacao: string
  data_vencimento: string | null
  metadados: CreditoHorasMetadados | null
  tarifas_historicas: Record<string, TarifaHistoricaItem> | null
}

interface BackendMovimentacao {
  id: number
  tipo: string
  valor: string
  saldo_restante: string | null
  status_lote: 'valido' | 'expirado' | null
  descricao: string
  data_transacao: string
  data_vencimento: string | null
  metadados: CreditoHorasMetadados | null
  tarifas_historicas: Record<string, TarifaHistoricaItem> | null
}

export async function getMovimentacoesCarteira(userId: string): Promise<MovimentacaoCarteira[]> {
  const items = await apiList<BackendMovimentacao>(
    `/api/v1/movimentacoes-carteira/?participante=${userId}`,
  )
  return items
    .filter(m => m.tipo === 'credito')
    .map(m => ({
      id: String(m.id),
      tipo: m.tipo as 'credito' | 'debito' | 'ajuste',
      valor: parseFloat(m.valor),
      saldo_restante: m.saldo_restante != null ? parseFloat(m.saldo_restante) : null,
      status_lote: m.status_lote ?? null,
      descricao: m.descricao,
      data_transacao: m.data_transacao,
      data_vencimento: m.data_vencimento,
      metadados: m.metadados,
      tarifas_historicas: m.tarifas_historicas ?? null,
    }))
}

export async function debitarCarteira(id: string, valor: number): Promise<User | null> {
  const carteira = await getOrCreateCarteira(id)
  await apiPost(`/api/v1/carteiras/${carteira.id}/debitar/`, {
    valor: valor.toFixed(2),
    descricao: 'Débito via carteira',
  })
  // Refresh do usuário é não-crítico: o débito já ocorreu; se falhar, não bloqueia o fluxo
  try {
    const [user, saldoMap] = await Promise.all([
      apiGet<BackendUser>(`/api/v1/usuarios/${id}/`),
      getSaldoMap(),
    ])
    return adaptUser(user, saldoMap.get(user.id) ?? 0)
  } catch {
    return null
  }
}

export async function calcularCustoVoo(
  userId: string,
  aeronaveId: number,
  tipoVoo: string,
  duracaoMinutos: number,
  dataVoo: string,
): Promise<{ total_calculado: number; saldo_insuficiente: boolean }> {
  const carteira = await getOrCreateCarteira(userId)
  const result = await apiPost<{ total_calculado: string; saldo_insuficiente: boolean }>(
    `/api/v1/carteiras/${carteira.id}/calcular-custo-voo/`,
    {
      aeronave_id: aeronaveId,
      tipo_voo: tipoVoo,
      duracao_minutos: duracaoMinutos,
      data_voo: dataVoo,
    },
  )
  return {
    total_calculado: parseFloat(result.total_calculado),
    saldo_insuficiente: result.saldo_insuficiente,
  }
}

export async function debitarVooCarteira(
  userId: string,
  aeronaveId: number,
  tipoVoo: string,
  duracaoMinutos: number,
  dataVoo: string,
  descricao: string,
  maxDebit?: number,
): Promise<{ total_debitado: number; saldo_atual: number; saldo_insuficiente: boolean }> {
  const carteira = await getOrCreateCarteira(userId)
  const body: Record<string, unknown> = {
    aeronave_id: aeronaveId,
    tipo_voo: tipoVoo,
    duracao_minutos: duracaoMinutos,
    data_voo: dataVoo,
    descricao,
  }
  if (maxDebit !== undefined) body.max_debit = maxDebit.toFixed(2)
  const result = await apiPost<{
    total_debitado: string
    saldo_atual: string
    saldo_insuficiente: boolean
  }>(`/api/v1/carteiras/${carteira.id}/debitar-voo/`, body)
  return {
    total_debitado: parseFloat(result.total_debitado),
    saldo_atual: parseFloat(result.saldo_atual),
    saldo_insuficiente: result.saldo_insuficiente,
  }
}

export type { User, UserProfile }
