from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import Carteira, MovimentacaoCarteira
from .serializers import (
    CarteiraSerializer,
    CarteiraResumoSerializer,
    MovimentacaoCarteiraSerializer,
    CreditarCarteiraSerializer,
    DebitarCarteiraSerializer,
)
from apps.financeiro.titulos_receber.models import TituloReceber
from django.utils import timezone


class CarteiraViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/carteiras/         — lista carteiras (resumido)
    GET /api/v1/carteiras/{id}/    — detalhe com extrato completo
    POST /api/v1/carteiras/{id}/creditar/ — RF12: compra antecipada de horas
    """
    queryset = Carteira.objects.select_related("participante").order_by("participante__nome")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CarteiraSerializer
        return CarteiraResumoSerializer

    @action(detail=True, methods=["post"], url_path="creditar")
    def creditar(self, request, pk=None):
        """
        POST /api/v1/carteiras/{id}/creditar/
        RF12: Registra compra antecipada de horas.
        Cria movimentação de crédito + título a receber.
        """
        carteira = self.get_object()
        ser = CreditarCarteiraSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        valor = ser.validated_data["valor"]
        descricao = ser.validated_data["descricao"]
        data_vencimento = ser.validated_data.get("data_vencimento")

        with transaction.atomic():
            # Credita na carteira
            carteira.creditar(valor=valor, descricao=descricao, data_vencimento=data_vencimento)

            # Gera título a receber pela compra das horas
            titulo = TituloReceber.objects.create(
                participante=carteira.participante,
                tipo=TituloReceber.TIPO_HORAS_PRE_PAGAS,
                descricao=f"Compra de horas pré-pagas — {descricao}",
                valor_original=valor,
                data_vencimento=timezone.now().date(),
            )

        return Response({
            "carteira": CarteiraSerializer(carteira).data,
            "titulo_receber_id": titulo.id,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="debitar")
    def debitar(self, request, pk=None):
        """
        POST /api/v1/carteiras/{id}/debitar/
        RF13: Débito de saldo no uso de horas pré-pagas.
        """
        carteira = self.get_object()
        ser = DebitarCarteiraSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        valor = ser.validated_data["valor"]
        descricao = ser.validated_data["descricao"]
        voo_id = ser.validated_data.get("voo")

        if not carteira.tem_saldo_suficiente(valor):
            return Response(
                {"detail": "Saldo insuficiente na carteira."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            mov = carteira.debitar(valor=valor, descricao=descricao)
            if voo_id:
                from apps.voos.models import Voo
                try:
                    mov.voo = Voo.objects.get(pk=voo_id)
                    mov.save()
                except Voo.DoesNotExist:
                    pass

        return Response(CarteiraSerializer(carteira).data)


class MovimentacaoCarteiraViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/movimentacoes-carteira/?carteira=ID"""
    queryset = MovimentacaoCarteira.objects.select_related("carteira__participante").order_by("-data_transacao")
    serializer_class = MovimentacaoCarteiraSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        carteira_id = self.request.query_params.get("carteira")
        if carteira_id:
            qs = qs.filter(carteira_id=carteira_id)
        participante_id = self.request.query_params.get("participante")
        if participante_id:
            qs = qs.filter(carteira__participante_id=participante_id)
        return qs
