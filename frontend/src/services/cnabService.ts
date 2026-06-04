import { apiList, apiGet, apiPost, apiPatch } from '@/services/api/client'

// ─── Configuração Bancária (cedente / aeroclube) ──────────────────────────────

export interface ConfiguracaoBancaria {
  id?: number
  descricao: string
  codigo_banco: string
  nome_banco: string
  nome_beneficiario: string
  cpf_cnpj: string
  prefixo_cooperativa: string
  dv_prefixo: string
  codigo_beneficiario: string
  dv_beneficiario: string
  conta_corrente: string
  dv_conta: string
  carteira: string
  modalidade: string
  convenio: string
  proximo_nsa: number
  is_active: boolean
}

export async function getConfiguracoesBancarias(): Promise<ConfiguracaoBancaria[]> {
  return apiList<ConfiguracaoBancaria>('/api/v1/config-bancaria/')
}

export async function createConfiguracaoBancaria(data: Partial<ConfiguracaoBancaria>): Promise<ConfiguracaoBancaria> {
  return apiPost<ConfiguracaoBancaria>('/api/v1/config-bancaria/', data)
}

export async function updateConfiguracaoBancaria(id: number, data: Partial<ConfiguracaoBancaria>): Promise<ConfiguracaoBancaria> {
  return apiPatch<ConfiguracaoBancaria>(`/api/v1/config-bancaria/${id}/`, data)
}

// ─── Dados Bancários (de quem paga/recebe) ────────────────────────────────────

export interface DadosBancarios {
  id?: number
  usuario?: number | null
  entidade?: number | null
  titular_nome?: string
  banco: string
  codigo_banco: string
  agencia: string
  agencia_dv: string
  conta: string
  conta_dv: string
  tipo_conta: 'corrente' | 'poupanca'
  titular: string
  cpf_cnpj_titular: string
  chave_pix: string
}

export function emptyDadosBancarios(): DadosBancarios {
  return {
    banco: '', codigo_banco: '', agencia: '', agencia_dv: '',
    conta: '', conta_dv: '', tipo_conta: 'corrente',
    titular: '', cpf_cnpj_titular: '', chave_pix: '',
  }
}

export async function getDadosBancariosUsuario(usuarioId: string): Promise<DadosBancarios | null> {
  const list = await apiList<DadosBancarios>(`/api/v1/dados-bancarios/?usuario=${usuarioId}`)
  return list[0] ?? null
}

export async function getDadosBancariosEntidade(entidadeId: string): Promise<DadosBancarios | null> {
  const list = await apiList<DadosBancarios>(`/api/v1/dados-bancarios/?entidade=${entidadeId}`)
  return list[0] ?? null
}

/** Cria ou atualiza os dados bancários (upsert por id). */
export async function salvarDadosBancarios(data: DadosBancarios): Promise<DadosBancarios> {
  if (data.id) {
    return apiPatch<DadosBancarios>(`/api/v1/dados-bancarios/${data.id}/`, data)
  }
  return apiPost<DadosBancarios>('/api/v1/dados-bancarios/', data)
}

// ─── Remessas / Retornos CNAB ─────────────────────────────────────────────────

export interface RemessaCNABItem {
  id: number
  titulo_receber: number
  titulo_descricao: string
  nosso_numero: string
  valor: string
}

export interface RemessaCNAB {
  id: number
  configuracao: number
  numero_sequencial: number
  data_geracao: string
  status: string
  status_display: string
  nome_arquivo: string
  quantidade_titulos: number
  valor_total: string
  itens: RemessaCNABItem[]
  created_at: string
}

export async function getRemessas(): Promise<RemessaCNAB[]> {
  return apiList<RemessaCNAB>('/api/v1/remessas-cnab/')
}

export async function getRemessa(id: number): Promise<RemessaCNAB> {
  return apiGet<RemessaCNAB>(`/api/v1/remessas-cnab/${id}/`)
}

export async function gerarRemessa(configuracaoId: number, tituloIds: number[]): Promise<RemessaCNAB> {
  return apiPost<RemessaCNAB>('/api/v1/remessas-cnab/gerar/', {
    configuracao: configuracaoId,
    titulo_ids: tituloIds,
  })
}

export interface RetornoCNAB {
  id: number
  configuracao: number
  data_retorno: string
  status: string
  status_display: string
  nome_arquivo: string
  itens: unknown[]
  created_at: string
}

export async function getRetornos(): Promise<RetornoCNAB[]> {
  return apiList<RetornoCNAB>('/api/v1/retornos-cnab/')
}

// ─── Títulos elegíveis para remessa (status cru "aberto" do backend) ──────────

export interface TituloAberto {
  id: number
  descricao: string
  participante_nome: string
  saldo_devedor: string
  data_vencimento: string
}

interface BackendTituloRaw {
  id: number
  descricao: string
  participante_nome: string
  saldo_devedor: string
  data_vencimento: string
}

export async function getTitulosAbertosParaRemessa(): Promise<TituloAberto[]> {
  const list = await apiList<BackendTituloRaw>('/api/v1/titulos-receber/?status=aberto')
  return list.map(t => ({
    id: t.id,
    descricao: t.descricao,
    participante_nome: t.participante_nome,
    saldo_devedor: t.saldo_devedor,
    data_vencimento: t.data_vencimento,
  }))
}
