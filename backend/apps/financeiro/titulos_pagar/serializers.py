from rest_framework import serializers
from .models import TituloPagar


class TituloPagarSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    esta_atrasado = serializers.BooleanField(read_only=True)
    favorecido_nome = serializers.SerializerMethodField()

    class Meta:
        model = TituloPagar
        fields = [
            "id", "tipo", "tipo_display",
            "favorecido", "favorecido_nome",
            "descricao",
            "num_parcela", "total_parcelas",
            "valor",
            "data_emissao", "data_vencimento",
            "status", "status_display", "esta_atrasado",
            "valor_pago", "data_pagamento",
            "is_recorrente", "periodicidade_dias",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_favorecido_nome(self, obj):
        f = obj.favorecido
        if f.usuario:
            return f.usuario.nome
        if f.entidade:
            return f.entidade.nome
        return None


class BaixaTituloPagarSerializer(serializers.Serializer):
    valor_pago = serializers.DecimalField(max_digits=10, decimal_places=2)
    data_pagamento = serializers.DateField(required=False, allow_null=True)
