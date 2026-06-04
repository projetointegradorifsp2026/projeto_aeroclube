from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import Custo
from .serializers import CustoSerializer, CustoWriteSerializer


def faturar_custo(custo: Custo):
    """
    Gera um TituloPagar a partir de um Custo e marca o custo como FATURADO.
    Idempotente: se já existe título vinculado, retorna o existente.
    """
    from apps.financeiro.titulos_pagar.models import TituloPagar

    titulo_existente = custo.titulos.first()
    if titulo_existente:
        return titulo_existente

    titulo = TituloPagar.objects.create(
        tipo=custo.tipo,
        favorecido=custo.favorecido,
        descricao=custo.descricao,
        num_parcela=custo.num_parcela,
        total_parcelas=custo.total_parcelas,
        valor=custo.valor,
        data_emissao=custo.data_emissao,
        data_vencimento=custo.data_vencimento,
        status=TituloPagar.STATUS_ABERTO,
        is_recorrente=custo.is_recorrente,
        periodicidade_dias=custo.periodicidade_dias,
        custo=custo,
    )
    if custo.status == Custo.STATUS_PENDENTE:
        custo.status = Custo.STATUS_FATURADO
        custo.save(update_fields=["status", "updated_at"])
    return titulo


class CustoViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/custos/
    Filtros: ?status=pendente|faturado|quitado|cancelado  ?tipo=fornecedor

    Criação aceita o campo opcional "gerar_titulo" (bool): se verdadeiro, já gera
    o TituloPagar vinculado e marca o custo como faturado.
    POST /api/v1/custos/{id}/faturar/ — gera o título manualmente depois.
    """
    queryset = Custo.objects.select_related("favorecido__usuario", "favorecido__entidade").all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return CustoWriteSerializer
        return CustoSerializer

    def create(self, request, *args, **kwargs):
        gerar_titulo = bool(request.data.get("gerar_titulo", False))
        write_ser = CustoWriteSerializer(data=request.data)
        write_ser.is_valid(raise_exception=True)
        with transaction.atomic():
            custo = write_ser.save()
            if gerar_titulo:
                faturar_custo(custo)
        return Response(CustoSerializer(custo).data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        tipo_param = self.request.query_params.get("tipo")
        if tipo_param:
            qs = qs.filter(tipo=tipo_param)
        return qs

    @action(detail=True, methods=["post"], url_path="faturar")
    def faturar(self, request, pk=None):
        """Gera o TituloPagar a partir deste custo (status → faturado)."""
        custo = self.get_object()
        if custo.status == Custo.STATUS_CANCELADO:
            return Response(
                {"detail": "Custo cancelado não pode ser faturado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            titulo = faturar_custo(custo)
        from apps.financeiro.titulos_pagar.serializers import TituloPagarSerializer
        return Response(
            {
                "custo": CustoSerializer(custo).data,
                "titulo_pagar": TituloPagarSerializer(titulo).data,
            },
            status=status.HTTP_201_CREATED,
        )
