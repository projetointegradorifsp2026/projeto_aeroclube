from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import Receita
from .serializers import ReceitaSerializer


def faturar_receita(receita: Receita, parcelas=None):
    """
    Gera TituloReceber(es) a partir de uma Receita e marca como FATURADA.

    - parcelas=None: cria 1 título (comportamento original).
    - parcelas=[{valor, data_vencimento}, ...]: divide em N parcelas.

    Idempotente para o caso sem parcelas (retorna título existente).
    """
    from apps.financeiro.titulos_receber.models import TituloReceber

    if parcelas:
        total_parcelas = len(parcelas)
        titulos = []
        for i, parcela in enumerate(parcelas, 1):
            voo_field = None
            if i == 1 and receita.voo and not TituloReceber.objects.filter(voo=receita.voo).exists():
                voo_field = receita.voo
            titulo = TituloReceber.objects.create(
                participante=receita.participante,
                cliente_externo=receita.cliente_externo,
                tipo=receita.tipo,
                descricao=receita.descricao,
                voo=voo_field,
                num_parcela=i,
                total_parcelas=total_parcelas,
                valor_original=Decimal(str(parcela["valor"])),
                data_emissao=receita.data_emissao,
                data_vencimento=parcela["data_vencimento"],
                status=TituloReceber.STATUS_ABERTO,
            )
            titulo.receitas.add(receita)
            titulos.append(titulo)
    else:
        titulo_existente = receita.titulos.first()
        if titulo_existente:
            return [titulo_existente]

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
        )
        titulo.receitas.add(receita)
        titulos = [titulo]

    if receita.status == Receita.STATUS_PENDENTE:
        receita.status = Receita.STATUS_FATURADA
        receita.save(update_fields=["status", "updated_at"])

    return titulos


class ReceitaViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/receitas/
    Filtros: ?participante=ID  ?status=pendente|faturada|quitada  ?tipo=voo

    POST /api/v1/receitas/{id}/faturar/
      Body opcional: {"parcelas": [{"valor": 100, "data_vencimento": "2026-07-01"}, ...]}

    POST /api/v1/receitas/faturar-agrupado/
      Agrupa N receitas do mesmo participante num único TituloReceber.
      Body: {"receita_ids": [1,2,3]}
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
        """
        Gera TituloReceber(es) a partir desta receita.
        Aceita body com `parcelas` para dividir em N títulos.
        """
        receita = self.get_object()
        parcelas = request.data.get("parcelas")  # lista de {valor, data_vencimento} ou None

        if parcelas:
            # Validação básica das parcelas
            if not isinstance(parcelas, list) or len(parcelas) == 0:
                return Response(
                    {"detail": "parcelas deve ser uma lista não-vazia."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            total_parcelas_valor = sum(Decimal(str(p.get("valor", 0))) for p in parcelas)
            if abs(total_parcelas_valor - receita.valor) > Decimal("0.01"):
                return Response(
                    {"detail": f"Soma das parcelas ({total_parcelas_valor}) diferente do valor da receita ({receita.valor})."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            titulos = faturar_receita(receita, parcelas=parcelas)

        from apps.financeiro.titulos_receber.serializers import TituloReceberSerializer
        return Response(
            {
                "receita": ReceitaSerializer(receita).data,
                "titulos_receber": TituloReceberSerializer(titulos, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="faturar-agrupado")
    def faturar_agrupado(self, request):
        """
        Agrupa N receitas do mesmo participante em 1 TituloReceber.

        Body: {
            "receita_ids": [1, 2, 3],
            "data_vencimento": "2026-07-01"  // opcional
        }
        """
        receita_ids = request.data.get("receita_ids", [])
        if not receita_ids or len(receita_ids) < 2:
            return Response(
                {"detail": "Informe ao menos 2 receita_ids para agrupamento."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        receitas = list(Receita.objects.filter(id__in=receita_ids, status=Receita.STATUS_PENDENTE))
        if len(receitas) != len(receita_ids):
            return Response(
                {"detail": "Algumas receitas não foram encontradas ou já estão faturadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valida: mesmo participante/cliente_externo
        participantes = set(r.participante_id for r in receitas)
        clientes = set(r.cliente_externo_id for r in receitas)
        if len(participantes) > 1 or len(clientes) > 1:
            return Response(
                {"detail": "Só é possível agrupar receitas do mesmo devedor."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.financeiro.titulos_receber.models import TituloReceber

        valor_total = sum(r.valor for r in receitas)
        data_venc_raw = request.data.get("data_vencimento")
        if data_venc_raw:
            from datetime import date
            data_vencimento = date.fromisoformat(data_venc_raw)
        else:
            data_vencimento = max(r.data_vencimento for r in receitas)

        primeira = receitas[0]
        descricao = f"Cobrança agrupada ({len(receitas)} receitas)"

        with transaction.atomic():
            titulo = TituloReceber.objects.create(
                participante=primeira.participante,
                cliente_externo=primeira.cliente_externo,
                tipo=primeira.tipo,
                descricao=descricao,
                num_parcela=1,
                total_parcelas=1,
                valor_original=valor_total,
                data_emissao=primeira.data_emissao,
                data_vencimento=data_vencimento,
                status=TituloReceber.STATUS_ABERTO,
            )
            titulo.receitas.set(receitas)
            Receita.objects.filter(id__in=receita_ids).update(status=Receita.STATUS_FATURADA)

        from apps.financeiro.titulos_receber.serializers import TituloReceberSerializer
        return Response(
            {
                "receitas_faturadas": len(receitas),
                "titulo_receber": TituloReceberSerializer(titulo).data,
            },
            status=status.HTTP_201_CREATED,
        )
