from rest_framework import serializers
from .models import RemessaCnab240


class RemessaCnab240Serializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = RemessaCnab240
        fields = [
            "id", "numero_sequencial", "data_geracao",
            "status", "status_display", "nome_arquivo",
            "qtd_titulos", "valor_total",
            "data_retorno", "qtd_liquidados", "qtd_rejeitados",
        ]
        read_only_fields = fields


class GerarRemessaSerializer(serializers.Serializer):
    """Parâmetros para gerar uma nova remessa."""
    titulo_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text="IDs dos TituloReceber a incluir na remessa.",
    )
    # Configurações da conta Sicoob (podem ser fixas via settings.py também)
    cnpj_cpf = serializers.CharField(max_length=18, help_text="CNPJ ou CPF do beneficiário.")
    nome_empresa = serializers.CharField(max_length=30)
    agencia = serializers.CharField(max_length=5, help_text="Prefixo da cooperativa Sicoob.")
    agencia_dv = serializers.CharField(max_length=1, default="0")
    conta = serializers.CharField(max_length=12)
    conta_dv = serializers.CharField(max_length=1, default="0")
    carteira = serializers.CharField(max_length=1, default="1")


class ProcessarRetornoSerializer(serializers.Serializer):
    """Recebe o arquivo de retorno para processamento."""
    arquivo = serializers.FileField(help_text="Arquivo de retorno CNAB240 enviado pelo Sicoob.")
    remessa_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID da RemessaCnab240 original (opcional, para vincular).",
    )
