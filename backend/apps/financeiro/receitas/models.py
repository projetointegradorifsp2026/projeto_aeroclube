"""
Módulo Receitas.

Camada de ORIGEM de um valor a receber. Uma Receita representa a origem de
uma cobrança (voo, mensalidade, serviço etc.) e pode posteriormente ser
"faturada", gerando um TituloReceber (boleto/cobrança).

Espelha os campos de TituloReceber (apps.financeiro.titulos_receber), mas
representa o estágio anterior ao título: o operador decide quais receitas
viram títulos, evitando cobranças redundantes.
"""
from decimal import Decimal
from django.db import models
from django.utils import timezone


class Receita(models.Model):
    # Tipos espelhados de TituloReceber para consistência entre as camadas.
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

    STATUS_PENDENTE = "pendente"
    STATUS_FATURADA = "faturada"
    STATUS_QUITADA = "quitada"

    STATUS_CHOICES = [
        (STATUS_PENDENTE, "Pendente"),
        (STATUS_FATURADA, "Faturada"),
        (STATUS_QUITADA, "Quitada"),
    ]

    # Devedor: usuário do sistema OU cliente externo (mesmo padrão de TituloReceber)
    participante = models.ForeignKey(
        "users.Usuario",
        on_delete=models.PROTECT,
        related_name="receitas",
        verbose_name="Participante",
        null=True,
        blank=True,
    )
    cliente_externo = models.ForeignKey(
        "pessoas.EntidadePagar",
        on_delete=models.PROTECT,
        related_name="receitas",
        verbose_name="Cliente externo",
        null=True,
        blank=True,
    )

    tipo = models.CharField("Tipo", max_length=20, choices=TIPO_CHOICES)
    descricao = models.CharField("Descrição", max_length=300)

    # Vínculo com voo de origem (quando a receita vem de um voo)
    voo = models.ForeignKey(
        "voos.Voo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="receitas",
        verbose_name="Voo de origem",
    )

    # Parcelamento
    num_parcela = models.PositiveSmallIntegerField("Nº da parcela", default=1)
    total_parcelas = models.PositiveSmallIntegerField("Total de parcelas", default=1)

    # Valor
    valor = models.DecimalField("Valor (R$)", max_digits=10, decimal_places=2)

    # Metadados livres (ex: price freeze de compra de horas)
    metadados = models.JSONField("Metadados", null=True, blank=True, default=dict)

    # Datas — vencimento atua como validade; criação é registrada em created_at
    data_emissao = models.DateField("Data de emissão", default=timezone.localdate)
    data_vencimento = models.DateField("Data de vencimento")

    status = models.CharField(
        "Status", max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDENTE
    )

    created_at = models.DateTimeField("Data de criação", auto_now_add=True)
    updated_at = models.DateTimeField("Última atualização", auto_now=True)

    class Meta:
        verbose_name = "Receita"
        verbose_name_plural = "Receitas"
        ordering = ["-created_at", "data_vencimento"]

    def __str__(self):
        nome = (
            self.participante.nome if self.participante
            else self.cliente_externo.nome if self.cliente_externo
            else "—"
        )
        return f"{nome} | {self.descricao} | {self.get_status_display()}"

    @property
    def esta_faturada(self) -> bool:
        """Indica se a receita já gerou um título (relacionamento criado na etapa 2)."""
        return self.status in (self.STATUS_FATURADA, self.STATUS_QUITADA)
