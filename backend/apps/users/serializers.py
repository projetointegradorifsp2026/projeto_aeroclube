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
        ]
        read_only_fields = ["id", "date_joined"]


class UsuarioCreateSerializer(serializers.ModelSerializer):
    """
    Cria usuário sem campo de senha — a senha é gerada automaticamente:
    'aero' + 5 primeiros dígitos do CPF (ex: CPF 12345678900 → aero12345).
    """

    class Meta:
        model = Usuario
        fields = ["nome", "cpf_cnpj", "email", "perfil_ativo"]
        extra_kwargs = {
            "perfil_ativo": {"required": False, "default": "aluno"},
            "cpf_cnpj": {"required": True, "allow_null": False, "allow_blank": False},
        }

    def validate_cpf_cnpj(self, value):
        digits = "".join(filter(str.isdigit, value or ""))
        if len(digits) < 5:
            raise serializers.ValidationError(
                "CPF deve ter ao menos 5 dígitos para gerar a senha inicial."
            )
        return value

    def create(self, validated_data):
        cpf = validated_data.get("cpf_cnpj", "")
        digits = "".join(filter(str.isdigit, cpf))
        password = f"aero{digits[:5]}"
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user
