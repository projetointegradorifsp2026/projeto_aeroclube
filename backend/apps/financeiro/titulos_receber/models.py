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
        (TIPO_OUTROS, "Pontual"),
    ]

    STATUS_ABERTO = "aberto"
    STATUS_REMESSA_CRIADA = "remessa_criada"
    STATUS_BAIXADO = "baixado"

    STATUS_CHOICES = [
        (STATUS_ABERTO, "Em Aberto"),
        (STATUS_REMESSA_CRIADA, "Remessa Criada"),
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
    # Cliente de serviço (empresa/pessoa que não é usuário do sistema)
    cliente = models.ForeignKey(
        "pessoas.Cliente",
        on_delete=models.PROTECT,
        related_name="titulos_receber",
        verbose_name="Cliente",
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

    # Vínculos com Receitas de origem (M2M: suporta split 1→N e agrupamento N→1)
    receitas = models.ManyToManyField(
        "receitas.Receita",
        blank=True,
        related_name="titulos",
        verbose_name="Receitas de origem",
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

    status = models.CharField("Status", max_length=20, choices=STATUS_CHOICES, default=STATUS_ABERTO)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Título a Receber"
        verbose_name_plural = "Títulos a Receber"
        ordering = ["data_vencimento"]

    def __str__(self):
        nome = (
            self.participante.nome if self.participante
            else self.cliente.nome if self.cliente
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

    def aplicar_baixa_parcial(self, valor: Decimal, juros: Decimal = Decimal("0"), data=None,
                              valor_via_carteira: Decimal = Decimal("0"),
                              forma_pagamento: str = None, criado_por=None):
        """
        RF06: Aplica uma baixa parcial. Se o valor cobre o saldo total, baixa o título.
        Ao baixar, credita a carteira do participante se a receita for do tipo horas_pre_pagas.
        Cada chamada registra uma BaixaTituloReceber (extrato de como o título foi pago).
        """
        self.multa += juros
        self.valor_pago += valor
        self.valor_via_carteira += valor_via_carteira
        self.data_pagamento = data or timezone.now().date()
        ja_estava_baixado = self.status == self.STATUS_BAIXADO
        if self.valor_pago >= self.valor_total_com_juros:
            self.status = self.STATUS_BAIXADO
        self.save()
        # Registra a baixa no extrato de pagamentos do título.
        BaixaTituloReceber.objects.create(
            titulo_receber=self,
            data=self.data_pagamento,
            valor=valor,
            juros=juros,
            valor_via_carteira=valor_via_carteira,
            forma_pagamento=forma_pagamento or BaixaTituloReceber.FORMA_DINHEIRO,
            criado_por=criado_por,
        )
        if self.status == self.STATUS_BAIXADO and not ja_estava_baixado:
            self._creditar_carteira_se_necessario()
            self._quitar_receitas_se_completas()

    def _quitar_receitas_se_completas(self):
        """
        Marca como QUITADA cada receita de origem cujos títulos estejam todos
        baixados. Uma receita pode estar dividida em vários títulos (split 1→N);
        só é quitada quando o último deles é pago.
        """
        from apps.financeiro.receitas.models import Receita as ReceitaModel

        for receita in self.receitas.all():
            if receita.status == ReceitaModel.STATUS_QUITADA:
                continue
            titulos = receita.titulos.all()
            if titulos.exists() and all(
                t.status == self.STATUS_BAIXADO for t in titulos
            ):
                receita.status = ReceitaModel.STATUS_QUITADA
                receita.save(update_fields=["status", "updated_at"])

    def _creditar_carteira_se_necessario(self):
        """Credita a carteira quando o título é de compra de horas pré-pagas."""
        from apps.financeiro.receitas.models import Receita as ReceitaModel
        from apps.financeiro.carteira.models import Carteira

        if not self.participante_id:
            return
        receitas_horas = self.receitas.filter(tipo=ReceitaModel.TIPO_HORAS_PRE_PAGAS)
        if not receitas_horas.exists():
            return

        carteira, _ = Carteira.objects.get_or_create(
            participante=self.participante,
            defaults={"saldo": Decimal("0.00")},
        )
        receita = receitas_horas.first()
        carteira.creditar(
            valor=self.valor_pago,
            descricao=self.descricao,
            data_vencimento=self.data_vencimento,
            metadados=receita.metadados or {},
        )
        # Marca a receita como quitada
        receita.status = ReceitaModel.STATUS_QUITADA
        receita.save(update_fields=["status", "updated_at"])


class BaixaTituloReceber(models.Model):
    """
    Extrato de pagamentos de um TituloReceber: cada baixa (parcial ou total)
    gera um registro com o valor abatido e a forma de pagamento usada.

    `valor_via_carteira` registra a parcela paga com saldo da carteira do
    participante; `forma_pagamento` descreve o método do dinheiro externo
    (ou "carteira" quando a baixa foi inteiramente com saldo).
    """
    FORMA_DINHEIRO = "dinheiro"
    FORMA_PIX = "pix"
    FORMA_CARTAO = "cartao"
    FORMA_BOLETO = "boleto"
    FORMA_CNAB = "cnab"
    FORMA_CARTEIRA = "carteira"
    FORMA_OUTROS = "outros"

    FORMA_CHOICES = [
        (FORMA_DINHEIRO, "Dinheiro"),
        (FORMA_PIX, "PIX"),
        (FORMA_CARTAO, "Cartão"),
        (FORMA_BOLETO, "Boleto"),
        (FORMA_CNAB, "CNAB / Cobrança bancária"),
        (FORMA_CARTEIRA, "Carteira"),
        (FORMA_OUTROS, "Outros"),
    ]

    titulo_receber = models.ForeignKey(
        TituloReceber,
        on_delete=models.CASCADE,
        related_name="baixas",
        verbose_name="Título a Receber",
    )
    data = models.DateField("Data do pagamento", default=timezone.localdate)
    valor = models.DecimalField("Valor abatido (R$)", max_digits=10, decimal_places=2)
    juros = models.DecimalField("Juros/Multa (R$)", max_digits=8, decimal_places=2, default=Decimal("0.00"))
    valor_via_carteira = models.DecimalField("Valor via carteira (R$)", max_digits=10, decimal_places=2, default=Decimal("0.00"))
    forma_pagamento = models.CharField(
        "Forma de pagamento", max_length=12, choices=FORMA_CHOICES, default=FORMA_DINHEIRO
    )
    criado_por = models.ForeignKey(
        "users.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="baixas_registradas",
        verbose_name="Registrado por",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Baixa de Título"
        verbose_name_plural = "Baixas de Títulos"
        ordering = ["data", "id"]

    def __str__(self):
        return f"Baixa de R$ {self.valor} ({self.get_forma_pagamento_display()}) — Título #{self.titulo_receber_id}"
