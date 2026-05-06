from rest_framework import serializers
from .models import Aeronave, Aviao, Planador, HistoricoTarifaAeronave


class AviaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Aviao
        fields = ["id", "nome", "tipo", "tipo_display", "tarifa_solo", "tarifa_duplo_comando", "foto", "is_active"]


class PlanadorSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Planador
        fields = ["id", "nome", "tipo", "tipo_display", "minutos_franquia", "valor_fixo_inicial", "valor_minuto_adicional", "foto", "is_active"]


class AeronaveSerializer(serializers.ModelSerializer):
    """Serializer polimórfico resumido para listagem."""
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Aeronave
        fields = ["id", "nome", "tipo", "tipo_display", "is_active"]


class HistoricoTarifaSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricoTarifaAeronave
        fields = ["id", "aeronave", "descricao_alteracao", "valores_anteriores", "alterado_em", "alterado_por"]
