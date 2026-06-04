from rest_framework import serializers
from .models import Custo

# Mesmos apelidos de tipo usados em TituloPagar (frontend → backend)
TIPO_FRONTEND_TO_BACKEND = {
    "folha": Custo.TIPO_FOLHA,
    "instrutor": Custo.TIPO_FOLHA,
}


class CustoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    favorecido_nome = serializers.SerializerMethodField()
    esta_faturado = serializers.BooleanField(read_only=True)
    titulos_info = serializers.SerializerMethodField()
    titulos_resumo = serializers.SerializerMethodField()

    class Meta:
        model = Custo
        fields = [
            "id", "tipo", "tipo_display",
            "favorecido", "favorecido_nome",
            "descricao",
            "num_parcela", "total_parcelas",
            "valor",
            "data_emissao", "data_vencimento",
            "status", "status_display", "esta_faturado",
            "titulos_info", "titulos_resumo",
            "is_recorrente", "periodicidade_dias",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_favorecido_nome(self, obj):
        f = obj.favorecido
        if f.usuario:
            return f.usuario.nome
        if f.entidade:
            return f.entidade.nome
        return None

    def get_titulos_info(self, obj):
        titulos = obj.titulos.all()
        if not titulos.exists():
            return None
        total = titulos.count()
        baixados = titulos.filter(status="baixado").count()
        return {
            "total": total,
            "baixados": baixados,
            "todos_pagos": baixados == total,
            "parcialmente_pago": 0 < baixados < total,
        }

    def get_titulos_resumo(self, obj):
        result = []
        for t in obj.titulos.all():
            result.append({
                "id": t.id,
                "num_parcela": t.num_parcela,
                "total_parcelas": t.total_parcelas,
                "valor": str(t.valor),
                "valor_pago": str(t.valor_pago) if t.valor_pago is not None else None,
                "multa": str(t.multa),
                "data_vencimento": str(t.data_vencimento),
                "data_pagamento": str(t.data_pagamento) if t.data_pagamento else None,
                "status": t.status,
                "status_display": t.get_status_display(),
                "esta_atrasado": t.esta_atrasado,
            })
        return result


class CustoWriteSerializer(serializers.ModelSerializer):
    """
    Criação de Custo resolvendo o favorecido da mesma forma que TituloPagar:
    - fornecedor / folha_pagamento / conta_fixa: recebe favorecido_id e resolve o Favorecido.
    - outros: recebe favorecido_nome (texto livre) e cria/encontra a EntidadePagar.
    """
    favorecido_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    favorecido_nome = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")
    favorecido_tipo = serializers.CharField(write_only=True, required=False, default="outros")

    class Meta:
        model = Custo
        fields = [
            "tipo", "favorecido_id", "favorecido_nome", "favorecido_tipo",
            "descricao", "num_parcela", "total_parcelas", "valor",
            "data_emissao", "data_vencimento",
            "is_recorrente", "periodicidade_dias",
        ]

    def validate_tipo(self, value):
        return TIPO_FRONTEND_TO_BACKEND.get(value, value)

    def create(self, validated_data):
        tipo = validated_data.get("tipo")
        favorecido_id = validated_data.pop("favorecido_id", None)
        nome = validated_data.pop("favorecido_nome", "")
        validated_data.pop("favorecido_tipo", "outros")

        from apps.users.models import Usuario
        from apps.pessoas.models import EntidadePagar, Favorecido
        from apps.financeiro.conta_fixa.models import ContaFixa

        if tipo == Custo.TIPO_FOLHA and favorecido_id:
            try:
                user = Usuario.objects.get(pk=favorecido_id)
            except Usuario.DoesNotExist:
                raise serializers.ValidationError({"favorecido_id": "Usuário não encontrado."})
            fav = Favorecido.objects.filter(usuario=user).first() or Favorecido.objects.create(usuario=user)

        elif tipo == Custo.TIPO_CONTA_FIXA and favorecido_id:
            try:
                conta_fixa = ContaFixa.objects.get(pk=favorecido_id)
            except ContaFixa.DoesNotExist:
                raise serializers.ValidationError({"favorecido_id": "Conta fixa não encontrada."})
            entidade = EntidadePagar.objects.filter(nome=conta_fixa.favorecido).first()
            if not entidade:
                entidade = EntidadePagar.objects.create(
                    nome=conta_fixa.favorecido, tipo=EntidadePagar.TIPO_FORNECEDOR
                )
            fav = Favorecido.objects.filter(entidade=entidade).first() or Favorecido.objects.create(entidade=entidade)

        elif tipo == Custo.TIPO_FORNECEDOR and favorecido_id:
            try:
                entidade = EntidadePagar.objects.get(pk=favorecido_id)
            except EntidadePagar.DoesNotExist:
                raise serializers.ValidationError({"favorecido_id": "Fornecedor não encontrado."})
            fav = Favorecido.objects.filter(entidade=entidade).first() or Favorecido.objects.create(entidade=entidade)

        else:
            if not nome:
                raise serializers.ValidationError({"favorecido_nome": "Favorecido é obrigatório."})
            entidade = EntidadePagar.objects.filter(nome=nome).first()
            if not entidade:
                entidade = EntidadePagar.objects.create(nome=nome, tipo=EntidadePagar.TIPO_FORNECEDOR)
            fav = Favorecido.objects.filter(entidade=entidade).first() or Favorecido.objects.create(entidade=entidade)

        validated_data["favorecido"] = fav
        return super().create(validated_data)
