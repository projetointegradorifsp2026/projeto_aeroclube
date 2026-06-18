// Utilitários compartilhados de feedback (mensagens de erro do backend DRF).

const FIELD_LABELS: Record<string, string> = {
  nome: 'Nome',
  email: 'E-mail',
  cpf_cnpj: 'CPF/CNPJ',
  contato: 'Contato',
  descricao: 'Descrição',
  valor: 'Valor',
  valor_original: 'Valor',
  data_vencimento: 'Vencimento',
  data_emissao: 'Emissão',
  data_pagamento: 'Pagamento',
  prefixo: 'Prefixo',
  favorecido: 'Favorecido',
  participante: 'Participante',
  non_field_errors: 'Erro',
}

/**
 * Extrai uma mensagem legível de um erro do backend DRF.
 * Os serviços lançam `new Error(JSON.stringify(corpoDoErro))`, então aqui
 * tentamos reconstruir uma frase a partir do JSON ({detail} ou {campo: [msgs]}).
 */
export function parseDRFError(err: unknown, fallback = 'Não foi possível concluir a ação'): string {
  if (typeof err === 'string') return err
  const raw = (err as Error)?.message
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed
    if (parsed.detail) return String(parsed.detail)
    const parts = Object.entries(parsed).map(([field, msgs]) => {
      const label = FIELD_LABELS[field] ?? field
      const texto = Array.isArray(msgs) ? msgs.join(', ') : String(msgs)
      return field === 'non_field_errors' ? texto : `${label}: ${texto}`
    })
    return parts.length ? parts.join(' | ') : fallback
  } catch {
    return raw || fallback
  }
}
