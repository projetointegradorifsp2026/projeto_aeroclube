from rest_framework import serializers
from .models import (
    ConfiguracaoBancaria,
    DadosBancarios,
    RemessaCNAB,
    RemessaCNABItem,
    RetornoCNAB,
    RetornoCNABItem,
)


class ConfiguracaoBancariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoBancaria
        fields = [
            "id", "descricao",
            "codigo_banco", "nome_banco",
            "nome_beneficiario", "cpf_cnpj",
            "prefixo_cooperativa", "dv_prefixo",
            "codigo_beneficiario", "dv_beneficiario",
            "conta_corrente", "dv_conta",
            "carteira", "modalidade", "convenio",
            "emissao", "tipo_formulario", "codigos_liquidacao",
            "chave_pix", "nome_recebedor", "cidade_recebedor",
            "proximo_nsa", "proximo_nosso_numero", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DadosBancariosSerializer(serializers.ModelSerializer):
    titular_nome = serializers.SerializerMethodField()

    class Meta:
        model = DadosBancarios
        fields = [
            "id", "usuario", "entidade", "cliente", "titular_nome",
            "banco", "codigo_banco", "agencia", "agencia_dv",
            "conta", "conta_dv", "tipo_conta",
            "titular", "cpf_cnpj_titular", "chave_pix",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_titular_nome(self, obj):
        if obj.usuario:
            return obj.usuario.nome
        if obj.entidade:
            return obj.entidade.nome
        if obj.cliente:
            return obj.cliente.nome
        return obj.titular or "—"

    def validate(self, data):
        usuario = data.get("usuario") or (self.instance and self.instance.usuario)
        entidade = data.get("entidade") or (self.instance and self.instance.entidade)
        cliente = data.get("cliente") or (self.instance and self.instance.cliente)
        vinculos = [bool(usuario), bool(entidade), bool(cliente)]
        if not any(vinculos):
            raise serializers.ValidationError("Informe usuário, entidade ou cliente.")
        if sum(vinculos) > 1:
            raise serializers.ValidationError("Vincule a apenas um (usuário, entidade OU cliente).")
        return data


class RemessaCNABItemSerializer(serializers.ModelSerializer):
    titulo_descricao = serializers.CharField(source="titulo_receber.descricao", read_only=True)

    class Meta:
        model = RemessaCNABItem
        fields = ["id", "remessa", "titulo_receber", "titulo_descricao", "nosso_numero", "valor", "created_at"]
        read_only_fields = ["id", "created_at"]


class RemessaCNABSerializer(serializers.ModelSerializer):
    itens = RemessaCNABItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = RemessaCNAB
        fields = [
            "id", "configuracao", "numero_sequencial", "data_geracao",
            "status", "status_display", "nome_arquivo",
            "quantidade_titulos", "valor_total", "criado_por",
            "itens", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "quantidade_titulos", "valor_total"]


class RetornoCNABItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RetornoCNABItem
        fields = [
            "id", "retorno", "titulo_receber", "nosso_numero",
            "codigo_ocorrencia", "descricao_ocorrencia",
            "valor_pago", "data_pagamento", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RetornoCNABSerializer(serializers.ModelSerializer):
    itens = RetornoCNABItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = RetornoCNAB
        fields = [
            "id", "configuracao", "data_retorno", "status", "status_display",
            "nome_arquivo", "criado_por", "itens", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
