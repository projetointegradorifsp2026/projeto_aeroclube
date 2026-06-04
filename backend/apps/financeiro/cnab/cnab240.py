"""
Gerador do arquivo de remessa CNAB240 — Sicoob (cobrança / entrada de títulos).

Monta o conteúdo posicional (linhas de 240 caracteres, CR+LF, ANSI) a partir de
uma RemessaCNAB, sua ConfiguracaoBancaria (cedente) e os títulos a receber
selecionados.

Estrutura do arquivo:
    Header de Arquivo (reg "0")
    Header de Lote    (reg "1", operação "R", serviço "01")
    Detalhe P + Q     (reg "3", um par por título — entrada de títulos)
    Trailer de Lote   (reg "5")
    Trailer de Arquivo(reg "9")

OBS: A homologação efetiva com o Sicoob exige dados de convênio, faixa de
"nosso número" e endereço completo do pagador. Este gerador produz um arquivo
estruturalmente válido (240 posições por registro); campos não disponíveis no
sistema são preenchidos conforme o padrão (zeros/brancos).
"""
import unicodedata
from decimal import Decimal


def _ascii(texto: str) -> str:
    """Remove acentos e caracteres não-ASCII (padrão ANSI do arquivo)."""
    if texto is None:
        texto = ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).encode("ascii", "ignore").decode("ascii")


def num(valor, tamanho: int) -> str:
    """Campo numérico: apenas dígitos, alinhado à direita com zeros."""
    digitos = "".join(filter(str.isdigit, str(valor or "")))
    return digitos[-tamanho:].rjust(tamanho, "0")


def alpha(valor, tamanho: int) -> str:
    """Campo alfanumérico: maiúsculas sem acento, alinhado à esquerda com espaços."""
    texto = _ascii(valor).upper()
    return texto[:tamanho].ljust(tamanho, " ")


def valor_cents(valor, tamanho: int) -> str:
    """Valor monetário com 2 decimais implícitos (valor * 100), zero-padded."""
    centavos = int((Decimal(str(valor or "0")) * 100).quantize(Decimal("1")))
    return str(centavos).rjust(tamanho, "0")


def _montar(campos) -> str:
    """Concatena (texto, tamanho) e garante exatamente 240 posições."""
    linha = "".join(texto for texto, _ in campos)
    esperado = sum(tam for _, tam in campos)
    if len(linha) != 240 or esperado != 240:
        raise ValueError(f"Registro CNAB com {len(linha)} posições (esperado 240).")
    return linha


def _tipo_inscricao(cpf_cnpj: str) -> str:
    """'1' = CPF (11 dígitos), '2' = CNPJ (14 dígitos)."""
    return "2" if len(num(cpf_cnpj, 14).lstrip("0")) > 11 else "1"


def _pagador(titulo):
    """Retorna (nome, cpf_cnpj) do devedor do título (usuário ou cliente externo)."""
    if titulo.participante_id:
        return titulo.participante.nome, titulo.participante.cpf_cnpj or ""
    if titulo.cliente_externo_id:
        return titulo.cliente_externo.nome, titulo.cliente_externo.cpf_cnpj or ""
    return "", ""


def gerar_arquivo_remessa(remessa) -> str:
    """
    Gera o conteúdo do arquivo .REM (string com linhas separadas por CRLF).
    `remessa` é uma instância de RemessaCNAB com .configuracao e .itens.
    """
    cfg = remessa.configuracao
    itens = list(remessa.itens.select_related("titulo_receber").all())

    data_ger = remessa.data_geracao.strftime("%d%m%Y")
    hora_ger = remessa.created_at.strftime("%H%M%S") if remessa.created_at else "000000"
    nsa = remessa.numero_sequencial

    insc_emp = _tipo_inscricao(cfg.cpf_cnpj)
    agencia = num(cfg.prefixo_cooperativa, 5)
    conta = num(cfg.conta_corrente, 12)
    dv_conta = num(cfg.dv_conta, 1)

    linhas = []

    # ─── HEADER DE ARQUIVO (registro 0) ──────────────────────────────────────
    linhas.append(_montar([
        (num(cfg.codigo_banco or "756", 3), 3),
        (num("0", 4), 4),
        (num("0", 1), 1),
        (alpha("", 9), 9),
        (num(insc_emp, 1), 1),
        (num(cfg.cpf_cnpj, 14), 14),
        (alpha("", 20), 20),
        (agencia, 5),
        (alpha(cfg.dv_prefixo, 1), 1),
        (conta, 12),
        (dv_conta, 1),
        (num("0", 1), 1),
        (alpha(cfg.nome_beneficiario, 30), 30),
        (alpha(cfg.nome_banco or "SICOOB", 30), 30),
        (alpha("", 10), 10),
        (num("1", 1), 1),
        (num(data_ger, 8), 8),
        (num(hora_ger, 6), 6),
        (num(nsa, 6), 6),
        (num("081", 3), 3),
        (num("0", 5), 5),
        (alpha("", 20), 20),
        (alpha("", 20), 20),
        (alpha("", 29), 29),
    ]))

    # ─── HEADER DE LOTE (registro 1) ─────────────────────────────────────────
    linhas.append(_montar([
        (num(cfg.codigo_banco or "756", 3), 3),
        (num("1", 4), 4),
        (num("1", 1), 1),
        (alpha("R", 1), 1),
        (num("01", 2), 2),
        (alpha("", 2), 2),
        (num("040", 3), 3),
        (alpha("", 1), 1),
        (num(insc_emp, 1), 1),
        (num(cfg.cpf_cnpj, 15), 15),
        (alpha("", 20), 20),
        (agencia, 5),
        (alpha(cfg.dv_prefixo, 1), 1),
        (conta, 12),
        (dv_conta, 1),
        (alpha("", 1), 1),
        (alpha(cfg.nome_beneficiario, 30), 30),
        (alpha("", 40), 40),
        (alpha("", 40), 40),
        (num(nsa, 8), 8),
        (num(data_ger, 8), 8),
        (num("0", 8), 8),
        (alpha("", 33), 33),
    ]))

    # ─── DETALHES (Segmentos P e Q por título) ───────────────────────────────
    seq = 0
    total = Decimal("0.00")
    for item in itens:
        titulo = item.titulo_receber
        nome_pag, cpf_pag = _pagador(titulo)
        venc = titulo.data_vencimento.strftime("%d%m%Y")
        emissao = titulo.data_emissao.strftime("%d%m%Y")
        valor = item.valor or titulo.saldo_devedor
        total += valor
        nosso_numero = num(item.nosso_numero, 20) if item.nosso_numero else num("0", 20)

        # SEGMENTO P
        seq += 1
        linhas.append(_montar([
            (num(cfg.codigo_banco or "756", 3), 3),
            (num("1", 4), 4),
            (num("3", 1), 1),
            (num(seq, 5), 5),
            (alpha("P", 1), 1),
            (alpha("", 1), 1),
            (num("01", 2), 2),
            (agencia, 5),
            (alpha(cfg.dv_prefixo, 1), 1),
            (conta, 12),
            (dv_conta, 1),
            (alpha("", 1), 1),
            (nosso_numero, 20),
            (num(cfg.carteira or "1", 1), 1),
            (num("1", 1), 1),
            (alpha("", 1), 1),
            (num("2", 1), 1),
            (num("2", 1), 1),
            (alpha(str(titulo.id), 15), 15),
            (num(venc, 8), 8),
            (valor_cents(valor, 15), 15),
            (num("0", 5), 5),
            (alpha("", 1), 1),
            (num("02", 2), 2),
            (alpha("N", 1), 1),
            (num(emissao, 8), 8),
            (num("0", 1), 1),
            (num("0", 8), 8),
            (valor_cents("0", 15), 15),
            (num("0", 1), 1),
            (num("0", 8), 8),
            (valor_cents("0", 15), 15),
            (valor_cents("0", 15), 15),
            (valor_cents("0", 15), 15),
            (alpha("", 25), 25),
            (num("3", 1), 1),
            (num("0", 2), 2),
            (num("0", 1), 1),
            (alpha("", 3), 3),
            (num("09", 2), 2),
            (num("0", 10), 10),
            (alpha("", 1), 1),
        ]))

        # SEGMENTO Q
        seq += 1
        linhas.append(_montar([
            (num(cfg.codigo_banco or "756", 3), 3),
            (num("1", 4), 4),
            (num("3", 1), 1),
            (num(seq, 5), 5),
            (alpha("Q", 1), 1),
            (alpha("", 1), 1),
            (num("01", 2), 2),
            (num(_tipo_inscricao(cpf_pag), 1), 1),
            (num(cpf_pag, 15), 15),
            (alpha(nome_pag, 40), 40),
            (alpha("", 40), 40),
            (alpha("", 15), 15),
            (num("0", 5), 5),
            (num("0", 3), 3),
            (alpha("", 15), 15),
            (alpha("", 2), 2),
            (num("0", 1), 1),
            (num("0", 15), 15),
            (alpha("", 40), 40),
            (num("0", 3), 3),
            (alpha("", 20), 20),
            (alpha("", 8), 8),
        ]))

    # ─── TRAILER DE LOTE (registro 5) ────────────────────────────────────────
    qtd_registros_lote = 2 + len(linhas[2:])  # header lote + detalhes + trailer lote
    linhas.append(_montar([
        (num(cfg.codigo_banco or "756", 3), 3),
        (num("1", 4), 4),
        (num("5", 1), 1),
        (alpha("", 9), 9),
        (num(qtd_registros_lote, 6), 6),
        (num(len(itens), 6), 6),
        (valor_cents(total, 17), 17),
        (num("0", 6), 6),
        (valor_cents("0", 17), 17),
        (num("0", 6), 6),
        (valor_cents("0", 17), 17),
        (num("0", 6), 6),
        (valor_cents("0", 17), 17),
        (alpha("", 8), 8),
        (alpha("", 117), 117),
    ]))

    # ─── TRAILER DE ARQUIVO (registro 9) ─────────────────────────────────────
    qtd_registros_arquivo = len(linhas) + 1  # tudo + este trailer
    linhas.append(_montar([
        (num(cfg.codigo_banco or "756", 3), 3),
        (num("9999", 4), 4),
        (num("9", 1), 1),
        (alpha("", 9), 9),
        (num("1", 6), 6),
        (num(qtd_registros_arquivo, 6), 6),
        (num("0", 6), 6),
        (alpha("", 205), 205),
    ]))

    return "\r\n".join(linhas) + "\r\n"
