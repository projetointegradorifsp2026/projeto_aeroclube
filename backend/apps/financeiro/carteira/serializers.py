from rest_framework import serializers
from .models import Carteira, MovimentacaoCarteira


class MovimentacaoCarteiraSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    participante_id = serializers.IntegerField(source="carteira.participante.id", read_only=True)
    participante_nome = serializers.CharField(source="carteira.participante.nome", read_only=True)

    class Meta:
        model = MovimentacaoCarteira
        fields = [
            "id", "tipo", "tipo_display",
            "valor", "descricao",
            "data_transacao", "data_vencimento",
            "voo",
            "participante_id", "participante_nome",
            "metadados",
        ]
        read_only_fields = ["id", "data_transacao"]


class CarteiraSerializer(serializers.ModelSerializer):
    participante_nome = serializers.CharField(source="participante.nome", read_only=True)
    movimentacoes = MovimentacaoCarteiraSerializer(many=True, read_only=True)

    class Meta:
        model = Carteira
        fields = ["id", "participante", "participante_nome", "saldo", "updated_at", "movimentacoes"]
        read_only_fields = ["id", "saldo", "updated_at"]


class CarteiraResumoSerializer(serializers.ModelSerializer):
    """Versão resumida (sem movimentações) para listagem."""
    participante_nome = serializers.CharField(source="participante.nome", read_only=True)

    class Meta:
        model = Carteira
        fields = ["id", "participante", "participante_nome", "saldo", "updated_at"]


class CreditarCarteiraSerializer(serializers.Serializer):
    """RF12: Compra antecipada de horas."""
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    descricao = serializers.CharField(max_length=300, default="Compra de horas pré-pagas")
    data_vencimento = serializers.DateField(required=False, allow_null=True)
    # Campos opcionais para compra por horas (price freeze)
    aeronave_id = serializers.IntegerField(required=False, allow_null=True)
    tipo_voo = serializers.CharField(max_length=20, required=False, allow_null=True)
    horas = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True)
