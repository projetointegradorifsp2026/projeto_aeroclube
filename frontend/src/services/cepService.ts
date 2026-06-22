interface ViaCEPResponse {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export interface EnderecoViaCEP {
  logradouro: string
  bairro: string
  cidade: string
  uf: string
}

export async function buscarEnderecoPorCEP(cep: string): Promise<EnderecoViaCEP | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (!resp.ok) return null
    const data: ViaCEPResponse = await resp.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      uf: data.uf ?? '',
    }
  } catch {
    return null
  }
}
