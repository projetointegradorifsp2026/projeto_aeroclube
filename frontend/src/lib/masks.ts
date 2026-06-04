/**
 * Máscaras de input reutilizáveis (CPF/CNPJ, telefone, CEP).
 * Aplicar no onChange dos inputs: value={x} onChange={e => set(maskX(e.target.value))}.
 */

/** CPF (000.000.000-00) até 11 dígitos; CNPJ (00.000.000/0000-00) acima disso. */
export function maskCpfCnpj(value: string): string {
  const d = value.replace(/\D/g, '')
  if (d.length <= 11) {
    const s = d.slice(0, 11)
    if (s.length <= 3) return s
    if (s.length <= 6) return `${s.slice(0, 3)}.${s.slice(3)}`
    if (s.length <= 9) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6)}`
    return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`
  }
  const s = d.slice(0, 14)
  if (s.length <= 2) return s
  if (s.length <= 5) return `${s.slice(0, 2)}.${s.slice(2)}`
  if (s.length <= 8) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5)}`
  if (s.length <= 12) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8)}`
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
}

/** Telefone fixo (00) 0000-0000 ou celular (00) 00000-0000. */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** CEP (00000-000). */
export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}
