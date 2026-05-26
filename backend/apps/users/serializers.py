from rest_framework import serializers
from .models import Usuario, UsuarioPerfil


class UsuarioPerfilSerializer(serializers.ModelSerializer):
    perfil_display = serializers.CharField(source="get_perfil_display", read_only=True)

    class Meta:
        model = UsuarioPerfil
        fields = ["id", "perfil", "perfil_display"]


class UsuarioSerializer(serializers.ModelSerializer):
    perfis = UsuarioPerfilSerializer(many=True, read_only=True)
    perfil_ativo_display = serializers.CharField(source="get_perfil_ativo_display", read_only=True)
    saldo_carteira = serializers.DecimalField(
        source="carteira.saldo", max_digits=10, decimal_places=2, read_only=True, default=0
    )

    class Meta:
        model = Usuario
        fields = [
            "id",
            "nome",
            "cpf_cnpj",
            "email",
            "perfil_ativo",
            "perfil_ativo_display",
            "perfis",
            "is_active",
            "date_joined",
            "saldo_carteira",
        ]
        read_only_fields = ["id", "date_joined"]


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = ["nome", "cpf_cnpj", "email", "perfil_ativo", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user
