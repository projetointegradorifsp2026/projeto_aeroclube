from rest_framework import serializers
from .models import Voo, calcular_tempo_decimal


class VooSerializer(serializers.ModelSerializer):
    tipo_voo_display = serializers.CharField(source="get_tipo_voo_display", read_only=True)
    participante_nome = serializers.CharField(source="participante.nome", read_only=True)
    aeronave_nome = serializers.CharField(source="aeronave.nome", read_only=True)
    instrutor_nome = serializers.SerializerMethodField()

    class Meta:
        model = Voo
        fields = [
            "id",
            "data_voo",
            "tipo_voo",
            "tipo_voo_display",
            "participante",
            "participante_nome",
            "instrutor",
            "instrutor_nome",
            "aeronave",
            "aeronave_nome",
            "hora_inicio",
            "hora_fim",
            "duracao_minutos",
            "tempo_decimal",
            "origem",
            "destino",
            "valor_tarifa_snapshot",
            "valor_total",
            "valor_repasse_instrutor",
            "detalhe_cobranca",
            "created_at",
        ]
        read_only_fields = [
            "duracao_minutos",
            "tempo_decimal",
            "valor_tarifa_snapshot",
            "valor_total",
            "valor_repasse_instrutor",
            "detalhe_cobranca",
            "created_at",
        ]

    def get_instrutor_nome(self, obj):
        if obj.instrutor:
            return obj.instrutor.nome
        return None

    def validate(self, data):
        tipo_voo = data.get("tipo_voo")
        instrutor = data.get("instrutor")
        if tipo_voo in Voo.TIPOS_COM_INSTRUTOR and not instrutor:
            raise serializers.ValidationError(
                {"instrutor": f"Instrutor é obrigatório para o tipo '{tipo_voo}'."}
            )
        return data


class SimulacaoTempoDecimalSerializer(serializers.Serializer):
    """Serializer auxiliar para o endpoint de simulação do tempo decimal."""
    minutos = serializers.IntegerField(min_value=0)

    def to_representation(self, instance):
        minutos = instance["minutos"]
        return {
            "minutos": minutos,
            "tempo_decimal": str(calcular_tempo_decimal(minutos)),
        }
