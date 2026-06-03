"""
Módulo Títulos a Receber.

RF05: Geração de títulos para alunos, sócios e clientes externos.
RF06: Baixa parcial com saldo remanescente em aberto + juros.
RF07: Quitação de múltiplos títulos em uma operação.
RF10: Gerado automaticamente por cada voo registrado.
"""
from decimal import Decimal
from django.db import models
from django.utils import timezone


class TituloReceber(models.Model):
    TIPO_MENSALIDADE = "mensalidade"
    TIPO_VOO = "voo"
    TIPO_HORAS_PRE_PAGAS = "horas_pre_pagas"
    TIPO_SERVICO = "servico"
    TIPO_OUTROS = "outros"

    TIPO_CHOICES = [
        (TIPO_MENSALIDADE, "Mensalidade"),
        (TIPO_VOO, "Cobrança de Voo"),
        (TIPO_HORAS_PRE_PAGAS, "Compra de Horas Pré-pagas"),
        (TIPO_SERVICO, "Serviço"),
        (TIPO_OUTROS, "Outros"),
    ]

    STATUS_ABERTO = "aberto"
    STATUS_BAIXADO = "baixado"

    STATUS_CHOICES = [
        (STATUS_ABERTO, "Em Aberto"),
        (STATUS_BAIXADO, "Baixado"),
    ]

    participante = models.ForeignKey(
        "users.Usuario",
        on_delete=models.PROTECT,
        related_name="titulos_receber",
        verbose_name="Participante",
        null=True,
        blank=True,
    )
    # Clientes externos (empresas/pessoas que não são usuários do sistema)
    cliente_externo = models.ForeignKey(
        "pessoas.EntidadePagar",
        on_delete=models.PROTECT,
        related_name="titulos_receber",
        verbose_name="Cliente externo",
        null=True,
        blank=True,
    )
    tipo = models.CharField("Tipo", max_length=20, choices=TIPO_CHOICES)
    descricao = models.CharField("Descrição", max_length=300)

    # Vínculo com voo (quando gerado automaticamente por voo)
    voo = models.OneToOneField(
        "voos.Voo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="titulo_receber",
        verbose_name="Voo de origem",
    )

    # Parcelamento
    num_parcela = models.PositiveSmallIntegerField("Nº da parcela", default=1)
    total_parcelas = models.PositiveSmallIntegerField("Total de parcelas", default=1)

    # Valores
    valor_original = models.DecimalField("Valor original (R$)", max_digits=10, decimal_places=2)
    multa = models.DecimalField("Multa (R$)", max_digits=8, decimal_places=2, default=Decimal("0.00"))
    valor_pago = models.DecimalField("Valor pago (R$)", max_digits=10, decimal_places=2, default=Decimal("0.00"))
    valor_via_carteira = models.DecimalField("Valor pago via carteira (R$)", max_digits=10, decimal_places=2, default=Decimal("0.00"))

    data_emissao = models.DateField("Data de emissão", default=timezone.localdate)
    data_vencimento = models.DateField("Data de vencimento")
    data_pagamento = models.DateField("Data do último pagamento", null=True, blank=True)

    status = models.CharField("Status", max_length=10, choices=STATUS_CHOICES, default=STATUS_ABERTO)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Título a Receber"
        verbose_name_plural = "Títulos a Receber"
        ordering = ["data_vencimento"]

    def __str__(self):
        nome = (
            self.participante.nome if self.participante
            else self.cliente_externo.nome if self.cliente_externo
            else "—"
        )
        return f"{nome} | {self.descricao} | {self.get_status_display()}"

    @property
    def valor_total_com_juros(self) -> Decimal:
        return self.valor_original + self.multa

    @property
    def saldo_devedor(self) -> Decimal:
        return self.valor_total_com_juros - self.valor_pago

    @property
    def esta_atrasado(self) -> bool:
        return self.status == self.STATUS_ABERTO and self.data_vencimento < timezone.now().date()

    def aplicar_baixa_parcial(self, valor: Decimal, juros: Decimal = Decimal("0"), data=None, valor_via_carteira: Decimal = Decimal("0")):
        """
        RF06: Aplica uma baixa parcial. Se o valor cobre o saldo total, baixa o título.
        """
        self.multa += juros
        self.valor_pago += valor
        self.valor_via_carteira += valor_via_carteira
        self.data_pagamento = data or timezone.now().date()
        if self.valor_pago >= self.valor_total_com_juros:
            self.status = self.STATUS_BAIXADO
        self.save()
