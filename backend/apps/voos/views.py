from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import Voo, calcular_tempo_decimal
from .serializers import VooSerializer, SimulacaoTempoDecimalSerializer


class VooViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/voos/

    Para PLANADOR com instrutor: gera automaticamente Custo pendente de repasse
    (o TituloPagar era criado antes; agora é pendente, sem gerar título).

    Para participante e instrutor AVIÃO: a Receita e o Custo são criados pelo frontend
    (que conhece o valor correto após abatimento de carteira).
    """
    queryset = Voo.objects.select_related("participante", "instrutor", "aeronave").order_by("-data_voo")
    serializer_class = VooSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            voo = serializer.save()
            self._gerar_custo_instrutor_planador(voo)
        return Response(VooSerializer(voo).data, status=status.HTTP_201_CREATED)

    def _gerar_custo_instrutor_planador(self, voo: Voo):
        """
        Cria Custo (pendente) de repasse para instrutores de PLANADOR.
        Para aviões, o frontend cria o Custo diretamente.
        """
        if not (voo.instrutor and voo.valor_repasse_instrutor > Decimal("0.00")):
            return

        from apps.aeronaves.models import Aeronave
        if voo.aeronave.tipo != Aeronave.TIPO_PLANADOR:
            return

        from apps.financeiro.custos.models import Custo
        from apps.pessoas.models import Favorecido

        fav, _ = Favorecido.objects.get_or_create(usuario=voo.instrutor)
        descricao = f"Repasse instrução planador – {voo.data_voo} – {voo.aeronave.nome}"

        Custo.objects.create(
            tipo=Custo.TIPO_FOLHA,
            favorecido=fav,
            voo=voo,
            descricao=descricao,
            num_parcela=1,
            total_parcelas=1,
            valor=voo.valor_repasse_instrutor,
            data_emissao=voo.data_voo,
            data_vencimento=voo.data_voo,
            status=Custo.STATUS_PENDENTE,
        )

    def destroy(self, request, *args, **kwargs):
        """
        Exclui o voo aplicando cascata segura:
        - BLOQUEIA se já houver título a receber gerado, ou receita/custo
          faturado/quitado (financeiro já cobrado/pago) — exige estorno manual antes.
        - Caso contrário, apaga receitas/custos PENDENTES vinculados e estorna
          os débitos de carteira do voo antes de remover o registro.
        """
        voo = self.get_object()
        from apps.financeiro.receitas.models import Receita
        from apps.financeiro.custos.models import Custo
        from apps.financeiro.titulos_receber.models import TituloReceber

        receitas = voo.receitas.all()
        custos = voo.custos.all()

        bloqueios = []
        if TituloReceber.objects.filter(voo=voo).exists() or \
                receitas.filter(status__in=[Receita.STATUS_FATURADA, Receita.STATUS_QUITADA]).exists():
            bloqueios.append("título a receber já gerado/cobrado")
        if custos.filter(status__in=[Custo.STATUS_FATURADO, Custo.STATUS_QUITADO]).exists():
            bloqueios.append("custo (repasse) já faturado/pago")

        if bloqueios:
            return Response(
                {"detail": "Não é possível excluir o voo: " + "; ".join(bloqueios) +
                           ". Estorne/cancele o financeiro vinculado antes."},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            self._estornar_carteira_do_voo(voo)
            receitas.delete()
            custos.delete()
            voo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _estornar_carteira_do_voo(self, voo):
        """Devolve à carteira os débitos do voo e restaura o saldo dos lotes consumidos."""
        from apps.financeiro.carteira.models import MovimentacaoCarteira

        movs = MovimentacaoCarteira.objects.filter(
            voo=voo, tipo=MovimentacaoCarteira.TIPO_DEBITO
        )
        for mov in movs:
            carteira = mov.carteira
            carteira.saldo += mov.valor
            carteira.save(update_fields=["saldo"])
            for item in (mov.metadados or {}).get("breakdown", []):
                lote_id = item.get("lote_id")
                if not lote_id:
                    continue
                lote = MovimentacaoCarteira.objects.filter(pk=lote_id).first()
                if lote and lote.saldo_restante is not None:
                    lote.saldo_restante += Decimal(str(item.get("valor_debitado", "0")))
                    lote.save(update_fields=["saldo_restante"])
            mov.delete()

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
    """GET /api/v1/voos/simular-decimal/?minutos=47"""
    minutos = request.query_params.get("minutos")
    if not minutos or not minutos.isdigit():
        return Response({"detail": "Parâmetro 'minutos' é obrigatório e deve ser inteiro."}, status=400)
    resultado = {"minutos": int(minutos), "tempo_decimal": str(calcular_tempo_decimal(int(minutos)))}
    return Response(resultado)
