"""
Processador de arquivo de RETORNO CNAB240 Sicoob — Cobrança.

Lê o arquivo de retorno enviado pelo Sicoob e aplica baixas automáticas
nos TituloReceber conforme os eventos recebidos.

Eventos processados:
  '06' = Liquidação         → baixa total (ou parcial, pelo valor pago)
  '17' = Liquidação Após Baixa → idem
  '09' = Baixa              → baixa por comando do banco ou vencimento
  '02' = Entrada Confirmada → apenas registra confirmação (sem baixa)
  '03' = Entrada Rejeitada  → marca erro na remessa
"""

import re
from datetime import date, datetime
from decimal import Decimal
from typing import Iterator

from django.db import transaction
from django.utils import timezone


# ---------------------------------------------------------------------------
# Códigos de movimento de retorno que geram baixa no sistema
# ---------------------------------------------------------------------------
CODIGOS_LIQUIDACAO = {"06", "17", "45"}   # pago / liquidado
CODIGOS_BAIXA_BANCO = {"09"}              # baixado pelo banco


# ---------------------------------------------------------------------------
# Helpers de parse
# ---------------------------------------------------------------------------

def _parse_data(s: str) -> date | None:
    """DDMMAAAA → date. Retorna None se zerado."""
    s = s.strip()
    if not s or s == "00000000":
        return None
    try:
        return datetime.strptime(s, "%d%m%Y").date()
    except ValueError:
        return None


def _parse_valor(s: str, decimais: int = 2) -> Decimal:
    """String numérica com decimais implícitos → Decimal."""
    s = s.strip() or "0"
    inteiro = int(s)
    return Decimal(inteiro) / (10 ** decimais)


def _extrair_id_titulo(nosso_numero: str) -> int | None:
    """
    Extrai o ID do TituloReceber a partir do Nosso Número (20 posições).
    Posições 1-10 = NumTitulo (ID do sistema).
    """
    try:
        return int(nosso_numero[:10].strip())
    except (ValueError, IndexError):
        return None


# ---------------------------------------------------------------------------
# Leitura linha a linha
# ---------------------------------------------------------------------------

def _ler_linhas(conteudo: str) -> Iterator[str]:
    """Itera sobre linhas, ignorando linhas em branco."""
    for linha in re.split(r"\r?\n", conteudo):
        if linha.strip():
            yield linha


# ---------------------------------------------------------------------------
# Parsers por tipo de registro
# ---------------------------------------------------------------------------

def _parse_header_arquivo(linha: str) -> dict:
    return {
        "tipo": "header_arquivo",
        "banco": linha[0:3],
        "empresa_tipo_doc": linha[17],
        "empresa_doc": linha[18:32].strip(),
        "nome_empresa": linha[72:102].strip(),
        "data_geracao": _parse_data(linha[143:151]),
        "hora_geracao": linha[151:157],
        "nsa": linha[157:163].strip(),
        "versao_layout": linha[163:166],
    }


def _parse_header_lote(linha: str) -> dict:
    return {
        "tipo": "header_lote",
        "lote": int(linha[3:7]),
        "operacao": linha[8],
        "tipo_servico": linha[9:11],
        "num_remessa": linha[183:191].strip(),
        "data_gravacao": _parse_data(linha[191:199]),
        "data_credito": _parse_data(linha[199:207]),
    }


def _parse_segmento_t(linha: str) -> dict:
    """Segmento T do retorno: espelho do Segmento P da remessa."""
    return {
        "tipo": "segmento_t",
        "lote": int(linha[3:7]),
        "seq": int(linha[8:13]),
        "cod_movimento": linha[15:17].strip(),
        "nosso_numero": linha[37:57],
        "carteira": linha[57],
        "num_documento": linha[58:73].strip(),
        "vencimento": _parse_data(linha[73:81]),
        "valor_titulo": _parse_valor(linha[81:96]),
        "banco_cobrador": linha[96:99],
        "identificacao_empresa": linha[105:130].strip(),
        "cod_moeda": linha[130:132],
        "tipo_doc_pagador": linha[132],
        "doc_pagador": linha[133:148].strip(),
        "nome_pagador": linha[148:188].strip(),
        "num_contrato": linha[188:198].strip(),
        "valor_tarifa": _parse_valor(linha[198:211]),
        "motivo_ocorrencia": linha[213:223].strip(),
    }


def _parse_segmento_u(linha: str) -> dict:
    """Segmento U do retorno: valores financeiros e datas."""
    return {
        "tipo": "segmento_u",
        "lote": int(linha[3:7]),
        "seq": int(linha[8:13]),
        "cod_movimento": linha[15:17].strip(),
        "valor_juros_multa": _parse_valor(linha[17:30]),
        "valor_desconto": _parse_valor(linha[32:45]),
        "valor_abatimento": _parse_valor(linha[47:60]),
        "valor_iof": _parse_valor(linha[62:75]),
        "valor_pago": _parse_valor(linha[77:90]),
        "valor_liquido": _parse_valor(linha[90:103]),
        "data_ocorrencia": _parse_data(linha[137:145]),
        "data_credito": _parse_data(linha[145:153]),
    }


def _parse_trailer_lote(linha: str) -> dict:
    return {
        "tipo": "trailer_lote",
        "lote": int(linha[3:7]),
        "qtd_registros": int(linha[17:23]),
        "qtd_titulos": int(linha[23:29]),
        "valor_total": _parse_valor(linha[29:46]),
    }


def _parse_trailer_arquivo(linha: str) -> dict:
    return {
        "tipo": "trailer_arquivo",
        "qtd_lotes": int(linha[17:23]),
        "qtd_registros": int(linha[23:29]),
    }


# ---------------------------------------------------------------------------
# Parser principal
# ---------------------------------------------------------------------------

def parse_retorno_cnab240(conteudo: str) -> dict:
    """
    Lê o conteúdo do arquivo de retorno e retorna estrutura com todos os eventos.

    Retorna:
        {
            "header": {...},
            "lotes": [
                {
                    "header": {...},
                    "titulos": [
                        {
                            "segmento_t": {...},
                            "segmento_u": {...},
                        },
                        ...
                    ],
                    "trailer": {...},
                }
            ],
            "trailer": {...},
        }
    """
    resultado = {"header": None, "lotes": [], "trailer": None}
    lote_atual = None
    seg_t_atual = None

    for linha in _ler_linhas(conteudo):
        if len(linha) < 8:
            continue

        tipo_reg = linha[7]
        segmento = linha[13] if len(linha) > 13 else ""

        if tipo_reg == "0":
            resultado["header"] = _parse_header_arquivo(linha)

        elif tipo_reg == "1":
            lote_atual = {
                "header": _parse_header_lote(linha),
                "titulos": [],
                "trailer": None,
            }
            resultado["lotes"].append(lote_atual)
            seg_t_atual = None

        elif tipo_reg == "3" and lote_atual is not None:
            if segmento == "T":
                seg_t_atual = _parse_segmento_t(linha)

            elif segmento == "U" and seg_t_atual is not None:
                seg_u = _parse_segmento_u(linha)
                lote_atual["titulos"].append({
                    "segmento_t": seg_t_atual,
                    "segmento_u": seg_u,
                })
                seg_t_atual = None  # resetar para próximo par

        elif tipo_reg == "5" and lote_atual is not None:
            lote_atual["trailer"] = _parse_trailer_lote(linha)

        elif tipo_reg == "9":
            resultado["trailer"] = _parse_trailer_arquivo(linha)

    return resultado


# ---------------------------------------------------------------------------
# Processador de baixas
# ---------------------------------------------------------------------------

def processar_retorno_cnab240(conteudo: str) -> dict:
    """
    Processa o arquivo de retorno e aplica baixas nos TituloReceber.

    Retorna um relatório com:
        - liquidados: lista de IDs dos títulos baixados com sucesso
        - confirmados: títulos com entrada confirmada (sem baixa)
        - rejeitados: títulos com problemas
        - erros: erros de processamento
    """
    from apps.financeiro.titulos_receber.models import TituloReceber

    retorno = parse_retorno_cnab240(conteudo)
    relatorio = {
        "arquivo": retorno.get("header", {}),
        "liquidados": [],
        "confirmados": [],
        "rejeitados": [],
        "erros": [],
    }

    for lote in retorno.get("lotes", []):
        for item in lote.get("titulos", []):
            seg_t = item["segmento_t"]
            seg_u = item["segmento_u"]
            cod_mov = seg_t["cod_movimento"]
            nosso_numero = seg_t["nosso_numero"]
            titulo_id = _extrair_id_titulo(nosso_numero)

            if titulo_id is None:
                relatorio["erros"].append({
                    "nosso_numero": nosso_numero,
                    "motivo": "Não foi possível extrair o ID do título do Nosso Número",
                })
                continue

            # ---------------------------------------------------------------
            # Liquidação / Baixa → aplica baixa no TituloReceber
            # ---------------------------------------------------------------
            if cod_mov in CODIGOS_LIQUIDACAO or cod_mov in CODIGOS_BAIXA_BANCO:
                try:
                    with transaction.atomic():
                        titulo = TituloReceber.objects.select_for_update().get(pk=titulo_id)

                        if titulo.status == TituloReceber.STATUS_BAIXADO:
                            relatorio["erros"].append({
                                "titulo_id": titulo_id,
                                "motivo": "Título já estava baixado no sistema",
                                "cod_movimento": cod_mov,
                            })
                            continue

                        valor_pago = seg_u["valor_pago"]
                        juros = seg_u["valor_juros_multa"]
                        data_pgto = seg_u["data_ocorrencia"] or seg_u["data_credito"] or timezone.now().date()

                        titulo.aplicar_baixa_parcial(
                            valor=valor_pago,
                            juros=juros,
                            data=data_pgto,
                        )

                        relatorio["liquidados"].append({
                            "titulo_id": titulo_id,
                            "cod_movimento": cod_mov,
                            "valor_pago": str(valor_pago),
                            "juros": str(juros),
                            "data_pagamento": str(data_pgto),
                            "status_final": titulo.status,
                        })

                except TituloReceber.DoesNotExist:
                    relatorio["erros"].append({
                        "titulo_id": titulo_id,
                        "nosso_numero": nosso_numero,
                        "motivo": f"TituloReceber id={titulo_id} não encontrado",
                        "cod_movimento": cod_mov,
                    })
                except Exception as exc:
                    relatorio["erros"].append({
                        "titulo_id": titulo_id,
                        "motivo": str(exc),
                        "cod_movimento": cod_mov,
                    })

            # ---------------------------------------------------------------
            # Entrada Confirmada → apenas registra
            # ---------------------------------------------------------------
            elif cod_mov == "02":
                relatorio["confirmados"].append({
                    "titulo_id": titulo_id,
                    "nosso_numero": nosso_numero,
                    "vencimento": str(seg_t["vencimento"] or ""),
                    "valor": str(seg_t["valor_titulo"]),
                })

            # ---------------------------------------------------------------
            # Rejeitado → alerta
            # ---------------------------------------------------------------
            elif cod_mov == "03":
                relatorio["rejeitados"].append({
                    "titulo_id": titulo_id,
                    "nosso_numero": nosso_numero,
                    "motivo_ocorrencia": seg_t["motivo_ocorrencia"],
                })

    return relatorio
