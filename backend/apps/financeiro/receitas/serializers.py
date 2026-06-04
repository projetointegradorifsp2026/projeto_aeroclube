from rest_framework import serializers
from .models import Receita


class ReceitaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    participante_nome = serializers.SerializerMethodField()
    esta_faturada = serializers.BooleanField(read_only=True)

    class Meta:
        model = Receita
        fields = [
            "id",
            "participante", "cliente_externo", "participante_nome",
            "tipo", "tipo_display", "descricao",
            "voo",
            "num_parcela", "total_parcelas",
            "valor",
            "data_emissao", "data_vencimento",
            "status", "status_display", "esta_faturada",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_participante_nome(self, obj):
        if obj.participante:
            return obj.participante.nome
        if obj.cliente_externo:
            return obj.cliente_externo.nome
        return "—"

    def validate(self, data):
        participante = data.get("participante") or (self.instance and self.instance.participante)
        cliente_externo = data.get("cliente_externo") or (self.instance and self.instance.cliente_externo)
        if not participante and not cliente_externo:
            raise serializers.ValidationError(
                {"participante": "Informe participante ou cliente externo."}
            )
        return data
