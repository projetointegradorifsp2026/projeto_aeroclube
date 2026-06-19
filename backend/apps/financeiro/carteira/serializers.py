from django.utils import timezone
from rest_framework import serializers
from .models import Carteira, MovimentacaoCarteira


class MovimentacaoCarteiraSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    participante_id = serializers.IntegerField(source="carteira.participante.id", read_only=True)
    participante_nome = serializers.CharField(source="carteira.participante.nome", read_only=True)
    status_lote = serializers.SerializerMethodField()
    tarifas_historicas = serializers.SerializerMethodField()

    class Meta:
        model = MovimentacaoCarteira
        fields = [
            "id", "tipo", "tipo_display",
            "valor", "saldo_restante", "descricao",
            "data_transacao", "data_vencimento",
            "status_lote",
            "tarifas_historicas",
            "voo",
            "participante_id", "participante_nome",
            "metadados",
        ]
        read_only_fields = ["id", "data_transacao"]

    def get_status_lote(self, obj):
        if obj.tipo != MovimentacaoCarteira.TIPO_CREDITO:
            return None
        if obj.data_vencimento is None:
            return "valido"
        hoje = timezone.now().date()
        return "expirado" if obj.data_vencimento < hoje else "valido"

    def get_tarifas_historicas(self, obj):
        if obj.tipo != MovimentacaoCarteira.TIPO_CREDITO:
            return None
        from apps.aeronaves.models import Aeronave, HistoricoTarifaAeronave
        result = {}
        for aeronave in Aeronave.objects.filter(is_deleted=False, is_active=True):
            historico = (
                HistoricoTarifaAeronave.objects
                .filter(aeronave=aeronave, alterado_em__lte=obj.data_transacao)
                .order_by("-alterado_em")
                .first()
            )
            if historico and historico.valores_vigentes:
                result[str(aeronave.id)] = {
                    "nome": aeronave.nome,
                    "tipo": aeronave.tipo,
                    **historico.valores_vigentes,
                }
        return result


class CarteiraSerializer(serializers.ModelSerializer):
    participante_nome = serializers.CharField(source="participante.nome", read_only=True)
    movimentacoes = MovimentacaoCarteiraSerializer(many=True, read_only=True)

    class Meta:
        model = Carteira
        fields = ["id", "participante", "participante_nome", "saldo", "updated_at", "movimentacoes"]
        read_only_fields = ["id", "saldo", "updated_at"]


class CarteiraResumoSerializer(serializers.ModelSerializer):
    """Versão resumida (sem movimentações) para listagem."""
    participante_nome = serializers.CharField(source="participante.nome", read_only=True)

    class Meta:
        model = Carteira
        fields = ["id", "participante", "participante_nome", "saldo", "updated_at"]


class CreditarCarteiraSerializer(serializers.Serializer):
    """RF12: Compra antecipada de horas."""
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    descricao = serializers.CharField(max_length=300, default="Compra de horas pré-pagas")
    data_vencimento = serializers.DateField(required=False, allow_null=True)
    # Campos opcionais para compra por horas (price freeze)
    aeronave_id = serializers.IntegerField(required=False, allow_null=True)
    tipo_voo = serializers.CharField(max_length=20, required=False, allow_null=True)
    horas = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True)
