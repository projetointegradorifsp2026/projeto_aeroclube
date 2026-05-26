"""
CNAB 240 — Sicoob — Módulo de Cobrança (Títulos a Receber)

Gera o arquivo de REMESSA (enviar ao banco) e processa o RETORNO (baixas automáticas).

Estrutura do arquivo CNAB240:
  ├── Header do Arquivo       (1 registro, tipo 0)
  ├── Header do Lote          (1 registro, tipo 1)
  ├── Registros Detalhe       (N grupos P+Q por título)
  │     ├── Segmento P        (dados do título)
  │     └── Segmento Q        (dados do pagador)
  ├── Trailer do Lote         (1 registro, tipo 5)
  └── Trailer do Arquivo      (1 registro, tipo 9)

Cada linha tem exatamente 240 caracteres + CRLF (Windows).
Codificação: ANSI (latin-1).
"""

import re
from datetime import date, datetime
from decimal import Decimal


# ---------------------------------------------------------------------------
# Helpers de formatação
# ---------------------------------------------------------------------------

def fmt_num(valor, tamanho: int) -> str:
    """Número inteiro alinhado à direita, preenchido com zeros."""
    return str(int(valor or 0)).zfill(tamanho)[:tamanho]


def fmt_valor(valor, tamanho: int, decimais: int = 2) -> str:
    """Valor decimal sem ponto/vírgula, alinhado à direita com zeros."""
    if valor is None:
        valor = Decimal("0")
    centavos = int(round(Decimal(str(valor)) * (10 ** decimais)))
    return str(centavos).zfill(tamanho)[:tamanho]


def fmt_alfa(texto, tamanho: int) -> str:
    """Texto alfanumérico alinhado à esquerda, preenchido com espaços."""
    texto = str(texto or "").upper()
    # Remove caracteres especiais inválidos para ANSI
    texto = texto.replace("Ç", "C").replace("ç", "C")
    texto = re.sub(r"[ÀÁÂÃÄ]", "A", texto)
    texto = re.sub(r"[ÈÉÊË]", "E", texto)
    texto = re.sub(r"[ÌÍÎÏ]", "I", texto)
    texto = re.sub(r"[ÒÓÔÕÖ]", "O", texto)
    texto = re.sub(r"[ÙÚÛÜ]", "U", texto)
    texto = re.sub(r"[àáâãä]", "A", texto)
    texto = re.sub(r"[èéêë]", "E", texto)
    texto = re.sub(r"[ìíîï]", "I", texto)
    texto = re.sub(r"[òóôõö]", "O", texto)
    texto = re.sub(r"[ùúûü]", "U", texto)
    return texto.ljust(tamanho)[:tamanho]


def fmt_data(d) -> str:
    """Data no formato DDMMAAAA."""
    if d is None:
        return "00000000"
    if isinstance(d, (date, datetime)):
        return d.strftime("%d%m%Y")
    return "00000000"


def fmt_hora(dt: datetime) -> str:
    """Hora no formato HHMMSS."""
    return dt.strftime("%H%M%S")


def limpar_doc(doc: str) -> str:
    """Remove caracteres não numéricos de CPF/CNPJ."""
    return re.sub(r"\D", "", str(doc or ""))


def _valida_linha(linha: str, num: int):
    if len(linha) != 240:
        raise ValueError(f"Linha {num} tem {len(linha)} caracteres (esperado 240): {linha!r}")
