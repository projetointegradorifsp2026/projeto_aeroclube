"""
Módulo Custos.

Camada de ORIGEM de um valor a pagar. Um Custo representa a origem de uma
despesa (fornecedor, folha, conta fixa, repasse de instrutor etc.) e pode
posteriormente ser "faturado", gerando um TituloPagar.

Espelha os campos de TituloPagar (apps.financeiro.titulos_pagar), mas
representa o estágio anterior ao título: o operador decide quais custos viram
títulos a pagar.
"""
from decimal import Decimal
from django.db import models
from django.utils import timezone


class Custo(models.Model):
    # Tipos espelhados de TituloPagar.
    TIPO_FORNECEDOR = "fornecedor"
    TIPO_FOLHA = "folha_pagamento"
    TIPO_CONTA_FIXA = "conta_fixa"
    TIPO_OUTROS = "outros"
    TIPO_REMOCAO_SALDO = "remocao_saldo"

    TIPO_CHOICES = [
        (TIPO_FORNECEDOR, "Fornecedor"),
        (TIPO_FOLHA, "Folha de Pagamento"),
        (TIPO_CONTA_FIXA, "Conta Fixa"),
        (TIPO_OUTROS, "Outros"),
        (TIPO_REMOCAO_SALDO, "Remoção de Saldo de Carteira"),
    ]

    STATUS_PENDENTE = "pendente"
    STATUS_FATURADO = "faturado"
    STATUS_QUITADO = "quitado"

    STATUS_CHOICES = [
        (STATUS_PENDENTE, "Pendente"),
        (STATUS_FATURADO, "Faturado"),
        (STATUS_QUITADO, "Quitado"),
    ]

    tipo = models.CharField("Tipo", max_length=20, choices=TIPO_CHOICES)

    favorecido = models.ForeignKey(
        "pessoas.Favorecido",
        on_delete=models.PROTECT,
        related_name="custos",
        verbose_name="Favorecido",
    )

    descricao = models.CharField("Descrição", max_length=300)

    # Parcelamento
    num_parcela = models.PositiveSmallIntegerField("Nº da parcela", default=1)
    total_parcelas = models.PositiveSmallIntegerField("Total de parcelas", default=1)

    valor = models.DecimalField("Valor (R$)", max_digits=10, decimal_places=2)

    # Datas — vencimento atua como validade; criação é registrada em created_at
    data_emissao = models.DateField("Data de emissão", default=timezone.localdate)
    data_vencimento = models.DateField("Data de vencimento")

    status = models.CharField(
        "Status", max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDENTE
    )

    # Metadados livres (ex: price freeze da carteira)
    metadados = models.JSONField("Metadados", null=True, blank=True, default=dict)

    # Recorrência (espelhado de TituloPagar)
    is_recorrente = models.BooleanField("É recorrente?", default=False)
    periodicidade_dias = models.PositiveIntegerField(
        "Periodicidade (dias)",
        null=True,
        blank=True,
        help_text="Ex: 30 para mensal.",
    )

    created_at = models.DateTimeField("Data de criação", auto_now_add=True)
    updated_at = models.DateTimeField("Última atualização", auto_now=True)

    class Meta:
        verbose_name = "Custo"
        verbose_name_plural = "Custos"
        ordering = ["-created_at", "data_vencimento"]

    def __str__(self):
        return f"{self.descricao} | Parcela {self.num_parcela}/{self.total_parcelas} | {self.get_status_display()}"

    @property
    def esta_faturado(self) -> bool:
        return self.status in (self.STATUS_FATURADO, self.STATUS_QUITADO)
