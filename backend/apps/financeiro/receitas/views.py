from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import Receita
from .serializers import ReceitaSerializer


def faturar_receita(receita: Receita):
    """
    Gera um TituloReceber a partir de uma Receita e marca a receita como FATURADA.
    Reaproveita os dados da origem; o título nasce em aberto.
    Idempotente: se já existe título vinculado, retorna o existente.
    """
    from apps.financeiro.titulos_receber.models import TituloReceber

    titulo_existente = receita.titulos.first()
    if titulo_existente:
        return titulo_existente

    titulo = TituloReceber.objects.create(
        participante=receita.participante,
        cliente_externo=receita.cliente_externo,
        tipo=receita.tipo,
        descricao=receita.descricao,
        voo=receita.voo if not TituloReceber.objects.filter(voo=receita.voo).exists() else None,
        num_parcela=receita.num_parcela,
        total_parcelas=receita.total_parcelas,
        valor_original=receita.valor,
        data_emissao=receita.data_emissao,
        data_vencimento=receita.data_vencimento,
        status=TituloReceber.STATUS_ABERTO,
        receita=receita,
    )
    if receita.status == Receita.STATUS_PENDENTE:
        receita.status = Receita.STATUS_FATURADA
        receita.save(update_fields=["status", "updated_at"])
    return titulo


class ReceitaViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/receitas/
    Filtros: ?participante=ID  ?status=pendente|faturada|quitada|cancelada  ?tipo=voo

    Criação aceita o campo opcional "gerar_titulo" (bool): se verdadeiro, já gera
    o TituloReceber vinculado e marca a receita como faturada.
    POST /api/v1/receitas/{id}/faturar/ — gera o título manualmente depois.
    """
    queryset = Receita.objects.select_related("participante", "cliente_externo", "voo").all()
    serializer_class = ReceitaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        participante_id = self.request.query_params.get("participante")
        if participante_id:
            qs = qs.filter(participante_id=participante_id)
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        tipo_param = self.request.query_params.get("tipo")
        if tipo_param:
            qs = qs.filter(tipo=tipo_param)
        return qs

    def create(self, request, *args, **kwargs):
        gerar_titulo = bool(request.data.get("gerar_titulo", False))
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            receita = serializer.save()
            if gerar_titulo:
                faturar_receita(receita)
        return Response(self.get_serializer(receita).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="faturar")
    def faturar(self, request, pk=None):
        """Gera o TituloReceber a partir desta receita (status → faturada)."""
        receita = self.get_object()
        if receita.status == Receita.STATUS_CANCELADA:
            return Response(
                {"detail": "Receita cancelada não pode ser faturada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            titulo = faturar_receita(receita)
        from apps.financeiro.titulos_receber.serializers import TituloReceberSerializer
        return Response(
            {
                "receita": ReceitaSerializer(receita).data,
                "titulo_receber": TituloReceberSerializer(titulo).data,
            },
            status=status.HTTP_201_CREATED,
        )
