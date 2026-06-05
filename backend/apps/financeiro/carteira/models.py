"""
Módulo Carteira de Horas.

RF12: Compra antecipada de horas — gera título a receber e credita saldo.
RF13: Abatimento automático no registro de voo.
RF14: Controle de validade dos créditos.
"""
from decimal import Decimal
from django.db import models
from django.utils import timezone


class Carteira(models.Model):
    """
    Saldo de horas/créditos pré-pagos de um participante.
    Um participante tem exatamente uma carteira.
    """
    participante = models.OneToOneField(
        "users.Usuario",
        on_delete=models.CASCADE,
        related_name="carteira",
        verbose_name="Participante",
    )
    saldo = models.DecimalField(
        "Saldo atual (R$)",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Carteira"
        verbose_name_plural = "Carteiras"

    def __str__(self):
        return f"Carteira de {self.participante.nome} — R$ {self.saldo}"

    def creditar(self, valor: Decimal, descricao: str, data_vencimento=None, metadados=None) -> "MovimentacaoCarteira":
        """Adiciona crédito na carteira e registra movimentação."""
        self.saldo += valor
        self.save()
        return MovimentacaoCarteira.objects.create(
            carteira=self,
            tipo=MovimentacaoCarteira.TIPO_CREDITO,
            valor=valor,
            descricao=descricao,
            data_vencimento=data_vencimento,
            metadados=metadados,
        )

    def debitar(self, valor: Decimal, descricao: str) -> "MovimentacaoCarteira":
        """Remove crédito da carteira e registra movimentação."""
        self.saldo -= valor
        self.save()
        return MovimentacaoCarteira.objects.create(
            carteira=self,
            tipo=MovimentacaoCarteira.TIPO_DEBITO,
            valor=valor,
            descricao=descricao,
        )

    def tem_saldo_suficiente(self, valor: Decimal) -> bool:
        return self.saldo >= valor


class MovimentacaoCarteira(models.Model):
    """
    Extrato da carteira: cada crédito ou débito é registrado aqui.
    RF14: data_vencimento controla a validade dos créditos.
    """

    TIPO_CREDITO = "credito"
    TIPO_DEBITO = "debito"
    TIPO_AJUSTE = "ajuste"  # Ex: reajuste de créditos vencidos

    TIPO_CHOICES = [
        (TIPO_CREDITO, "Crédito"),
        (TIPO_DEBITO, "Débito"),
        (TIPO_AJUSTE, "Ajuste"),
    ]

    carteira = models.ForeignKey(
        Carteira,
        on_delete=models.CASCADE,
        related_name="movimentacoes",
        verbose_name="Carteira",
    )
    tipo = models.CharField("Tipo", max_length=10, choices=TIPO_CHOICES)
    valor = models.DecimalField("Valor (R$)", max_digits=10, decimal_places=2)
    descricao = models.CharField("Descrição", max_length=300)
    data_transacao = models.DateTimeField("Data da transação", default=timezone.now)
    # RF14: validade do crédito (pode ficar em branco para débitos/ajustes)
    data_vencimento = models.DateField(
        "Validade do crédito",
        null=True,
        blank=True,
        help_text="Deixar em branco para débitos. Para créditos, indica até quando são válidos.",
    )

    # Vínculo opcional com o voo que gerou o débito
    voo = models.ForeignKey(
        "voos.Voo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentacoes_carteira",
        verbose_name="Voo de origem",
    )

    # RF14 / Price freeze: armazena tarifa vigente no momento da compra de horas
    metadados = models.JSONField(
        "Metadados",
        null=True,
        blank=True,
        help_text=(
            "Dados extras para créditos por horas: aeronave_id, aeronave_nome, "
            "aeronave_tipo, tipo_voo, tarifa, horas."
        ),
    )

    class Meta:
        verbose_name = "Movimentação de Carteira"
        verbose_name_plural = "Movimentações de Carteira"
        ordering = ["-data_transacao"]

    def __str__(self):
        return f"{self.carteira.participante.nome} | {self.get_tipo_display()} | R$ {self.valor} | {self.data_transacao:%d/%m/%Y}"
