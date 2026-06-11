from decimal import Decimal
from datetime import date as date_type
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils.dateparse import parse_date

from .models import Custo
from .serializers import CustoSerializer, CustoWriteSerializer


def faturar_custo(custo: Custo, parcelas=None):
    """
    Gera TituloPagar(es) a partir de um Custo e marca como FATURADO.

    - parcelas=None: cria 1 título (comportamento original).
    - parcelas=[{valor, data_vencimento}, ...]: divide em N parcelas.

    Idempotente para o caso sem parcelas (retorna título existente).
    """
    from apps.financeiro.titulos_pagar.models import TituloPagar

    # Tipos de custo que têm correspondência direta em TituloPagar
    TIPOS_VALIDOS_TITULO = (
        TituloPagar.TIPO_FORNECEDOR, TituloPagar.TIPO_FOLHA,
        TituloPagar.TIPO_CONTA_FIXA, TituloPagar.TIPO_OUTROS,
    )
    tipo_titulo = custo.tipo if custo.tipo in TIPOS_VALIDOS_TITULO else TituloPagar.TIPO_OUTROS

    if parcelas:
        total_parcelas = len(parcelas)
        titulos = []
        for i, parcela in enumerate(parcelas, 1):
            dv = parcela["data_vencimento"]
            if isinstance(dv, str):
                dv = parse_date(dv)
            titulo = TituloPagar.objects.create(
                tipo=tipo_titulo,
                favorecido=custo.favorecido,
                descricao=custo.descricao,
                num_parcela=i,
                total_parcelas=total_parcelas,
                valor=Decimal(str(parcela["valor"])),
                data_emissao=custo.data_emissao,
                data_vencimento=dv,
                status=TituloPagar.STATUS_ABERTO,
                is_recorrente=custo.is_recorrente if i == 1 else False,
                periodicidade_dias=custo.periodicidade_dias if i == 1 else None,
            )
            titulo.custos.add(custo)
            titulos.append(titulo)
    else:
        titulo_existente = custo.titulos.first()
        if titulo_existente:
            return [titulo_existente]

        titulo = TituloPagar.objects.create(
            tipo=tipo_titulo,
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
        )
        titulo.custos.add(custo)
        titulos = [titulo]

    if custo.status == Custo.STATUS_PENDENTE:
        custo.status = Custo.STATUS_FATURADO
        custo.save(update_fields=["status", "updated_at"])

    return titulos


class CustoViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/custos/
    Filtros: ?status=pendente|faturado|quitado  ?tipo=fornecedor

    POST /api/v1/custos/{id}/faturar/
      Body opcional: {"parcelas": [{"valor": 100, "data_vencimento": "2026-07-01"}, ...]}

    POST /api/v1/custos/faturar-agrupado/
      Agrupa N custos do mesmo favorecido num único TituloPagar.
      Body: {"custo_ids": [1,2,3]}
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
        """
        Gera TituloPagar(es) a partir deste custo.
        Aceita body com `parcelas` para dividir em N títulos.
        """
        custo = self.get_object()
        parcelas = request.data.get("parcelas")

        if parcelas:
            if not isinstance(parcelas, list) or len(parcelas) == 0:
                return Response(
                    {"detail": "parcelas deve ser uma lista não-vazia."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            total_parcelas_valor = sum(Decimal(str(p.get("valor", 0))) for p in parcelas)
            if abs(total_parcelas_valor - custo.valor) > Decimal("0.01"):
                return Response(
                    {"detail": f"Soma das parcelas ({total_parcelas_valor}) diferente do valor do custo ({custo.valor})."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            titulos = faturar_custo(custo, parcelas=parcelas)

        from apps.financeiro.titulos_pagar.serializers import TituloPagarSerializer
        return Response(
            {
                "custo": CustoSerializer(custo).data,
                "titulos_pagar": TituloPagarSerializer(titulos, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="faturar-agrupado")
    def faturar_agrupado(self, request):
        """
        Agrupa N custos do mesmo favorecido em 1 TituloPagar.

        Body: {
            "custo_ids": [1, 2, 3],
            "data_vencimento": "2026-07-01"  // opcional
        }
        """
        custo_ids = request.data.get("custo_ids", [])
        if not custo_ids or len(custo_ids) < 2:
            return Response(
                {"detail": "Informe ao menos 2 custo_ids para agrupamento."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        custos = list(
            Custo.objects.select_related("favorecido").filter(
                id__in=custo_ids, status=Custo.STATUS_PENDENTE
            )
        )
        if len(custos) != len(custo_ids):
            return Response(
                {"detail": "Alguns custos não foram encontrados ou já estão faturados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valida: mesmo favorecido
        favorecidos = set(c.favorecido_id for c in custos)
        if len(favorecidos) > 1:
            return Response(
                {"detail": "Só é possível agrupar custos do mesmo favorecido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.financeiro.titulos_pagar.models import TituloPagar

        valor_total = sum(c.valor for c in custos)
        data_venc_raw = request.data.get("data_vencimento")
        if data_venc_raw:
            from datetime import date
            data_vencimento = date.fromisoformat(data_venc_raw)
        else:
            data_vencimento = max(c.data_vencimento for c in custos)

        primeiro = custos[0]

        with transaction.atomic():
            titulo = TituloPagar.objects.create(
                tipo=TituloPagar.TIPO_OUTROS,
                favorecido=primeiro.favorecido,
                descricao=f"Pagamento agrupado ({len(custos)} custos)",
                num_parcela=1,
                total_parcelas=1,
                valor=valor_total,
                data_emissao=primeiro.data_emissao,
                data_vencimento=data_vencimento,
                status=TituloPagar.STATUS_ABERTO,
            )
            titulo.custos.set(custos)
            Custo.objects.filter(id__in=custo_ids).update(status=Custo.STATUS_FATURADO)

        from apps.financeiro.titulos_pagar.serializers import TituloPagarSerializer
        return Response(
            {
                "custos_faturados": len(custos),
                "titulo_pagar": TituloPagarSerializer(titulo).data,
            },
            status=status.HTTP_201_CREATED,
        )
