from rest_framework import serializers
from .models import Aeronave, Aviao, Planador, HistoricoTarifaAeronave


class AviaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Aviao
        fields = ["id", "nome", "tipo", "tipo_display", "tarifa_solo", "tarifa_duplo_comando", "foto", "is_active"]
        read_only_fields = ["id", "tipo", "tipo_display"]


class PlanadorSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Planador
        fields = [
            "id", "nome", "tipo", "tipo_display",
            "minutos_franquia", "valor_fixo_inicial", "valor_minuto_adicional",
            "valor_fixo_duplo", "valor_minuto_duplo",
            "foto", "is_active",
        ]
        read_only_fields = ["id", "tipo", "tipo_display"]


class AeronaveSerializer(serializers.ModelSerializer):
    """Serializer polimórfico resumido para listagem."""
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Aeronave
        fields = ["id", "nome", "tipo", "tipo_display", "is_active"]


class HistoricoTarifaSerializer(serializers.ModelSerializer):
    alterado_por_nome = serializers.CharField(source="alterado_por.nome", read_only=True, default=None)

    class Meta:
        model = HistoricoTarifaAeronave
        fields = [
            "id", "aeronave", "descricao_alteracao",
            "valores_anteriores", "valores_vigentes",
            "alterado_em", "alterado_por", "alterado_por_nome",
        ]
