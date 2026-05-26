from rest_framework import serializers
from .models import TituloPagar

TIPO_FRONTEND_TO_BACKEND = {
    "folha": TituloPagar.TIPO_FOLHA,
    "instrutor": TituloPagar.TIPO_FOLHA,  # instructor fee → payroll
}

ENTIDADE_TIPO_MAP = {
    "fornecedor": "fornecedor",
    "folha": "funcionario",
    "folha_pagamento": "funcionario",
    "instrutor": "instrutor",
}


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


class TituloPagarWriteSerializer(serializers.ModelSerializer):
    """
    Serializer para criação/edição de títulos.
    Aceita favorecido_nome (string) e resolve automaticamente para Favorecido FK.
    """
    favorecido_nome = serializers.CharField(write_only=True)
    favorecido_tipo = serializers.CharField(write_only=True, required=False, default="outros")

    class Meta:
        model = TituloPagar
        fields = [
            "tipo", "favorecido_nome", "favorecido_tipo",
            "descricao", "num_parcela", "total_parcelas", "valor",
            "data_emissao", "data_vencimento", "is_recorrente", "periodicidade_dias",
        ]

    def validate_tipo(self, value):
        return TIPO_FRONTEND_TO_BACKEND.get(value, value)

    def create(self, validated_data):
        nome = validated_data.pop("favorecido_nome")
        tipo_frontend = validated_data.pop("favorecido_tipo", "outros")
        tipo_entidade = ENTIDADE_TIPO_MAP.get(tipo_frontend, "fornecedor")

        from apps.pessoas.models import EntidadePagar, Favorecido
        entidade = EntidadePagar.objects.filter(nome=nome).first()
        if not entidade:
            entidade = EntidadePagar.objects.create(nome=nome, tipo=tipo_entidade)
        favorecido, _ = Favorecido.objects.get_or_create(entidade=entidade)
        validated_data["favorecido"] = favorecido
        return super().create(validated_data)


class BaixaTituloPagarSerializer(serializers.Serializer):
    valor_pago = serializers.DecimalField(max_digits=10, decimal_places=2)
    data_pagamento = serializers.DateField(required=False, allow_null=True)
