from rest_framework import serializers
from .models import ContaFixa


class ContaFixaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContaFixa
        fields = ["id", "nome", "descricao", "favorecido", "valor", "dia_vencimento", "is_active"]
