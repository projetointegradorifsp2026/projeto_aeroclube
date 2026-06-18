from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import Voo, calcular_tempo_decimal
from .serializers import VooSerializer, SimulacaoTempoDecimalSerializer


class VooViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/voos/

    Para PLANADOR com instrutor: gera automaticamente Custo pendente de repasse
    (o TituloPagar era criado antes; agora é pendente, sem gerar título).

    Para participante e instrutor AVIÃO: a Receita e o Custo são criados pelo frontend
    (que conhece o valor correto após abatimento de carteira).
    """
    queryset = Voo.objects.select_related("participante", "instrutor", "aeronave").order_by("-data_voo")
    serializer_class = VooSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            voo = serializer.save()
            self._gerar_custo_instrutor_planador(voo)
        return Response(VooSerializer(voo).data, status=status.HTTP_201_CREATED)

    def _gerar_custo_instrutor_planador(self, voo: Voo):
        """
        Cria Custo (pendente) de repasse para instrutores de PLANADOR.
        Para aviões, o frontend cria o Custo diretamente.
        """
        if not (voo.instrutor and voo.valor_repasse_instrutor > Decimal("0.00")):
            return

        from apps.aeronaves.models import Aeronave
        if voo.aeronave.tipo != Aeronave.TIPO_PLANADOR:
            return

        from apps.financeiro.custos.models import Custo
        from apps.pessoas.models import Favorecido

        fav, _ = Favorecido.objects.get_or_create(usuario=voo.instrutor)
        descricao = f"Repasse instrução planador – {voo.data_voo} – {voo.aeronave.nome}"

        Custo.objects.create(
            tipo=Custo.TIPO_FOLHA,
            favorecido=fav,
            descricao=descricao,
            num_parcela=1,
            total_parcelas=1,
            valor=voo.valor_repasse_instrutor,
            data_emissao=voo.data_voo,
            data_vencimento=voo.data_voo,
            status=Custo.STATUS_PENDENTE,
        )

    def get_queryset(self):
        qs = super().get_queryset()
        participante_id = self.request.query_params.get("participante")
        if participante_id:
            qs = qs.filter(participante_id=participante_id)
        data_inicio = self.request.query_params.get("data_inicio")
        data_fim = self.request.query_params.get("data_fim")
        if data_inicio:
            qs = qs.filter(data_voo__gte=data_inicio)
        if data_fim:
            qs = qs.filter(data_voo__lte=data_fim)
        return qs


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def simular_tempo_decimal(request):
    """GET /api/v1/voos/simular-decimal/?minutos=47"""
    minutos = request.query_params.get("minutos")
    if not minutos or not minutos.isdigit():
        return Response({"detail": "Parâmetro 'minutos' é obrigatório e deve ser inteiro."}, status=400)
    resultado = {"minutos": int(minutos), "tempo_decimal": str(calcular_tempo_decimal(int(minutos)))}
    return Response(resultado)
