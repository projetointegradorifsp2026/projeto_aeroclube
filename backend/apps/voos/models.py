"""
Módulo Voos — Diário de Bordo.

RF08: Registro de voos com aeronave, participante, instrutor, horários, origem/destino.
RF09: Cálculo automático do tempo decimal (frações de 0,1h = 6 min, tolerância -2/+3).
RF10: Cada voo gera automaticamente um título a receber (exceto quando pago via carteira).
RF11: Tarifação por aeronave e tipo de voo; valor preservado no histórico.
"""
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError

from apps.users.models import Usuario
from apps.aeronaves.models import Aeronave
from apps.pessoas.models import Funcionario


def calcular_tempo_decimal(duracao_minutos: int) -> Decimal:
    """
    RF09: Converte minutos em decimal de hora (frações de 0,1h = 6 min).
    Tolerância: -2 e +3 minutos por múltiplo de 6.

    Exemplos:
        0-3 min  → 0.0
        4-9 min  → 0.1
        10-15    → 0.2
        ...
    """
    if duracao_minutos < 0:
        return Decimal("0.0")
    # Cada bloco de 6 min tem tolerância: começa no minuto (6n - 2) e vai até (6n + 3)
    # O bloco 0 é especial: 0-3 = 0.0
    if duracao_minutos <= 3:
        return Decimal("0.0")
    # Para n >= 1: bloco começa em 4 + (n-1)*6 = 6n - 2, termina em 9 + (n-1)*6 = 6n + 3
    # Basta dividir (minutos + 2) por 6 e truncar
    decimos = (duracao_minutos + 2) // 6
    return Decimal(str(round(decimos * 0.1, 1)))


class Voo(models.Model):
    """Registro de um voo no diário de bordo."""

    TIPO_INSTRUCAO_SOLO = "instrucao_solo"
    TIPO_INSTRUCAO_DUPLO = "instrucao_duplo"
    TIPO_SOCIO_SOLO = "socio_solo"
    TIPO_SOCIO_DUPLO = "socio_duplo"
    TIPO_EXTERNO = "externo"

    TIPO_VOO_CHOICES = [
        (TIPO_INSTRUCAO_SOLO, "Instrução Solo"),
        (TIPO_INSTRUCAO_DUPLO, "Instrução Duplo Comando"),
        (TIPO_SOCIO_SOLO, "Sócio Solo"),
        (TIPO_SOCIO_DUPLO, "Sócio Duplo Comando"),
        (TIPO_EXTERNO, "Externo (sempre duplo comando)"),
    ]

    # Tipos que exigem instrutor
    TIPOS_COM_INSTRUTOR = {TIPO_INSTRUCAO_DUPLO, TIPO_SOCIO_DUPLO, TIPO_EXTERNO}
    # Tipos com tarifa duplo comando
    TIPOS_DUPLO = {TIPO_INSTRUCAO_DUPLO, TIPO_SOCIO_DUPLO, TIPO_EXTERNO}

    # Participante (aluno, sócio ou cliente externo)
    participante = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name="voos",
        verbose_name="Participante",
    )
    # Instrutor (obrigatório para tipos duplo comando)
    instrutor = models.ForeignKey(
        Funcionario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="voos_instrutor",
        verbose_name="Instrutor",
        limit_choices_to={"is_instrutor": True},
    )
    aeronave = models.ForeignKey(
        Aeronave,
        on_delete=models.PROTECT,
        related_name="voos",
        verbose_name="Aeronave",
    )
    tipo_voo = models.CharField("Tipo de Voo", max_length=20, choices=TIPO_VOO_CHOICES)

    # Horários
    hora_inicio = models.TimeField("Hora de início")
    hora_fim = models.TimeField("Hora de fim")
    data_voo = models.DateField("Data do voo")

    # Calculados automaticamente no save
    duracao_minutos = models.PositiveIntegerField("Duração (minutos)", editable=False, default=0)
    tempo_decimal = models.DecimalField(
        "Tempo decimal (horas)",
        max_digits=4,
        decimal_places=1,
        editable=False,
        default=0,
    )

    # Origem e destino (não impacta cobrança — RF08)
    origem = models.CharField("Origem (ICAO ou nome)", max_length=10, blank=True, null=True)
    destino = models.CharField("Destino (ICAO ou nome)", max_length=10, blank=True, null=True)

    # Valor cobrado — snapshot do momento do registro (RF11)
    valor_tarifa_snapshot = models.DecimalField(
        "Tarifa aplicada (R$/hora ou valor fixo)",
        max_digits=8,
        decimal_places=2,
        editable=False,
        default=0,
    )
    valor_total = models.DecimalField(
        "Valor total do voo (R$)",
        max_digits=10,
        decimal_places=2,
        editable=False,
        default=0,
    )

    # Detalhamento para planador (RF23 — exibição transparente)
    detalhe_cobranca = models.JSONField(
        "Detalhamento da cobrança",
        null=True,
        blank=True,
        help_text="Breakdown do cálculo: franquia, excedente, valor final.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Voo"
        verbose_name_plural = "Voos"
        ordering = ["-data_voo", "-hora_inicio"]

    def __str__(self):
        return f"{self.data_voo} | {self.participante.nome} | {self.aeronave.nome} | {self.tempo_decimal}h"

    def clean(self):
        # Instrutor obrigatório para voos duplo comando / externo
        if self.tipo_voo in self.TIPOS_COM_INSTRUTOR and not self.instrutor:
            raise ValidationError(
                f"O tipo de voo '{self.get_tipo_voo_display()}' exige instrutor."
            )
        # Horário de fim deve ser após o início
        if self.hora_inicio and self.hora_fim and self.hora_fim <= self.hora_inicio:
            raise ValidationError("A hora de fim deve ser posterior à hora de início.")

    def _calcular_duracao(self) -> int:
        """Retorna a duração em minutos inteiros."""
        from datetime import datetime, date
        dt_inicio = datetime.combine(date.today(), self.hora_inicio)
        dt_fim = datetime.combine(date.today(), self.hora_fim)
        delta = dt_fim - dt_inicio
        return int(delta.total_seconds() // 60)

    def _calcular_valor(self, duracao_minutos: int):
        """
        Calcula o valor do voo e preenche valor_total e detalhe_cobranca.
        RF11 / RF23.
        """
        from apps.aeronaves.models import Aviao, Planador

        aeronave_real = self.aeronave

        try:
            aviao = aeronave_real.aviao
            # Tarifa por hora
            if self.tipo_voo in self.TIPOS_DUPLO:
                tarifa = aviao.tarifa_duplo_comando
            else:
                tarifa = aviao.tarifa_solo
            self.valor_tarifa_snapshot = tarifa
            self.valor_total = round(self.tempo_decimal * tarifa, 2)
            self.detalhe_cobranca = {
                "tipo_aeronave": "aviao",
                "tempo_decimal": str(self.tempo_decimal),
                "tarifa_hora": str(tarifa),
                "valor_total": str(self.valor_total),
            }
        except Aviao.DoesNotExist:
            pass

        try:
            planador = aeronave_real.planador
            valor = planador.calcular_valor_voo(duracao_minutos)
            excedente = max(0, duracao_minutos - planador.minutos_franquia)
            self.valor_tarifa_snapshot = planador.valor_fixo_inicial
            self.valor_total = round(valor, 2)
            self.detalhe_cobranca = {
                "tipo_aeronave": "planador",
                "duracao_minutos": duracao_minutos,
                "franquia_minutos": planador.minutos_franquia,
                "excedente_minutos": excedente,
                "valor_fixo_inicial": str(planador.valor_fixo_inicial),
                "valor_minuto_adicional": str(planador.valor_minuto_adicional),
                "valor_total": str(self.valor_total),
            }
        except Exception:
            pass

    def save(self, *args, **kwargs):
        # 1. Calcular duração e tempo decimal
        self.duracao_minutos = self._calcular_duracao()
        self.tempo_decimal = calcular_tempo_decimal(self.duracao_minutos)
        # 2. Calcular valor
        self._calcular_valor(self.duracao_minutos)
        super().save(*args, **kwargs)
