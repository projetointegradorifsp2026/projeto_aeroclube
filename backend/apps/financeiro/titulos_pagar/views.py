from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import TituloPagar
from .serializers import TituloPagarSerializer, TituloPagarWriteSerializer, BaixaTituloPagarSerializer


class TituloPagarViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/titulos-pagar/
    Filtros: ?status=aberto|baixado  ?atrasado=true  ?tipo=fornecedor
    POST /api/v1/titulos-pagar/{id}/baixar/ — registra pagamento
    """
    queryset = TituloPagar.objects.select_related("favorecido__usuario", "favorecido__entidade").order_by("data_vencimento")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return TituloPagarWriteSerializer
        return TituloPagarSerializer

    def create(self, request, *args, **kwargs):
        write_ser = TituloPagarWriteSerializer(data=request.data)
        write_ser.is_valid(raise_exception=True)
        titulo = write_ser.save()
        return Response(TituloPagarSerializer(titulo).data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        tipo_param = self.request.query_params.get("tipo")
        if tipo_param:
            qs = qs.filter(tipo=tipo_param)
        atrasado = self.request.query_params.get("atrasado")
        if atrasado == "true":
            hoje = timezone.now().date()
            qs = qs.filter(status=TituloPagar.STATUS_ABERTO, data_vencimento__lt=hoje)
        return qs

    @action(detail=True, methods=["post"], url_path="baixar")
    def baixar(self, request, pk=None):
        """POST /api/v1/titulos-pagar/{id}/baixar/ — baixa total."""
        titulo = self.get_object()
        if titulo.status == TituloPagar.STATUS_BAIXADO:
            return Response({"detail": "Título já está baixado."}, status=status.HTTP_400_BAD_REQUEST)
        ser = BaixaTituloPagarSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        titulo.baixar(**ser.validated_data)
        return Response(TituloPagarSerializer(titulo).data)
