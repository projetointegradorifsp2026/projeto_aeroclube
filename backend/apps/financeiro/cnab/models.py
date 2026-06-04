"""
Módulo CNAB — Cobrança Bancária (Sicoob).

ATENÇÃO: Esta etapa contempla SOMENTE a modelagem. A leitura/escrita efetiva
do arquivo de remessa (.REM) e do retorno (.RET) NÃO é implementada aqui.

Estrutura:
    ConfiguracaoBancaria  — dados do CEDENTE (o aeroclube) p/ gerar a remessa.
    DadosBancarios        — dados bancários de quem paga/recebe (usuário ou entidade).
    RemessaCNAB           — um arquivo de remessa de cobrança (lote de títulos a receber).
      └── RemessaCNABItem — cada título a receber incluído na remessa.
    RetornoCNAB           — um arquivo de retorno do banco.
      └── RetornoCNABItem — cada ocorrência de pagamento/baixa retornada.

A remessa CNAB é de COBRANÇA (a receber), por isso os itens apontam para
TituloReceber — nunca para TituloPagar.

Layout de referência: CNAB240 Sicoob (ver memória do projeto / planilha do banco).
"""
from decimal import Decimal
from django.db import models
from django.utils import timezone


class ConfiguracaoBancaria(models.Model):
    """
    Dados do beneficiário/cedente (o aeroclube) usados para montar o header do
    arquivo de remessa. Editável apenas por administradores (controle na view).
    Normalmente existe um único registro ativo.
    """
    descricao = models.CharField(
        "Descrição / Apelido", max_length=120, default="Configuração Sicoob"
    )

    # Banco (Sicoob = 756)
    codigo_banco = models.CharField("Código do Banco", max_length=3, default="756")
    nome_banco = models.CharField("Nome do Banco", max_length=30, default="SICOOB")

    # Beneficiário (cedente)
    nome_beneficiario = models.CharField("Nome/Razão Social do Beneficiário", max_length=120, blank=True, default="")
    cpf_cnpj = models.CharField("CPF/CNPJ do Beneficiário", max_length=18, blank=True, default="")

    # Cooperativa / Agência
    prefixo_cooperativa = models.CharField("Prefixo da Cooperativa (agência)", max_length=4, blank=True, default="")
    dv_prefixo = models.CharField("DV do Prefixo", max_length=1, blank=True, default="")

    # Código do cliente/beneficiário no Sicoob
    codigo_beneficiario = models.CharField("Código do Beneficiário", max_length=10, blank=True, default="")
    dv_beneficiario = models.CharField("DV do Beneficiário", max_length=1, blank=True, default="")

    # Conta corrente
    conta_corrente = models.CharField("Conta Corrente", max_length=12, blank=True, default="")
    dv_conta = models.CharField("DV da Conta", max_length=1, blank=True, default="")

    # Carteira / modalidade
    carteira = models.CharField("Carteira", max_length=2, default="1")
    modalidade = models.CharField("Modalidade", max_length=2, default="01")
    convenio = models.CharField("Número do Convênio", max_length=20, blank=True, default="")

    # Controle do sequencial de remessa (NSA)
    proximo_nsa = models.PositiveIntegerField("Próximo Nº Sequencial de Remessa (NSA)", default=1)

    is_active = models.BooleanField("Ativa", default=True)

    created_at = models.DateTimeField("Data de criação", auto_now_add=True)
    updated_at = models.DateTimeField("Última atualização", auto_now=True)

    class Meta:
        verbose_name = "Configuração Bancária (Cedente)"
        verbose_name_plural = "Configurações Bancárias (Cedente)"
        ordering = ["-is_active", "descricao"]

    def __str__(self):
        return f"{self.descricao} — {self.nome_beneficiario}"


class DadosBancarios(models.Model):
    """
    Dados bancários de uma pessoa que paga ou recebe.
    Vincula a um Usuário do sistema OU a uma EntidadePagar (exatamente um),
    seguindo o mesmo padrão de Favorecido. Não é obrigatório por pessoa.
    """
    TIPO_CORRENTE = "corrente"
    TIPO_POUPANCA = "poupanca"
    TIPO_CONTA_CHOICES = [
        (TIPO_CORRENTE, "Conta Corrente"),
        (TIPO_POUPANCA, "Conta Poupança"),
    ]

    usuario = models.OneToOneField(
        "users.Usuario",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="dados_bancarios",
        verbose_name="Usuário",
    )
    entidade = models.OneToOneField(
        "pessoas.EntidadePagar",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="dados_bancarios",
        verbose_name="Entidade",
    )

    banco = models.CharField("Banco", max_length=60, blank=True, default="")
    codigo_banco = models.CharField("Código do Banco", max_length=5, blank=True, default="")
    agencia = models.CharField("Agência", max_length=10, blank=True, default="")
    agencia_dv = models.CharField("DV da Agência", max_length=2, blank=True, default="")
    conta = models.CharField("Conta", max_length=20, blank=True, default="")
    conta_dv = models.CharField("DV da Conta", max_length=2, blank=True, default="")
    tipo_conta = models.CharField(
        "Tipo de Conta", max_length=10, choices=TIPO_CONTA_CHOICES, default=TIPO_CORRENTE
    )
    titular = models.CharField("Titular", max_length=120, blank=True, default="")
    cpf_cnpj_titular = models.CharField("CPF/CNPJ do Titular", max_length=18, blank=True, default="")
    chave_pix = models.CharField("Chave Pix", max_length=140, blank=True, default="")

    created_at = models.DateTimeField("Data de criação", auto_now_add=True)
    updated_at = models.DateTimeField("Última atualização", auto_now=True)

    class Meta:
        verbose_name = "Dados Bancários"
        verbose_name_plural = "Dados Bancários"

    def __str__(self):
        alvo = self.usuario.nome if self.usuario else (self.entidade.nome if self.entidade else "—")
        return f"Dados bancários de {alvo}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.usuario and not self.entidade:
            raise ValidationError("Informe um usuário ou uma entidade para os dados bancários.")
        if self.usuario and self.entidade:
            raise ValidationError("Vincule os dados bancários a apenas um (usuário OU entidade).")


class RemessaCNAB(models.Model):
    """Um arquivo de remessa de cobrança (lote de títulos a receber)."""

    STATUS_GERADA = "gerada"
    STATUS_ENVIADA = "enviada"
    STATUS_PROCESSADA = "processada"
    STATUS_ERRO = "erro"
    STATUS_CHOICES = [
        (STATUS_GERADA, "Gerada"),
        (STATUS_ENVIADA, "Enviada ao banco"),
        (STATUS_PROCESSADA, "Processada"),
        (STATUS_ERRO, "Erro"),
    ]

    configuracao = models.ForeignKey(
        ConfiguracaoBancaria,
        on_delete=models.PROTECT,
        related_name="remessas",
        verbose_name="Configuração do Cedente",
    )
    numero_sequencial = models.PositiveIntegerField("Nº Sequencial (NSA)")
    data_geracao = models.DateField("Data de geração", default=timezone.localdate)

    status = models.CharField("Status", max_length=12, choices=STATUS_CHOICES, default=STATUS_GERADA)

    # Conteúdo do arquivo .REM (preenchido na etapa futura de escrita do CNAB)
    conteudo_arquivo = models.TextField("Conteúdo do arquivo (.REM)", blank=True, default="")
    nome_arquivo = models.CharField("Nome do arquivo", max_length=120, blank=True, default="")

    quantidade_titulos = models.PositiveIntegerField("Quantidade de títulos", default=0)
    valor_total = models.DecimalField("Valor total (R$)", max_digits=12, decimal_places=2, default=Decimal("0.00"))

    criado_por = models.ForeignKey(
        "users.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="remessas_cnab",
        verbose_name="Criado por",
    )
    created_at = models.DateTimeField("Data de criação", auto_now_add=True)
    updated_at = models.DateTimeField("Última atualização", auto_now=True)

    class Meta:
        verbose_name = "Remessa CNAB"
        verbose_name_plural = "Remessas CNAB"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Remessa #{self.numero_sequencial} — {self.data_geracao:%d/%m/%Y} ({self.get_status_display()})"


class RemessaCNABItem(models.Model):
    """Cada título a receber incluído numa remessa de cobrança."""

    remessa = models.ForeignKey(
        RemessaCNAB,
        on_delete=models.CASCADE,
        related_name="itens",
        verbose_name="Remessa",
    )
    titulo_receber = models.ForeignKey(
        "titulos_receber.TituloReceber",
        on_delete=models.PROTECT,
        related_name="remessa_itens",
        verbose_name="Título a Receber",
    )
    nosso_numero = models.CharField("Nosso Número", max_length=20, blank=True, default="")
    valor = models.DecimalField("Valor (R$)", max_digits=10, decimal_places=2, default=Decimal("0.00"))

    created_at = models.DateTimeField("Data de criação", auto_now_add=True)

    class Meta:
        verbose_name = "Item de Remessa CNAB"
        verbose_name_plural = "Itens de Remessa CNAB"
        ordering = ["id"]

    def __str__(self):
        return f"Remessa #{self.remessa_id} | Título #{self.titulo_receber_id}"


class RetornoCNAB(models.Model):
    """Um arquivo de retorno (.RET) recebido do banco."""

    STATUS_IMPORTADO = "importado"
    STATUS_PROCESSADO = "processado"
    STATUS_ERRO = "erro"
    STATUS_CHOICES = [
        (STATUS_IMPORTADO, "Importado"),
        (STATUS_PROCESSADO, "Processado"),
        (STATUS_ERRO, "Erro"),
    ]

    configuracao = models.ForeignKey(
        ConfiguracaoBancaria,
        on_delete=models.PROTECT,
        related_name="retornos",
        verbose_name="Configuração do Cedente",
    )
    data_retorno = models.DateField("Data do retorno", default=timezone.localdate)
    status = models.CharField("Status", max_length=12, choices=STATUS_CHOICES, default=STATUS_IMPORTADO)

    conteudo_arquivo = models.TextField("Conteúdo do arquivo (.RET)", blank=True, default="")
    nome_arquivo = models.CharField("Nome do arquivo", max_length=120, blank=True, default="")

    criado_por = models.ForeignKey(
        "users.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="retornos_cnab",
        verbose_name="Importado por",
    )
    created_at = models.DateTimeField("Data de criação", auto_now_add=True)
    updated_at = models.DateTimeField("Última atualização", auto_now=True)

    class Meta:
        verbose_name = "Retorno CNAB"
        verbose_name_plural = "Retornos CNAB"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Retorno {self.data_retorno:%d/%m/%Y} ({self.get_status_display()})"


class RetornoCNABItem(models.Model):
    """Cada ocorrência (pagamento/baixa) de um arquivo de retorno."""

    retorno = models.ForeignKey(
        RetornoCNAB,
        on_delete=models.CASCADE,
        related_name="itens",
        verbose_name="Retorno",
    )
    titulo_receber = models.ForeignKey(
        "titulos_receber.TituloReceber",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="retorno_itens",
        verbose_name="Título a Receber",
    )
    nosso_numero = models.CharField("Nosso Número", max_length=20, blank=True, default="")
    codigo_ocorrencia = models.CharField("Código de Ocorrência", max_length=4, blank=True, default="")
    descricao_ocorrencia = models.CharField("Descrição da Ocorrência", max_length=120, blank=True, default="")
    valor_pago = models.DecimalField("Valor pago (R$)", max_digits=10, decimal_places=2, default=Decimal("0.00"))
    data_pagamento = models.DateField("Data do pagamento", null=True, blank=True)

    created_at = models.DateTimeField("Data de criação", auto_now_add=True)

    class Meta:
        verbose_name = "Item de Retorno CNAB"
        verbose_name_plural = "Itens de Retorno CNAB"
        ordering = ["id"]

    def __str__(self):
        return f"Retorno #{self.retorno_id} | {self.codigo_ocorrencia} | Título #{self.titulo_receber_id}"
