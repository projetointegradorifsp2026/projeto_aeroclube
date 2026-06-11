from rest_framework import serializers
from .models import Receita


class ReceitaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    participante_nome = serializers.SerializerMethodField()
    esta_faturada = serializers.BooleanField(read_only=True)
    titulos_info = serializers.SerializerMethodField()
    titulos_resumo = serializers.SerializerMethodField()

    class Meta:
        model = Receita
        fields = [
            "id",
            "participante", "cliente", "participante_nome",
            "tipo", "tipo_display", "descricao",
            "voo",
            "num_parcela", "total_parcelas",
            "valor",
            "data_emissao", "data_vencimento",
            "status", "status_display", "esta_faturada",
            "titulos_info", "titulos_resumo",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_participante_nome(self, obj):
        if obj.participante:
            return obj.participante.nome
        if obj.cliente:
            return obj.cliente.nome
        return "—"

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
                "valor": str(t.valor_original),
                "valor_pago": str(t.valor_pago),
                "multa": str(t.multa),
                "data_vencimento": str(t.data_vencimento),
                "data_pagamento": str(t.data_pagamento) if t.data_pagamento else None,
                "status": t.status,
                "status_display": t.get_status_display(),
                "esta_atrasado": t.esta_atrasado,
            })
        return result

    def validate(self, data):
        participante = data.get("participante") or (self.instance and self.instance.participante)
        cliente = data.get("cliente") or (self.instance and self.instance.cliente)
        if not participante and not cliente:
            raise serializers.ValidationError(
                {"participante": "Informe participante ou cliente."}
            )
        return data
