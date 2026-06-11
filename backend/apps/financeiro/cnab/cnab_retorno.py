"""
Leitor do arquivo de retorno CNAB240 — Sicoob (cobrança / retorno de títulos).

Espelha o gerador `cnab240.py`: aqui interpretamos o conteúdo posicional do
arquivo .RET que o banco devolve, extraindo, para cada título, a ocorrência
(liquidação, baixa, rejeição etc.), o "Nosso Número", o valor pago e as datas.

Estrutura do retorno de cobrança (FEBRABAN CNAB240):
    Header de Arquivo  (reg "0")
    Header de Lote     (reg "1")
    Detalhe Segmento T (reg "3", segmento "T") — ocorrência, nosso número, nº doc
    Detalhe Segmento U (reg "3", segmento "U") — valores (pago, juros) e datas
    Trailer de Lote    (reg "5")
    Trailer de Arquivo (reg "9")

Os segmentos T e U vêm em pares (mesmo título), T seguido de U.
"""
from decimal import Decimal
from datetime import datetime


def _linhas_240(conteudo: str) -> list:
    """
    Quebra o conteúdo em registros de 240 posições. Aceita arquivos com quebras
    de linha (CRLF/LF) ou um único fluxo contínuo de 240 em 240 caracteres.
    """
    bruto = conteudo.replace("\r\n", "\n").replace("\r", "\n")
    linhas = [l for l in bruto.split("\n") if l.strip()]
    if linhas and all(len(l) >= 240 for l in linhas):
        return [l[:240] for l in linhas]
    # Sem quebras confiáveis: fatia o fluxo em blocos de 240.
    fluxo = bruto.replace("\n", "")
    return [fluxo[i:i + 240] for i in range(0, len(fluxo), 240) if fluxo[i:i + 240].strip()]


def _digitos(texto: str) -> str:
    return "".join(filter(str.isdigit, texto or ""))


def _valor(trecho: str) -> Decimal:
    """Campo monetário CNAB (15 dígitos, 2 decimais implícitos) → Decimal."""
    d = _digitos(trecho) or "0"
    return (Decimal(d) / Decimal("100")).quantize(Decimal("0.01"))


def _data(trecho: str):
    """Campo de data DDMMAAAA → date (ou None se zerado/ inválido)."""
    d = _digitos(trecho)
    if len(d) != 8 or d == "00000000":
        return None
    try:
        return datetime.strptime(d, "%d%m%Y").date()
    except ValueError:
        return None


def ler_arquivo_retorno(conteudo: str) -> list:
    """
    Interpreta o conteúdo de um arquivo .RET e devolve uma lista de ocorrências:
        [{
            "nosso_numero": str,   # 20 pos do segmento T (sem zeros à esquerda)
            "seu_numero": str,     # nº do documento que enviamos (id do título)
            "codigo_ocorrencia": str,  # 2 dígitos (ex.: "06")
            "valor_pago": Decimal,
            "data_pagamento": date | None,
        }, ...]
    Cada ocorrência casa um par de segmentos T (chave/ocorrência) + U (valores).
    """
    ocorrencias = []
    pendente = None  # segmento T aguardando o U correspondente

    for linha in _linhas_240(conteudo):
        tipo_registro = linha[7:8]
        segmento = linha[13:14].upper()
        if tipo_registro != "3":
            continue

        if segmento == "T":
            pendente = {
                "codigo_ocorrencia": _digitos(linha[15:17]).zfill(2),
                "nosso_numero": linha[37:57].strip(),
                "seu_numero": linha[58:73].strip(),
                "valor_pago": Decimal("0.00"),
                "data_pagamento": None,
            }
        elif segmento == "U":
            valor_pago = _valor(linha[77:92])          # valor pago pelo sacado
            data_pgto = _data(linha[145:153]) or _data(linha[137:145])
            if pendente is not None:
                pendente["valor_pago"] = valor_pago
                pendente["data_pagamento"] = data_pgto
                ocorrencias.append(pendente)
                pendente = None
            else:
                ocorrencias.append({
                    "codigo_ocorrencia": _digitos(linha[15:17]).zfill(2),
                    "nosso_numero": "",
                    "seu_numero": "",
                    "valor_pago": valor_pago,
                    "data_pagamento": data_pgto,
                })

    return ocorrencias
