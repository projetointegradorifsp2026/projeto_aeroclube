from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction

from .models import TituloReceber
from .serializers import TituloReceberSerializer, BaixaParcialSerializer, QuitacaoMultiplaSerializer


class TituloReceberViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/titulos-receber/
    Filtros: ?participante=ID  ?status=aberto|baixado  ?atrasado=true
    """
    queryset = TituloReceber.objects.select_related("participante", "cliente", "voo").order_by("data_vencimento")
    serializer_class = TituloReceberSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        participante_id = self.request.query_params.get("participante")
        if participante_id:
            qs = qs.filter(participante_id=participante_id)
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        if self.request.query_params.get("atrasado") == "true":
            qs = qs.filter(status=TituloReceber.STATUS_ABERTO, data_vencimento__lt=timezone.now().date())
        return qs

    @action(detail=True, methods=["post"], url_path="baixa-parcial")
    def baixa_parcial(self, request, pk=None):
        """POST /api/v1/titulos-receber/{id}/baixa-parcial/ — RF06"""
        titulo = self.get_object()
        if titulo.status == TituloReceber.STATUS_BAIXADO:
            return Response({"detail": "Título já está baixado."}, status=status.HTTP_400_BAD_REQUEST)
        ser = BaixaParcialSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        valor_via_carteira = ser.validated_data.get("valor_via_carteira", Decimal("0"))
        if valor_via_carteira > 0 and titulo.cliente_id:
            return Response(
                {"detail": "Pagamento via carteira não é permitido para clientes de serviço."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        titulo.aplicar_baixa_parcial(
            valor=ser.validated_data["valor"],
            juros=ser.validated_data.get("multa", Decimal("0")),
            data=ser.validated_data.get("data_pagamento"),
            valor_via_carteira=valor_via_carteira,
            forma_pagamento=ser.validated_data.get("forma_pagamento"),
            criado_por=request.user if request.user.is_authenticated else None,
        )
        return Response(TituloReceberSerializer(titulo).data)

    @action(detail=False, methods=["post"], url_path="quitacao-multipla")
    def quitacao_multipla(self, request):
        """
        POST /api/v1/titulos-receber/quitacao-multipla/ — RF07
        Distribui o valor pago pelos títulos selecionados (na ordem enviada).
        """
        ser = QuitacaoMultiplaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        ids = ser.validated_data["titulo_ids"]
        valor_disponivel = Decimal(str(ser.validated_data["valor_total"]))
        data_pgto = ser.validated_data.get("data_pagamento") or timezone.now().date()
        forma_pagamento = ser.validated_data.get("forma_pagamento")
        criado_por = request.user if request.user.is_authenticated else None

        titulos = TituloReceber.objects.filter(
            id__in=ids, status=TituloReceber.STATUS_ABERTO
        ).order_by("data_vencimento")

        resultado = []
        with transaction.atomic():
            for titulo in titulos:
                if valor_disponivel <= 0:
                    break
                saldo = titulo.saldo_devedor
                valor_aplicar = min(valor_disponivel, saldo)
                titulo.aplicar_baixa_parcial(
                    valor=valor_aplicar, data=data_pgto,
                    forma_pagamento=forma_pagamento, criado_por=criado_por,
                )
                valor_disponivel -= valor_aplicar
                resultado.append(TituloReceberSerializer(titulo).data)

        return Response({
            "titulos_atualizados": resultado,
            "valor_restante": str(valor_disponivel),
        })
