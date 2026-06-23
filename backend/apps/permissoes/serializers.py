from rest_framework import serializers

from .models import Funcionalidade


class FuncionalidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Funcionalidade
        fields = ["id", "chave", "nome", "rota", "ordem"]


class PermissaoItemSerializer(serializers.Serializer):
    """Item do PATCH em lote da matriz de permissões."""

    perfil = serializers.CharField()
    funcionalidade = serializers.SlugField()
    permitido = serializers.BooleanField()
