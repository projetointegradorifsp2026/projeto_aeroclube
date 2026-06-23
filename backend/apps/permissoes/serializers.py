from rest_framework import serializers

from .models import Funcionalidade


class FuncionalidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Funcionalidade
        fields = ["id", "chave", "nome", "rota", "ordem"]


class PermissaoUsuarioItemSerializer(serializers.Serializer):
    """Item do PATCH de telas de um admin secundário (checkbox)."""

    funcionalidade = serializers.SlugField()
    permitido = serializers.BooleanField()
