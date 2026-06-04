from rest_framework import serializers
from apps.pessoas.validators import validar_cpf_cnpj
from .models import Usuario, UsuarioPerfil


def _validar_cpf_cnpj_drf(value):
    from django.core.exceptions import ValidationError as DjangoValidationError
    try:
        return validar_cpf_cnpj(value)
    except DjangoValidationError as e:
        raise serializers.ValidationError(e.messages[0])


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
            "cep",
            "logradouro",
            "numero",
            "bairro",
            "cidade",
            "uf",
            "perfil_ativo",
            "perfil_ativo_display",
            "perfis",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]

    def validate_cpf_cnpj(self, value):
        return _validar_cpf_cnpj_drf(value)


class UsuarioCreateSerializer(serializers.ModelSerializer):
    """
    Cria usuário sem campo de senha — a senha é gerada automaticamente:
    'aero' + 5 primeiros dígitos do CPF (ex: CPF 12345678900 → aero12345).
    """

    class Meta:
        model = Usuario
        fields = [
            "nome", "cpf_cnpj", "email", "perfil_ativo",
            "cep", "logradouro", "numero", "bairro", "cidade", "uf",
        ]
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
        return _validar_cpf_cnpj_drf(value)

    def create(self, validated_data):
        cpf = validated_data.get("cpf_cnpj", "")
        digits = "".join(filter(str.isdigit, cpf))
        password = f"aero{digits[:5]}"
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user
