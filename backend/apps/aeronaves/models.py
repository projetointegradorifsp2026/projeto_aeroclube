"""
Módulo Aeronaves.

Hierarquia:
    Aeronave (base abstrata com campos comuns)
    ├── Aviao   — tarifa por hora (solo e duplo comando)
    └── Planador — valor fixo inicial + valor por minuto adicional

RF17: valores atualizáveis sem impactar histórico (os voos guardam o valor no momento do registro).
RF22: histórico de preços via HistoricoTarifaAeronave.
RF23: parâmetros de planador editáveis via tela administrativa.
"""
from django.db import models


class Aeronave(models.Model):
    """
    Modelo base. Não é abstrato para permitir consultas polimórficas
    (ex: listar todas as aeronaves independentemente do tipo).
    Usamos multi-table inheritance do Django.
    """

    TIPO_AVIAO = "aviao"
    TIPO_PLANADOR = "planador"

    TIPO_CHOICES = [
        (TIPO_AVIAO, "Avião"),
        (TIPO_PLANADOR, "Planador"),
    ]

    nome = models.CharField("Nome / Prefixo", max_length=100, unique=True)
    tipo = models.CharField("Tipo", max_length=10, choices=TIPO_CHOICES)
    foto = models.TextField(
        "Foto da aeronave",
        blank=True,
        null=True,
        help_text=(
            "URL/caminho da imagem (ex.: /aeronaves/cessna-152.jpg) OU a própria "
            "imagem embutida como data URL base64 (upload pela tela de cadastro)."
        ),
    )
    is_active = models.BooleanField("Ativa", default=True)
    is_deleted = models.BooleanField("Excluída", default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Aeronave"
        verbose_name_plural = "Aeronaves"
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.get_tipo_display()})"


class Aviao(Aeronave):
    """
    Avião: tarifa por hora para voo solo e duplo comando.
    RF11: o valor cobrado varia por tipo de voo.
    """

    tarifa_solo = models.DecimalField(
        "Tarifa Solo (R$/hora)",
        max_digits=8,
        decimal_places=2,
        help_text="Valor por hora para voo solo.",
    )
    tarifa_duplo_comando = models.DecimalField(
        "Tarifa Duplo Comando (R$/hora)",
        max_digits=8,
        decimal_places=2,
        help_text="Valor por hora para voo com instrutor.",
    )

    class Meta:
        verbose_name = "Avião"
        verbose_name_plural = "Aviões"

    def save(self, *args, **kwargs):
        self.tipo = Aeronave.TIPO_AVIAO
        super().save(*args, **kwargs)


class Planador(Aeronave):
    """
    Planador: modelo híbrido de cobrança.
    RF23: parâmetros editáveis via interface administrativa.

    Regra:
      - Até `minutos_franquia` minutos → cobra apenas `valor_fixo_inicial`
      - Acima do limite → valor_fixo_inicial + (minutos_excedentes × valor_minuto_adicional)

    Ex: franquia=45min, fixo=R$330, adicional=R$3/min
        47min → 330 + (2 × 3) = R$336
    """

    minutos_franquia = models.PositiveIntegerField(
        "Minutos de franquia",
        default=45,
        help_text="Tempo em minutos coberto pelo valor fixo inicial.",
    )
    valor_fixo_inicial = models.DecimalField(
        "Valor fixo inicial (R$)",
        max_digits=8,
        decimal_places=2,
        help_text="Valor cobrado pelo tempo até a franquia.",
    )
    valor_minuto_adicional = models.DecimalField(
        "Valor por minuto adicional (R$)",
        max_digits=6,
        decimal_places=2,
        help_text="Valor por minuto após esgotar a franquia.",
    )
    valor_fixo_duplo = models.DecimalField(
        "Valor fixo duplo comando (R$)",
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Valor fixo para voo com instrutor. Se vazio, usa valor_fixo_inicial.",
    )
    valor_minuto_duplo = models.DecimalField(
        "Valor por minuto duplo (R$)",
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Valor por minuto adicional para voo duplo. Se vazio, usa valor_minuto_adicional.",
    )

    class Meta:
        verbose_name = "Planador"
        verbose_name_plural = "Planadores"

    def save(self, *args, **kwargs):
        self.tipo = Aeronave.TIPO_PLANADOR
        super().save(*args, **kwargs)

    def calcular_valor_voo(self, duracao_minutos: int, duplo: bool = False) -> "Decimal":
        """
        Calcula o valor do voo para esta aeronave.
        RF09/RF11: preservar regra de cálculo junto ao modelo.
        """
        from decimal import Decimal

        if duplo and self.valor_fixo_duplo is not None:
            valor_fixo = self.valor_fixo_duplo
        else:
            valor_fixo = self.valor_fixo_inicial

        if duplo and self.valor_minuto_duplo is not None:
            valor_minuto = self.valor_minuto_duplo
        else:
            valor_minuto = self.valor_minuto_adicional

        if duracao_minutos <= self.minutos_franquia:
            return valor_fixo
        excedente = duracao_minutos - self.minutos_franquia
        return valor_fixo + (Decimal(excedente) * valor_minuto)


class HistoricoTarifaAeronave(models.Model):
    """
    RF22: Registro do histórico de tarifas por aeronave para consulta e auditoria.
    Toda vez que a tarifa de uma aeronave é alterada, o valor antigo é registrado aqui.
    """

    aeronave = models.ForeignKey(
        Aeronave,
        on_delete=models.CASCADE,
        related_name="historico_tarifas",
    )
    # Snapshot dos valores no momento da alteração
    descricao_alteracao = models.TextField(
        "Descrição da alteração",
        help_text="Ex: 'tarifa_solo: 300 → 320'",
    )
    valores_anteriores = models.JSONField(
        "Valores anteriores",
        help_text="Snapshot JSON dos valores antes da alteração.",
    )
    alterado_em = models.DateTimeField(auto_now_add=True)
    alterado_por = models.ForeignKey(
        "users.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historico_tarifas_alteradas",
    )

    class Meta:
        verbose_name = "Histórico de Tarifa"
        verbose_name_plural = "Histórico de Tarifas"
        ordering = ["-alterado_em"]

    def __str__(self):
        return f"{self.aeronave.nome} — {self.alterado_em:%d/%m/%Y %H:%M}"
