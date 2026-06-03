from rest_framework import serializers
from .models import TituloReceber


class TituloReceberSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    esta_atrasado = serializers.BooleanField(read_only=True)
    saldo_devedor = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    valor_total_com_juros = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    participante_nome = serializers.SerializerMethodField()

    class Meta:
        model = TituloReceber
        fields = [
            "id", "participante", "cliente_externo", "participante_nome",
            "tipo", "tipo_display", "descricao",
            "voo",
            "num_parcela", "total_parcelas",
            "valor_original", "juros_aplicado", "valor_pago", "valor_via_carteira",
            "valor_total_com_juros", "saldo_devedor",
            "data_emissao", "data_vencimento", "data_pagamento",
            "status", "status_display", "esta_atrasado",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "valor_pago", "juros_aplicado", "valor_via_carteira"]

    def get_participante_nome(self, obj):
        if obj.participante:
            return obj.participante.nome
        if obj.cliente_externo:
            return obj.cliente_externo.nome
        return "—"

    def validate(self, data):
        participante = data.get("participante") or self.instance and self.instance.participante
        cliente_externo = data.get("cliente_externo") or self.instance and self.instance.cliente_externo
        if not participante and not cliente_externo:
            raise serializers.ValidationError(
                {"participante": "Informe participante ou cliente externo."}
            )
        return data


class BaixaParcialSerializer(serializers.Serializer):
    """RF06: Baixa parcial de um único título."""
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    juros = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, default=0)
    data_pagamento = serializers.DateField(required=False, allow_null=True)
    valor_via_carteira = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)


class QuitacaoMultiplaSerializer(serializers.Serializer):
    """RF07: Quita múltiplos títulos em uma operação."""
    titulo_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    valor_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    data_pagamento = serializers.DateField(required=False, allow_null=True)
