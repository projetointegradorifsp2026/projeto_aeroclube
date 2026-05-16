from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Voo, calcular_tempo_decimal
from .serializers import VooSerializer, SimulacaoTempoDecimalSerializer


class VooViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/voos/
    POST cria o voo, calcula tempo decimal e valor automaticamente.
    """
    queryset = Voo.objects.select_related("participante", "instrutor", "aeronave").order_by("-data_voo")
    serializer_class = VooSerializer
    permission_classes = [IsAuthenticated]

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
    """
    GET /api/v1/voos/simular-decimal/?minutos=47
    Retorna o tempo decimal calculado para o número de minutos informado.
    """
    minutos = request.query_params.get("minutos")
    if not minutos or not minutos.isdigit():
        return Response({"detail": "Parâmetro 'minutos' é obrigatório e deve ser inteiro."}, status=400)
    resultado = {"minutos": int(minutos), "tempo_decimal": str(calcular_tempo_decimal(int(minutos)))}
    return Response(resultado)
