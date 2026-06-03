from decimal import Decimal
from rest_framework import viewsets, status, mixins
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
)
from apps.financeiro.titulos_receber.models import TituloReceber
from django.utils import timezone


class CarteiraViewSet(mixins.CreateModelMixin,
                      mixins.ListModelMixin,
                      mixins.RetrieveModelMixin,
                      viewsets.GenericViewSet):
    """
    GET /api/v1/carteiras/              — lista carteiras (resumido)
    GET /api/v1/carteiras/?participante=ID — carteira de um participante
    GET /api/v1/carteiras/{id}/         — detalhe com extrato completo
    POST /api/v1/carteiras/             — cria carteira (get-or-create por participante)
    POST /api/v1/carteiras/{id}/creditar/ — RF12: compra antecipada de horas
    POST /api/v1/carteiras/{id}/debitar/  — débito manual (ex: voo pago via carteira)
    """
    queryset = Carteira.objects.select_related("participante").order_by("participante__nome")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CarteiraSerializer
        return CarteiraResumoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        participante_id = self.request.query_params.get("participante")
        if participante_id:
            qs = qs.filter(participante_id=participante_id)
        return qs

    def create(self, request, *args, **kwargs):
        """POST /api/v1/carteiras/ — cria ou retorna carteira existente do participante."""
        participante_id = request.data.get("participante")
        if not participante_id:
            return Response({"detail": "Campo 'participante' é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)
        carteira, created = Carteira.objects.get_or_create(
            participante_id=participante_id,
            defaults={"saldo": Decimal("0.00")},
        )
        return Response(
            CarteiraSerializer(carteira).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="creditar")
    def creditar(self, request, pk=None):
        """
        POST /api/v1/carteiras/{id}/creditar/
        RF12: Registra compra antecipada de horas.
        Cria movimentação de crédito + título a receber já baixado.
        """
        carteira = self.get_object()
        ser = CreditarCarteiraSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        valor = ser.validated_data["valor"]
        descricao = ser.validated_data["descricao"]
        data_vencimento = ser.validated_data.get("data_vencimento") or timezone.now().date()
        aeronave_id = ser.validated_data.get("aeronave_id")
        tipo_voo = ser.validated_data.get("tipo_voo")
        horas = ser.validated_data.get("horas")

        # Monta metadados de price freeze se compra for por horas
        metadados = None
        if aeronave_id and horas:
            from apps.aeronaves.models import Aeronave
            try:
                aeronave = Aeronave.objects.get(pk=aeronave_id)
                tarifa = None
                if aeronave.tipo == Aeronave.TIPO_AVIAO:
                    aviao = aeronave.aviao
                    tarifa = float(
                        aviao.tarifa_duplo_comando if tipo_voo == "duplo" else aviao.tarifa_solo
                    )
                elif aeronave.tipo == Aeronave.TIPO_PLANADOR:
                    tarifa = float(aeronave.planador.valor_fixo_inicial)
                metadados = {
                    "aeronave_id": aeronave_id,
                    "aeronave_nome": aeronave.nome,
                    "aeronave_tipo": aeronave.tipo,
                    "tipo_voo": tipo_voo,
                    "tarifa": tarifa,
                    "horas": float(horas),
                }
            except Aeronave.DoesNotExist:
                pass

        hoje = timezone.now().date()

        with transaction.atomic():
            # Credita na carteira com metadados de price freeze
            carteira.creditar(
                valor=valor,
                descricao=descricao,
                data_vencimento=data_vencimento,
                metadados=metadados,
            )

            # Gera título a receber já baixado (não duplicar no frontend)
            titulo = TituloReceber.objects.create(
                participante=carteira.participante,
                tipo=TituloReceber.TIPO_HORAS_PRE_PAGAS,
                descricao=descricao,
                valor_original=valor,
                valor_pago=valor,
                status=TituloReceber.STATUS_BAIXADO,
                data_pagamento=hoje,
                data_vencimento=data_vencimento,
            )

        return Response({
            "carteira": CarteiraSerializer(carteira).data,
            "titulo_receber_id": titulo.id,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="debitar")
    def debitar(self, request, pk=None):
        """
        POST /api/v1/carteiras/{id}/debitar/
        Débito manual (usado quando voo é pago via carteira no frontend).
        Quando a descrição indica remoção manual de saldo, cria TituloPagar baixado.
        """
        carteira = self.get_object()
        valor_raw = request.data.get("valor")
        descricao = request.data.get("descricao", "Débito via carteira")
        is_remocao = request.data.get("remocao_saldo", False)
        if not valor_raw:
            return Response({"detail": "Campo 'valor' é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            valor = Decimal(str(valor_raw))
        except Exception:
            return Response({"detail": "Valor inválido."}, status=status.HTTP_400_BAD_REQUEST)
        if not carteira.tem_saldo_suficiente(valor):
            return Response({"detail": "Saldo insuficiente."}, status=status.HTTP_400_BAD_REQUEST)

        hoje = timezone.now().date()
        with transaction.atomic():
            carteira.debitar(valor=valor, descricao=descricao)

            if is_remocao:
                from apps.financeiro.titulos_pagar.models import TituloPagar
                from apps.pessoas.models import Favorecido, EntidadePagar

                entidade, _ = EntidadePagar.objects.get_or_create(
                    nome="Remoção de Saldo",
                    defaults={"tipo": EntidadePagar.TIPO_FORNECEDOR},
                )
                fav, _ = Favorecido.objects.get_or_create(entidade=entidade)
                TituloPagar.objects.create(
                    tipo=TituloPagar.TIPO_OUTROS,
                    favorecido=fav,
                    descricao=descricao or f"Remoção de saldo – {carteira.participante.nome}",
                    valor=valor,
                    valor_pago=valor,
                    data_emissao=hoje,
                    data_vencimento=hoje,
                    data_pagamento=hoje,
                    status=TituloPagar.STATUS_BAIXADO,
                )

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
