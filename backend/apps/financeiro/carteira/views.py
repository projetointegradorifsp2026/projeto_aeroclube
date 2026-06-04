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
from django.utils import timezone


class CarteiraViewSet(mixins.CreateModelMixin,
                      mixins.ListModelMixin,
                      mixins.RetrieveModelMixin,
                      viewsets.GenericViewSet):
    """
    GET  /api/v1/carteiras/               — lista carteiras
    GET  /api/v1/carteiras/{id}/          — detalhe com extrato
    POST /api/v1/carteiras/               — get-or-create por participante
    POST /api/v1/carteiras/{id}/creditar/ — cria Receita pendente (saldo só altera no baixa)
    POST /api/v1/carteiras/{id}/debitar/  — débito manual ou remoção de saldo (cria Custo pendente)
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
        Cria uma Receita pendente de tipo horas_pre_pagas.
        O saldo da carteira SÓ é alterado quando o TituloReceber vinculado for baixado.
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

        # Monta metadados de price freeze
        metadados = {}
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

        with transaction.atomic():
            from apps.financeiro.receitas.models import Receita
            receita = Receita.objects.create(
                participante=carteira.participante,
                tipo=Receita.TIPO_HORAS_PRE_PAGAS,
                descricao=descricao,
                valor=valor,
                data_vencimento=data_vencimento,
                status=Receita.STATUS_PENDENTE,
                metadados=metadados,
            )

        return Response({
            "receita_id": receita.id,
            "detail": "Receita pendente criada. Fature e baixe o título para creditar o saldo.",
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="debitar")
    def debitar(self, request, pk=None):
        """
        POST /api/v1/carteiras/{id}/debitar/
        Débito de voo (imediato) ou remoção manual de saldo (cria Custo pendente).
        Remoção manual: saldo SÓ é alterado quando o TituloPagar vinculado for baixado.
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

        hoje = timezone.now().date()

        if is_remocao:
            # Remoção de saldo: só cria Custo pendente; saldo altera ao baixar o título
            with transaction.atomic():
                from apps.financeiro.custos.models import Custo
                from apps.pessoas.models import Favorecido

                fav, _ = Favorecido.objects.get_or_create(usuario=carteira.participante)
                custo = Custo.objects.create(
                    tipo=Custo.TIPO_REMOCAO_SALDO,
                    favorecido=fav,
                    descricao=descricao or f"Remoção de saldo – {carteira.participante.nome}",
                    valor=valor,
                    data_emissao=hoje,
                    data_vencimento=hoje,
                    status=Custo.STATUS_PENDENTE,
                    metadados={"participante_id": carteira.participante_id},
                )
            return Response({
                "custo_id": custo.id,
                "detail": "Custo pendente criado. Fature e baixe o título para debitar o saldo.",
            }, status=status.HTTP_201_CREATED)
        else:
            # Débito imediato (uso em voo já registrado, correção de saldo, etc.)
            if not carteira.tem_saldo_suficiente(valor):
                return Response({"detail": "Saldo insuficiente."}, status=status.HTTP_400_BAD_REQUEST)
            with transaction.atomic():
                carteira.debitar(valor=valor, descricao=descricao)
            return Response(CarteiraSerializer(carteira).data)


class MovimentacaoCarteiraViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/movimentacoes-carteira/?participante=ID"""
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
