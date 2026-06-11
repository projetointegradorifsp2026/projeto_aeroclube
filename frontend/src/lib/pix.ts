// Gera o "copia e cola" (BR Code estático, padrão EMV do Banco Central) de uma
// cobrança PIX, com cálculo do CRC16-CCITT. Tudo client-side, sem dependência.
//
// Referência: Manual de Padrões para Iniciação do PIX (BCB) / EMV QRCPS.

function emv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

// CRC16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF).
function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Remove acentos e caracteres não suportados; corta no tamanho máximo do campo.
function sanitize(s: string, max: number): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .trim()
    .slice(0, max)
}

export interface PixParams {
  chave: string
  nome: string
  cidade: string
  valor?: number
  txid?: string
}

/** Retorna a string "copia e cola" do PIX (já com CRC16 no final). */
export function gerarPixCopiaECola({ chave, nome, cidade, valor, txid }: PixParams): string {
  const mai = emv('26', emv('00', 'br.gov.bcb.pix') + emv('01', chave.trim()))
  const nomeOk = sanitize(nome, 25) || 'RECEBEDOR'
  const cidadeOk = sanitize(cidade, 15) || 'CIDADE'
  const txidOk = (txid && sanitize(txid, 25).replace(/ /g, '')) || '***'

  let payload =
    emv('00', '01') + // Payload Format Indicator
    emv('01', '11') + // Point of Initiation Method (estático/reutilizável)
    mai +
    emv('52', '0000') + // Merchant Category Code
    emv('53', '986') + // Moeda (BRL)
    (valor && valor > 0 ? emv('54', valor.toFixed(2)) : '') +
    emv('58', 'BR') +
    emv('59', nomeOk) +
    emv('60', cidadeOk) +
    emv('62', emv('05', txidOk)) // Additional Data (txid)

  payload += '6304' // ID + tamanho do CRC, que entram no cálculo
  return payload + crc16(payload)
}
