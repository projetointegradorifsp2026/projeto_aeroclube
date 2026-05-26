"""
Gerador de arquivo de REMESSA CNAB240 Sicoob — Cobrança Simples com Registro.

Uso:
    from apps.financeiro.cnab240.remessa import gerar_remessa_cnab240
    conteudo = gerar_remessa_cnab240(titulos, config)
"""

from datetime import datetime
from decimal import Decimal

from .utils import (
    fmt_alfa, fmt_data, fmt_hora, fmt_num, fmt_valor, limpar_doc, _valida_linha
)


# ---------------------------------------------------------------------------
# Header do Arquivo (Tipo 0) — 240 posições
# ---------------------------------------------------------------------------

def _header_arquivo(cfg: dict, sequencia: int, dt: datetime) -> str:
    doc = limpar_doc(cfg["cnpj_cpf"])
    tipo_doc = "2" if len(doc) == 14 else "1"

    partes = [
        "756",                                     # 001-003  Banco Sicoob
        "0000",                                    # 004-007  Lote (header = 0000)
        "0",                                       # 008-008  Tipo Registro
        " " * 9,                                   # 009-017  CNAB
        tipo_doc,                                  # 018-018  Tipo Inscrição
        fmt_num(doc, 14),                          # 019-032  CNPJ/CPF
        " " * 20,                                  # 033-052  Convênio
        fmt_num(cfg["agencia"], 5),                # 053-057  Prefixo
        fmt_alfa(cfg.get("agencia_dv", "0"), 1),  # 058-058  DV Prefixo
        fmt_num(cfg["conta"], 12),                 # 059-070  Conta
        fmt_num(cfg.get("conta_dv", "0"), 1),     # 071-071  DV Conta
        "0",                                       # 072-072  DV Ag/Conta
        fmt_alfa(cfg["nome_empresa"], 30),         # 073-102  Nome da Empresa
        fmt_alfa("SICOOB", 30),                    # 103-132  Nome do Banco
        " " * 10,                                  # 133-142  CNAB
        "1",                                       # 143-143  Remessa
        fmt_data(dt),                              # 144-151  Data Geração
        fmt_hora(dt),                              # 152-157  Hora Geração
        fmt_num(sequencia, 6),                     # 158-163  NSA
        "081",                                     # 164-166  Versão Layout
        "00000",                                   # 167-171  Densidade
        " " * 20,                                  # 172-191  Reservado Banco
        " " * 20,                                  # 192-211  Reservado Empresa
        " " * 29,                                  # 212-240  CNAB
    ]
    linha = "".join(partes)
    _valida_linha(linha, 0)
    return linha


# ---------------------------------------------------------------------------
# Header do Lote (Tipo 1) — 240 posições
# ---------------------------------------------------------------------------

def _header_lote(cfg: dict, lote: int, dt: datetime) -> str:
    doc = limpar_doc(cfg["cnpj_cpf"])
    tipo_doc = "2" if len(doc) == 14 else "1"

    partes = [
        "756",                                     # 001-003  Banco
        fmt_num(lote, 4),                          # 004-007  Lote
        "1",                                       # 008-008  Tipo Registro
        "R",                                       # 009-009  Operação Remessa
        "01",                                      # 010-011  Tipo Serviço Cobrança
        "  ",                                      # 012-013  CNAB
        "040",                                     # 014-016  Versão Layout Lote
        " ",                                       # 017-017  CNAB
        tipo_doc,                                  # 018-018  Tipo Inscrição
        fmt_num(doc, 15),                          # 019-033  CNPJ/CPF
        " " * 20,                                  # 034-053  Convênio
        fmt_num(cfg["agencia"], 5),                # 054-058  Prefixo
        fmt_alfa(cfg.get("agencia_dv", "0"), 1),  # 059-059  DV
        fmt_num(cfg["conta"], 12),                 # 060-071  Conta
        fmt_num(cfg.get("conta_dv", "0"), 1),     # 072-072  DV Conta
        " ",                                       # 073-073  DV Ag/Conta
        fmt_alfa(cfg["nome_empresa"], 30),         # 074-103  Nome
        " " * 40,                                  # 104-143  Mensagem 1
        " " * 40,                                  # 144-183  Mensagem 2
        fmt_num(cfg.get("num_remessa", 1), 8),     # 184-191  Nº Remessa
        fmt_data(dt),                              # 192-199  Data Gravação
        "00000000",                                # 200-207  Data Crédito
        " " * 33,                                  # 208-240  CNAB
    ]
    linha = "".join(partes)
    _valida_linha(linha, -1)
    return linha


# ---------------------------------------------------------------------------
# Segmento P — Dados do título (Tipo 3, Seg P)
# ---------------------------------------------------------------------------

def _segmento_p(cfg: dict, titulo, seq: int, lote: int, cod_movimento: str = "01") -> str:
    nosso_numero = _montar_nosso_numero(titulo)
    valor = titulo.saldo_devedor
    num_doc = str(titulo.id).zfill(15)

    partes = [
        "756",                                       # 001-003  Banco
        fmt_num(lote, 4),                            # 004-007  Lote
        "3",                                         # 008-008  Tipo Registro
        fmt_num(seq, 5),                             # 009-013  Nº Sequencial
        "P",                                         # 014-014  Segmento
        " ",                                         # 015-015  CNAB
        fmt_num(cod_movimento, 2),                   # 016-017  Cód. Movimento
        fmt_num(cfg["agencia"], 5),                  # 018-022  Prefixo
        fmt_alfa(cfg.get("agencia_dv", "0"), 1),    # 023-023  DV
        fmt_num(cfg["conta"], 12),                   # 024-035  Conta
        fmt_num(cfg.get("conta_dv", "0"), 1),       # 036-036  DV Conta
        " ",                                         # 037-037  DV Ag/Conta
        fmt_alfa(nosso_numero, 20),                  # 038-057  Nosso Número
        fmt_num(cfg.get("carteira", "1"), 1),        # 058-058  Carteira
        "0",                                         # 059-059  Cadastramento
        " ",                                         # 060-060  Tipo Documento
        fmt_num(cfg.get("emissao_boleto", "2"), 1),  # 061-061  Emissão
        fmt_num(cfg.get("dist_boleto", "2"), 1),     # 062-062  Distribuição
        fmt_alfa(num_doc, 15),                       # 063-077  Nº Documento
        fmt_data(titulo.data_vencimento),            # 078-085  Vencimento
        fmt_valor(valor, 15, 2),                     # 086-098  Valor Nominal
        "00000",                                     # 099-103  Ag. Cobradora
        " ",                                         # 104-104  DV Ag. Cobradora
        "04",                                        # 105-106  Espécie (DS)
        "N",                                         # 107-107  Aceite
        fmt_data(titulo.data_emissao),               # 108-115  Data Emissão
        "1",                                         # 116-116  Cód. Juros (1=Valor/Dia)
        "00000000",                                  # 117-124  Data Juros
        fmt_valor(Decimal("0"), 13, 2),              # 125-137  Juros/Dia
        "0",                                         # 138-138  Cód. Desconto
        "00000000",                                  # 139-146  Data Desconto
        fmt_valor(Decimal("0"), 13, 2),              # 147-159  Desconto
        fmt_valor(Decimal("0"), 13, 2),              # 160-172  IOF
        fmt_valor(Decimal("0"), 13, 2),              # 173-185  Abatimento
        fmt_alfa(str(titulo.id), 25),                # 186-210  Uso Empresa
        "3",                                         # 211-211  Cód. Protesto (3=Não)
        "00",                                        # 212-213  Prazo Protesto
        "0",                                         # 214-214  Cód. Baixa
        "   ",                                       # 215-217  Prazo Baixa
        "09",                                        # 218-219  Moeda (09=Real)
        "0000000000",                                # 220-229  Nº Contrato
        " ",                                         # 230-230  CNAB
    ]
    linha = "".join(partes)
    _valida_linha(linha, seq)
    return linha


# ---------------------------------------------------------------------------
# Segmento Q — Dados do pagador (Tipo 3, Seg Q)
# ---------------------------------------------------------------------------

def _segmento_q(cfg: dict, titulo, seq: int, lote: int, cod_movimento: str = "01") -> str:
    pagador = titulo.participante
    doc_pagador = limpar_doc(getattr(pagador, "cpf_cnpj", "") or "")
    tipo_doc = "2" if len(doc_pagador) == 14 else "1"
    nome = getattr(pagador, "nome", "") or ""

    partes = [
        "756",                             # 001-003  Banco
        fmt_num(lote, 4),                  # 004-007  Lote
        "3",                               # 008-008  Tipo Registro
        fmt_num(seq, 5),                   # 009-013  Sequencial
        "Q",                               # 014-014  Segmento
        " ",                               # 015-015  CNAB
        fmt_num(cod_movimento, 2),         # 016-017  Cód. Movimento
        tipo_doc,                          # 018-018  Tipo Inscrição Pagador
        fmt_num(doc_pagador, 15),          # 019-033  CPF/CNPJ
        fmt_alfa(nome, 40),                # 034-073  Nome
        " " * 40,                          # 074-113  Endereço
        " " * 15,                          # 114-128  Bairro
        "00000",                           # 129-133  CEP
        "000",                             # 134-136  Sufixo CEP
        fmt_alfa(" ", 15),                 # 137-151  Cidade
        "MG",                              # 152-153  UF
        "0",                               # 154-154  Tipo Sacador
        "000000000000000",                 # 155-169  Doc Sacador
        " " * 40,                          # 170-209  Nome Sacador
        "000",                             # 210-212  Cód. Banco Corresp.
        " " * 20,                          # 213-232  Nosso Nº Banco Corresp.
        " " * 8,                           # 233-240  CNAB
    ]
    linha = "".join(partes)
    _valida_linha(linha, seq)
    return linha


# ---------------------------------------------------------------------------
# Trailer do Lote (Tipo 5) — 240 posições
# ---------------------------------------------------------------------------

def _trailer_lote(lote: int, qtd_registros: int, qtd_titulos: int, valor_total: Decimal) -> str:
    partes = [
        "756",                                      # 001-003  Banco
        fmt_num(lote, 4),                           # 004-007  Lote
        "5",                                        # 008-008  Tipo Registro
        " " * 9,                                    # 009-017  CNAB
        fmt_num(qtd_registros, 6),                  # 018-023  Qtd Registros
        fmt_num(qtd_titulos, 6),                    # 024-029  Qtd Títulos Simples
        fmt_valor(valor_total, 17, 2),              # 030-046  Valor Total
        fmt_num(0, 6),                              # 047-052  Qtd Vinculada
        fmt_valor(Decimal("0"), 17, 2),             # 053-069  Valor Vinculada
        fmt_num(0, 6),                              # 070-075  Qtd Caucionada
        fmt_valor(Decimal("0"), 17, 2),             # 076-092  Valor Caucionada
        fmt_num(0, 6),                              # 093-098  Qtd Descontada
        fmt_valor(Decimal("0"), 17, 2),             # 099-115  Valor Descontada
        " " * 8,                                    # 116-123  Nº Aviso
        " " * 117,                                  # 124-240  CNAB
    ]
    linha = "".join(partes)
    _valida_linha(linha, -2)
    return linha


# ---------------------------------------------------------------------------
# Trailer do Arquivo (Tipo 9) — 240 posições
# ---------------------------------------------------------------------------

def _trailer_arquivo(qtd_lotes: int, qtd_registros_total: int) -> str:
    partes = [
        "756",                             # 001-003  Banco
        "9999",                            # 004-007  Lote (9999)
        "9",                               # 008-008  Tipo Registro
        " " * 9,                           # 009-017  CNAB
        fmt_num(qtd_lotes, 6),             # 018-023  Qtd Lotes
        fmt_num(qtd_registros_total, 6),   # 024-029  Qtd Registros Total
        fmt_num(0, 6),                     # 030-035  Qtd Contas Concil.
        " " * 205,                         # 036-240  CNAB
    ]
    linha = "".join(partes)
    _valida_linha(linha, -3)
    return linha


# ---------------------------------------------------------------------------
# Helper: monta nosso número
# ---------------------------------------------------------------------------

def _montar_nosso_numero(titulo) -> str:
    """
    Nosso Número (20 posições) — emissão a cargo do Beneficiário:
      01-10: NumTitulo (ID do título, 10 dígitos)
      11-12: Parcela  ("01" = parcela única)
      13-14: Modalidade (vide Contracapa do layout Sicoob)
      15:    Tipo Formulário ("4" = A4 sem envelopamento)
      16-20: Brancos
    """
    num = str(titulo.id).zfill(10)[:10]
    parcela = str(titulo.num_parcela).zfill(2)
    return num + parcela + "01" + "4" + "     "


# ---------------------------------------------------------------------------
# Função principal
# ---------------------------------------------------------------------------

def gerar_remessa_cnab240(titulos, cfg: dict, sequencia: int = 1) -> str:
    """
    Gera o conteúdo completo do arquivo CNAB240 de remessa.

    Parâmetros:
        titulos:    queryset ou lista de TituloReceber
        cfg:        dict com dados da conta Sicoob:
                      cnpj_cpf, nome_empresa, agencia, agencia_dv,
                      conta, conta_dv, carteira, num_remessa
        sequencia:  NSA do arquivo (incrementar a cada remessa)

    Retorna:
        String com o conteúdo do arquivo, linhas separadas por CRLF (Windows).
        Encodificar com latin-1 antes de gravar em disco.
    """
    if not titulos:
        raise ValueError("Nenhum título informado para gerar remessa.")

    dt = datetime.now()
    lote = 1
    linhas = []

    linhas.append(_header_arquivo(cfg, sequencia, dt))
    linhas.append(_header_lote(cfg, lote, dt))

    seq = 1
    qtd_titulos = 0
    valor_total = Decimal("0")

    for titulo in titulos:
        linhas.append(_segmento_p(cfg, titulo, seq, lote))
        seq += 1
        linhas.append(_segmento_q(cfg, titulo, seq, lote))
        seq += 1
        qtd_titulos += 1
        valor_total += titulo.saldo_devedor

    # header lote + segmentos + trailer lote
    qtd_registros_lote = 2 + (qtd_titulos * 2) + 1

    linhas.append(_trailer_lote(lote, qtd_registros_lote, qtd_titulos, valor_total))

    # header arquivo + registros lote + trailer arquivo
    qtd_total = 1 + qtd_registros_lote + 1

    linhas.append(_trailer_arquivo(1, qtd_total))

    return "\r\n".join(linhas) + "\r\n"
