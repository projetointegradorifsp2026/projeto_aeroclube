from rest_framework import serializers
from .models import TituloReceber, BaixaTitulo


class BaixaTituloSerializer(serializers.ModelSerializer):
    """Extrato (somente leitura) de cada pagamento de um título."""
    forma_pagamento_display = serializers.CharField(source="get_forma_pagamento_display", read_only=True)
    criado_por_nome = serializers.CharField(source="criado_por.nome", read_only=True, default=None)

    class Meta:
        model = BaixaTitulo
        fields = [
            "id", "data", "valor", "juros", "valor_via_carteira",
            "forma_pagamento", "forma_pagamento_display",
            "criado_por", "criado_por_nome", "created_at",
        ]
        read_only_fields = fields


class TituloReceberSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    esta_atrasado = serializers.BooleanField(read_only=True)
    saldo_devedor = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    valor_total_com_juros = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    participante_nome = serializers.SerializerMethodField()
    baixas = BaixaTituloSerializer(many=True, read_only=True)

    class Meta:
        model = TituloReceber
        fields = [
            "id", "participante", "cliente", "participante_nome",
            "tipo", "tipo_display", "descricao",
            "voo", "receitas",
            "num_parcela", "total_parcelas",
            "valor_original", "multa", "valor_pago", "valor_via_carteira",
            "valor_total_com_juros", "saldo_devedor",
            "data_emissao", "data_vencimento", "data_pagamento",
            "status", "status_display", "esta_atrasado",
            "baixas",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "valor_pago", "valor_via_carteira"]

    def get_participante_nome(self, obj):
        if obj.participante:
            return obj.participante.nome
        if obj.cliente:
            return obj.cliente.nome
        return "—"

    def validate(self, data):
        participante = data.get("participante") or self.instance and self.instance.participante
        cliente = data.get("cliente") or self.instance and self.instance.cliente
        if not participante and not cliente:
            raise serializers.ValidationError(
                {"participante": "Informe participante ou cliente."}
            )
        return data


class BaixaParcialSerializer(serializers.Serializer):
    """RF06: Baixa parcial de um único título."""
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    multa = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, default=0)
    data_pagamento = serializers.DateField(required=False, allow_null=True)
    valor_via_carteira = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    forma_pagamento = serializers.ChoiceField(
        choices=BaixaTitulo.FORMA_CHOICES, required=False, default=BaixaTitulo.FORMA_DINHEIRO
    )


class QuitacaoMultiplaSerializer(serializers.Serializer):
    """RF07: Quita múltiplos títulos em uma operação."""
    titulo_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    valor_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    data_pagamento = serializers.DateField(required=False, allow_null=True)
    forma_pagamento = serializers.ChoiceField(
        choices=BaixaTitulo.FORMA_CHOICES, required=False, default=BaixaTitulo.FORMA_DINHEIRO
    )
