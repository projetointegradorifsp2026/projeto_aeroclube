from rest_framework import serializers
from .models import EntidadePagar, Fornecedor, Funcionario, Favorecido


class EntidadePagarSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = EntidadePagar
        fields = ["id", "nome", "cpf_cnpj", "email", "contato", "tipo", "tipo_display", "is_active", "usuario"]


class FornecedorSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Fornecedor
        fields = ["id", "nome", "cpf_cnpj", "email", "contato", "produto_servico", "tipo_display", "is_active"]


class FuncionarioSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Funcionario
        fields = ["id", "nome", "cpf_cnpj", "email", "contato", "funcao", "is_instrutor", "salario_base", "tipo_display", "is_active", "usuario"]


class FavorecidoSerializer(serializers.ModelSerializer):
    nome = serializers.SerializerMethodField()

    class Meta:
        model = Favorecido
        fields = ["id", "usuario", "entidade", "nome"]

    def get_nome(self, obj):
        if obj.usuario:
            return obj.usuario.nome
        if obj.entidade:
            return obj.entidade.nome
        return None
