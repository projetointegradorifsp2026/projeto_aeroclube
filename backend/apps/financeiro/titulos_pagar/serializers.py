from rest_framework import serializers
from .models import TituloPagar, BaixaTituloPagar

TIPO_FRONTEND_TO_BACKEND = {
    "folha": TituloPagar.TIPO_FOLHA,
    "instrutor": TituloPagar.TIPO_FOLHA,
}


class BaixaTituloPagarSerializer(serializers.ModelSerializer):
    """Extrato (somente leitura) de cada pagamento de um título a pagar."""
    forma_pagamento_display = serializers.CharField(source="get_forma_pagamento_display", read_only=True)
    criado_por_nome = serializers.CharField(source="criado_por.nome", read_only=True, default=None)

    class Meta:
        model = BaixaTituloPagar
        fields = [
            "id", "data", "valor", "multa",
            "forma_pagamento", "forma_pagamento_display",
            "criado_por", "criado_por_nome", "created_at",
        ]
        read_only_fields = fields


class TituloPagarSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    esta_atrasado = serializers.BooleanField(read_only=True)
    favorecido_nome = serializers.SerializerMethodField()
    baixas = BaixaTituloPagarSerializer(many=True, read_only=True)

    class Meta:
        model = TituloPagar
        fields = [
            "id", "tipo", "tipo_display",
            "favorecido", "favorecido_nome", "custos",
            "descricao",
            "num_parcela", "total_parcelas",
            "valor",
            "data_emissao", "data_vencimento",
            "status", "status_display", "esta_atrasado",
            "multa", "valor_pago", "data_pagamento",
            "is_recorrente", "periodicidade_dias",
            "baixas",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_favorecido_nome(self, obj):
        f = obj.favorecido
        if f.usuario:
            return f.usuario.nome
        if f.entidade:
            return f.entidade.nome
        return None


class TituloPagarWriteSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de títulos.

    - fornecedor / folha_pagamento / conta_fixa: recebe favorecido_id (PK do registro
      correspondente) e resolve para o Favorecido correto.
    - outros: recebe favorecido_nome (texto livre) e cria/encontra EntidadePagar por nome.
    """
    favorecido_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    favorecido_nome = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")
    favorecido_tipo = serializers.CharField(write_only=True, required=False, default="outros")

    class Meta:
        model = TituloPagar
        fields = [
            "tipo", "favorecido_id", "favorecido_nome", "favorecido_tipo",
            "descricao", "num_parcela", "total_parcelas", "valor",
            "data_emissao", "data_vencimento", "is_recorrente", "periodicidade_dias",
        ]

    def validate_tipo(self, value):
        return TIPO_FRONTEND_TO_BACKEND.get(value, value)

    def create(self, validated_data):
        tipo = validated_data.get("tipo")
        favorecido_id = validated_data.pop("favorecido_id", None)
        nome = validated_data.pop("favorecido_nome", "")
        favorecido_tipo = validated_data.pop("favorecido_tipo", "outros")

        from apps.users.models import Usuario
        from apps.pessoas.models import EntidadePagar, Favorecido
        from apps.financeiro.conta_fixa.models import ContaFixa

        if tipo == TituloPagar.TIPO_FOLHA and favorecido_id:
            try:
                user = Usuario.objects.get(pk=favorecido_id)
            except Usuario.DoesNotExist:
                raise serializers.ValidationError({"favorecido_id": "Usuário não encontrado."})
            fav = Favorecido.objects.filter(usuario=user).first()
            if not fav:
                fav = Favorecido.objects.create(usuario=user)

        elif tipo == TituloPagar.TIPO_CONTA_FIXA and favorecido_id:
            try:
                conta_fixa = ContaFixa.objects.get(pk=favorecido_id)
            except ContaFixa.DoesNotExist:
                raise serializers.ValidationError({"favorecido_id": "Conta fixa não encontrada."})
            entidade = EntidadePagar.objects.filter(nome=conta_fixa.favorecido).first()
            if not entidade:
                entidade = EntidadePagar.objects.create(
                    nome=conta_fixa.favorecido, tipo=EntidadePagar.TIPO_FORNECEDOR
                )
            fav = Favorecido.objects.filter(entidade=entidade).first()
            if not fav:
                fav = Favorecido.objects.create(entidade=entidade)

        elif tipo == TituloPagar.TIPO_FORNECEDOR and favorecido_id:
            try:
                entidade = EntidadePagar.objects.get(pk=favorecido_id)
            except EntidadePagar.DoesNotExist:
                raise serializers.ValidationError({"favorecido_id": "Fornecedor não encontrado."})
            fav = Favorecido.objects.filter(entidade=entidade).first()
            if not fav:
                fav = Favorecido.objects.create(entidade=entidade)

        else:
            if not nome:
                raise serializers.ValidationError({"favorecido_nome": "Favorecido é obrigatório."})
            entidade = EntidadePagar.objects.filter(nome=nome).first()
            if not entidade:
                entidade = EntidadePagar.objects.create(nome=nome, tipo=EntidadePagar.TIPO_FORNECEDOR)
            fav = Favorecido.objects.filter(entidade=entidade).first()
            if not fav:
                fav = Favorecido.objects.create(entidade=entidade)

        validated_data["favorecido"] = fav
        return super().create(validated_data)


class BaixaPagarInputSerializer(serializers.Serializer):
    """Input da baixa total de um título a pagar."""
    valor_pago = serializers.DecimalField(max_digits=10, decimal_places=2)
    data_pagamento = serializers.DateField(required=False, allow_null=True)
    multa = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, default=0)
    forma_pagamento = serializers.ChoiceField(
        choices=BaixaTituloPagar.FORMA_CHOICES, required=False, default=BaixaTituloPagar.FORMA_DINHEIRO
    )
