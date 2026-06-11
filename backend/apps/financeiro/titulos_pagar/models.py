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

    # Vínculos com Custos de origem (M2M: suporta split 1→N e agrupamento N→1)
    custos = models.ManyToManyField(
        "custos.Custo",
        blank=True,
        related_name="titulos",
        verbose_name="Custos de origem",
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

    def baixar(self, valor_pago, data_pagamento=None, multa=Decimal("0.00"),
               forma_pagamento=None, criado_por=None):
        """
        RF03: Registra a baixa total do título. Debita carteira se for remoção de saldo.
        Cada baixa registra uma BaixaTituloPagar (extrato de como o título foi pago),
        simétrica à BaixaTituloReceber do contas a receber.
        """
        self.multa = multa
        self.valor_pago = valor_pago
        self.data_pagamento = data_pagamento or timezone.now().date()
        self.status = self.STATUS_BAIXADO
        self.save()
        BaixaTituloPagar.objects.create(
            titulo_pagar=self,
            data=self.data_pagamento,
            valor=valor_pago,
            multa=multa,
            forma_pagamento=forma_pagamento or BaixaTituloPagar.FORMA_DINHEIRO,
            criado_por=criado_por,
        )
        self._debitar_carteira_se_necessario()
        self._quitar_custos_se_completos()

    def _quitar_custos_se_completos(self):
        """
        Marca como QUITADO cada custo de origem cujos títulos estejam todos
        baixados. Um custo pode estar dividido em vários títulos (split 1→N);
        só é quitado quando o último deles é pago.
        """
        from apps.financeiro.custos.models import Custo as CustoModel

        for custo in self.custos.all():
            if custo.status == CustoModel.STATUS_QUITADO:
                continue
            titulos = custo.titulos.all()
            if titulos.exists() and all(
                t.status == self.STATUS_BAIXADO for t in titulos
            ):
                custo.status = CustoModel.STATUS_QUITADO
                custo.save(update_fields=["status", "updated_at"])

    def _debitar_carteira_se_necessario(self):
        """Debita a carteira quando o custo é de remoção de saldo."""
        from apps.financeiro.custos.models import Custo as CustoModel
        from apps.financeiro.carteira.models import Carteira

        custos_remocao = self.custos.filter(tipo=CustoModel.TIPO_REMOCAO_SALDO)
        if not custos_remocao.exists():
            return

        custo = custos_remocao.first()
        participante_id = (custo.metadados or {}).get("participante_id")
        if not participante_id:
            return

        try:
            carteira = Carteira.objects.get(participante_id=participante_id)
        except Carteira.DoesNotExist:
            return

        if not carteira.tem_saldo_suficiente(self.valor_pago):
            return

        carteira.debitar(valor=self.valor_pago, descricao=self.descricao)
        # Marca o custo como quitado
        custo.status = CustoModel.STATUS_QUITADO
        custo.save(update_fields=["status", "updated_at"])


class BaixaTituloPagar(models.Model):
    """
    Extrato de pagamentos de um TituloPagar: cada baixa registra o valor pago e a
    forma de pagamento usada. Espelha a BaixaTituloReceber do contas a receber.

    Diferente do a receber, o pagamento a fornecedor é integral (só baixa total),
    então normalmente há uma única BaixaTituloPagar por título.
    """
    FORMA_DINHEIRO = "dinheiro"
    FORMA_PIX = "pix"
    FORMA_TRANSFERENCIA = "transferencia"
    FORMA_CARTAO = "cartao"
    FORMA_BOLETO = "boleto"
    FORMA_OUTROS = "outros"

    FORMA_CHOICES = [
        (FORMA_DINHEIRO, "Dinheiro"),
        (FORMA_PIX, "PIX"),
        (FORMA_TRANSFERENCIA, "Transferência"),
        (FORMA_CARTAO, "Cartão"),
        (FORMA_BOLETO, "Boleto"),
        (FORMA_OUTROS, "Outros"),
    ]

    titulo_pagar = models.ForeignKey(
        TituloPagar,
        on_delete=models.CASCADE,
        related_name="baixas",
        verbose_name="Título a Pagar",
    )
    data = models.DateField("Data do pagamento", default=timezone.localdate)
    valor = models.DecimalField("Valor pago (R$)", max_digits=10, decimal_places=2)
    multa = models.DecimalField("Multa/Juros (R$)", max_digits=8, decimal_places=2, default=Decimal("0.00"))
    forma_pagamento = models.CharField(
        "Forma de pagamento", max_length=15, choices=FORMA_CHOICES, default=FORMA_DINHEIRO
    )
    criado_por = models.ForeignKey(
        "users.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="baixas_pagar_registradas",
        verbose_name="Registrado por",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Baixa de Título a Pagar"
        verbose_name_plural = "Baixas de Títulos a Pagar"
        ordering = ["data", "id"]

    def __str__(self):
        return f"Baixa de R$ {self.valor} ({self.get_forma_pagamento_display()}) — Título #{self.titulo_pagar_id}"
