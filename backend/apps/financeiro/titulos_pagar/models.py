"""
Módulo Títulos a Pagar.

RF01: Cadastro com tipo, favorecido, parcelas, valor, datas.
RF02: Status: aberto_em_dia, aberto_atrasado, baixado.
RF03: Baixa total com valor pago e data.
RF04: Títulos recorrentes para colaboradores.
"""
from decimal import Decimal
from django.db import models
from django.utils import timezone


class TituloPagar(models.Model):
    TIPO_FORNECEDOR = "fornecedor"
    TIPO_FOLHA = "folha_pagamento"
    TIPO_CONTA_FIXA = "conta_fixa"
    TIPO_OUTROS = "outros"

    TIPO_CHOICES = [
        (TIPO_FORNECEDOR, "Fornecedor"),
        (TIPO_FOLHA, "Folha de Pagamento"),
        (TIPO_CONTA_FIXA, "Conta Fixa"),
        (TIPO_OUTROS, "Outros"),
    ]

    STATUS_ABERTO = "aberto"
    STATUS_BAIXADO = "baixado"

    STATUS_CHOICES = [
        (STATUS_ABERTO, "Em Aberto"),
        (STATUS_BAIXADO, "Baixado"),
    ]

    tipo = models.CharField("Tipo", max_length=20, choices=TIPO_CHOICES)

    # Favorecido: FK para a tabela Favorecido (que aponta para usuário ou entidade)
    favorecido = models.ForeignKey(
        "pessoas.Favorecido",
        on_delete=models.PROTECT,
        related_name="titulos_pagar",
        verbose_name="Favorecido",
    )

    # Vínculo com o Custo de origem (camada de origem; opcional p/ compatibilidade)
    custo = models.ForeignKey(
        "custos.Custo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="titulos",
        verbose_name="Custo de origem",
    )

    descricao = models.CharField("Descrição", max_length=300)

    # Parcelamento
    num_parcela = models.PositiveSmallIntegerField("Nº da parcela", default=1)
    total_parcelas = models.PositiveSmallIntegerField("Total de parcelas", default=1)

    valor = models.DecimalField("Valor (R$)", max_digits=10, decimal_places=2)

    data_emissao = models.DateField("Data de emissão")
    data_vencimento = models.DateField("Data de vencimento")

    status = models.CharField("Status", max_length=10, choices=STATUS_CHOICES, default=STATUS_ABERTO)

    # Campos preenchidos na baixa
    multa = models.DecimalField("Multa (R$)", max_digits=8, decimal_places=2, default=Decimal("0.00"))
    valor_pago = models.DecimalField("Valor pago (R$)", max_digits=10, decimal_places=2, null=True, blank=True)
    data_pagamento = models.DateField("Data de pagamento", null=True, blank=True)

    # RF04: Título recorrente
    is_recorrente = models.BooleanField("É recorrente?", default=False)
    periodicidade_dias = models.PositiveIntegerField(
        "Periodicidade (dias)",
        null=True,
        blank=True,
        help_text="Ex: 30 para mensal.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Título a Pagar"
        verbose_name_plural = "Títulos a Pagar"
        ordering = ["data_vencimento"]

    def __str__(self):
        return f"{self.descricao} | Parcela {self.num_parcela}/{self.total_parcelas} | {self.get_status_display()}"

    @property
    def esta_atrasado(self) -> bool:
        """RF02: Título em aberto e vencido."""
        return self.status == self.STATUS_ABERTO and self.data_vencimento < timezone.now().date()

    def baixar(self, valor_pago, data_pagamento=None, multa=Decimal("0.00")):
        """RF03: Registra a baixa total do título."""
        self.multa = multa
        self.valor_pago = valor_pago
        self.data_pagamento = data_pagamento or timezone.now().date()
        self.status = self.STATUS_BAIXADO
        self.save()
