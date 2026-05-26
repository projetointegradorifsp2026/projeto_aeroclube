"""
Model para rastrear remessas e retornos CNAB240 gerados/processados.
Permite auditoria e controle do número sequencial (NSA).
"""
from django.db import models
from django.utils import timezone


class RemessaCnab240(models.Model):
    STATUS_GERADA = "gerada"
    STATUS_ENVIADA = "enviada"
    STATUS_RETORNO_PROCESSADO = "retorno_processado"

    STATUS_CHOICES = [
        (STATUS_GERADA, "Gerada"),
        (STATUS_ENVIADA, "Enviada ao Sicoob"),
        (STATUS_RETORNO_PROCESSADO, "Retorno Processado"),
    ]

    numero_sequencial = models.PositiveIntegerField(
        "NSA — Nº Sequencial do Arquivo",
        unique=True,
        help_text="Incrementado a cada remessa. Nunca reutilizar.",
    )
    data_geracao = models.DateTimeField("Data de Geração", default=timezone.now)
    status = models.CharField("Status", max_length=30, choices=STATUS_CHOICES, default=STATUS_GERADA)
    nome_arquivo = models.CharField("Nome do Arquivo", max_length=100)
    qtd_titulos = models.PositiveIntegerField("Qtd. Títulos", default=0)
    valor_total = models.DecimalField("Valor Total (R$)", max_digits=14, decimal_places=2, default=0)

    # Dados do retorno (preenchido ao processar)
    data_retorno = models.DateTimeField("Data do Retorno", null=True, blank=True)
    qtd_liquidados = models.PositiveIntegerField("Títulos Liquidados", default=0)
    qtd_rejeitados = models.PositiveIntegerField("Títulos Rejeitados", default=0)
    log_retorno = models.JSONField("Log do Retorno", null=True, blank=True)

    # Relacionamento com títulos incluídos na remessa
    titulos = models.ManyToManyField(
        "titulos_receber.TituloReceber",
        related_name="remessas_cnab",
        blank=True,
        verbose_name="Títulos da Remessa",
    )

    gerado_por = models.ForeignKey(
        "users.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="remessas_geradas",
    )

    class Meta:
        verbose_name = "Remessa CNAB240"
        verbose_name_plural = "Remessas CNAB240"
        ordering = ["-data_geracao"]

    def __str__(self):
        return f"Remessa #{self.numero_sequencial} — {self.data_geracao:%d/%m/%Y} — {self.get_status_display()}"

    @classmethod
    def proximo_sequencial(cls) -> int:
        """Retorna o próximo NSA disponível."""
        ultimo = cls.objects.order_by("-numero_sequencial").first()
        return (ultimo.numero_sequencial + 1) if ultimo else 1
