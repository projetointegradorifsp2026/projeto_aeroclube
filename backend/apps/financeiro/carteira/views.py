from decimal import Decimal, ROUND_HALF_UP
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone

from .models import Carteira, MovimentacaoCarteira
from .serializers import (
    CarteiraSerializer,
    CarteiraResumoSerializer,
    MovimentacaoCarteiraSerializer,
    CreditarCarteiraSerializer,
)


def _tarifa_atual_aeronave(aeronave, tipo_voo, duracao_minutos):
    """Retorna a tarifa atual da aeronave para o tipo de voo dado."""
    from apps.aeronaves.models import Aeronave
    if aeronave.tipo == Aeronave.TIPO_AVIAO:
        aviao = aeronave.aviao
        return aviao.tarifa_duplo_comando if tipo_voo == "duplo" else aviao.tarifa_solo
    else:
        duplo = tipo_voo == "duplo"
        return aeronave.planador.calcular_valor_voo(duracao_minutos, duplo=duplo)


def _tarifa_historica_aeronave(aeronave, data_referencia, tipo_voo, duracao_minutos):
    """
    Retorna a tarifa da aeronave vigente em data_referencia, consultando o histórico.
    Se não houver histórico, retorna a tarifa atual.
    """
    from apps.aeronaves.models import Aeronave, HistoricoTarifaAeronave

    historico = (
        HistoricoTarifaAeronave.objects
        .filter(aeronave=aeronave, alterado_em__lte=data_referencia)
        .order_by("-alterado_em")
        .first()
    )

    if not historico:
        return _tarifa_atual_aeronave(aeronave, tipo_voo, duracao_minutos)

    v = historico.valores_vigentes
    if aeronave.tipo == Aeronave.TIPO_AVIAO:
        if tipo_voo == "duplo":
            return Decimal(str(v.get("tarifa_duplo_comando", 0)))
        return Decimal(str(v.get("tarifa_solo", 0)))
    else:
        # Planador: recalcula com valores históricos
        minutos_franquia = int(v.get("minutos_franquia", 45))
        if tipo_voo == "duplo" and v.get("valor_fixo_duplo") is not None:
            valor_fixo = Decimal(str(v["valor_fixo_duplo"]))
            valor_minuto = Decimal(str(v["valor_minuto_duplo"])) if v.get("valor_minuto_duplo") else Decimal(str(v["valor_minuto_adicional"]))
        else:
            valor_fixo = Decimal(str(v.get("valor_fixo_inicial", 0)))
            valor_minuto = Decimal(str(v.get("valor_minuto_adicional", 0)))

        if duracao_minutos <= minutos_franquia:
            return valor_fixo
        excedente = duracao_minutos - minutos_franquia
        return valor_fixo + (Decimal(excedente) * valor_minuto)


def _calcular_debito_com_price_freeze(carteira, aeronave, tipo_voo, duracao_minutos, data_voo, max_debit=None):
    """
    Calcula o débito de um voo aplicando price freeze.

    Parâmetros:
        max_debit (Decimal|None): limita o total a debitar (útil para pagamento parcial).

    Retorna:
        total_debitado (Decimal)
        breakdown (list): detalhamento por lote consumido
        saldo_insuficiente (bool)
    """
    from apps.aeronaves.models import Aeronave

    tarifa_atual = _tarifa_atual_aeronave(aeronave, tipo_voo, duracao_minutos)
    eh_aviao = aeronave.tipo == Aeronave.TIPO_AVIAO

    lotes = list(
        carteira.movimentacoes.filter(
            tipo=MovimentacaoCarteira.TIPO_CREDITO,
            saldo_restante__gt=Decimal("0.00"),
        ).order_by("data_transacao")
    )

    def tarifa_efetiva(lote):
        if lote.data_vencimento and lote.data_vencimento < data_voo:
            # Lote expirado: usa tarifa atual
            return tarifa_atual
        tarifa_congelada = _tarifa_historica_aeronave(
            aeronave, lote.data_transacao, tipo_voo, duracao_minutos
        )
        return min(tarifa_congelada, tarifa_atual)

    # Calcula tarifa efetiva de cada lote e ordena: menor tarifa → vence mais cedo → FIFO
    lotes_com_tarifa = []
    for lote in lotes:
        t = tarifa_efetiva(lote)
        expirado = bool(lote.data_vencimento and lote.data_vencimento < data_voo)
        lotes_com_tarifa.append((t, lote.data_vencimento or timezone.datetime.max.date(), lote, expirado))

    lotes_com_tarifa.sort(key=lambda x: (x[0], x[1]))

    breakdown = []
    total_debitado = Decimal("0.00")

    if eh_aviao:
        horas = Decimal(str(duracao_minutos)) / Decimal("60")
        horas_restantes = horas

        for (t_efetiva, _, lote, expirado) in lotes_com_tarifa:
            if horas_restantes <= 0:
                break
            custo_total_lote = (horas_restantes * t_efetiva).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            valor_do_lote = min(lote.saldo_restante, custo_total_lote)

            if max_debit is not None:
                disponivel = max_debit - total_debitado
                if disponivel <= 0:
                    break
                valor_do_lote = min(valor_do_lote, disponivel)

            horas_consumidas = (valor_do_lote / t_efetiva).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP) if t_efetiva > 0 else Decimal("0")

            lote.saldo_restante -= valor_do_lote
            lote.save(update_fields=["saldo_restante"])
            total_debitado += valor_do_lote
            horas_restantes -= horas_consumidas

            breakdown.append({
                "lote_id": lote.id,
                "valor_debitado": str(valor_do_lote),
                "tarifa_aplicada": str(t_efetiva),
                "horas_consumidas": str(horas_consumidas.quantize(Decimal("0.01"))),
                "tipo_tarifa": "atual" if expirado else "congelada",
                "data_vencimento": str(lote.data_vencimento) if lote.data_vencimento else None,
                "expirado": expirado,
            })

        saldo_insuficiente = horas_restantes > Decimal("0.001")
    else:
        # Planador: custo fixo — consome em R$ direto
        custo_base = tarifa_atual
        restante = custo_base

        for (t_efetiva, _, lote, expirado) in lotes_com_tarifa:
            if restante <= 0:
                break
            valor_do_lote = min(lote.saldo_restante, restante)

            if max_debit is not None:
                disponivel = max_debit - total_debitado
                if disponivel <= 0:
                    break
                valor_do_lote = min(valor_do_lote, disponivel)

            lote.saldo_restante -= valor_do_lote
            lote.save(update_fields=["saldo_restante"])
            total_debitado += valor_do_lote
            restante -= valor_do_lote

            breakdown.append({
                "lote_id": lote.id,
                "valor_debitado": str(valor_do_lote),
                "tarifa_aplicada": str(t_efetiva),
                "tipo_tarifa": "atual" if expirado else "congelada",
                "data_vencimento": str(lote.data_vencimento) if lote.data_vencimento else None,
                "expirado": expirado,
            })

        saldo_insuficiente = restante > Decimal("0.01")

    return total_debitado, breakdown, saldo_insuficiente


class CarteiraViewSet(mixins.CreateModelMixin,
                      mixins.ListModelMixin,
                      mixins.RetrieveModelMixin,
                      viewsets.GenericViewSet):
    """
    GET  /api/v1/carteiras/                         — lista carteiras
    GET  /api/v1/carteiras/{id}/                    — detalhe com extrato
    POST /api/v1/carteiras/                         — get-or-create por participante
    POST /api/v1/carteiras/{id}/creditar/           — cria Receita pendente
    POST /api/v1/carteiras/{id}/debitar/            — débito manual ou remoção de saldo
    POST /api/v1/carteiras/{id}/debitar-voo/        — débito de voo com price freeze
    POST /api/v1/carteiras/{id}/calcular-custo-voo/ — preview do custo (sem debitar)
    """
    queryset = Carteira.objects.select_related("participante").order_by("participante__nome")
    permission_classes = [IsAuthenticated]
    pagination_class = None

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

        metadados = {}
        if aeronave_id:
            from apps.aeronaves.models import Aeronave
            try:
                aeronave = Aeronave.objects.get(pk=aeronave_id)
                metadados = {
                    "aeronave_id": aeronave_id,
                    "aeronave_nome": aeronave.nome,
                    "aeronave_tipo": aeronave.tipo,
                    "tipo_voo": tipo_voo,
                    "horas": float(horas) if horas else None,
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
        Débito manual imediato ou remoção de saldo (cria Custo pendente).
        Para débitos de voo com price freeze, use /debitar-voo/.
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

        if valor <= 0:
            return Response({"detail": "O valor deve ser maior que zero."}, status=status.HTTP_400_BAD_REQUEST)

        hoje = timezone.now().date()

        if is_remocao:
            # Não permite remover mais do que o saldo disponível na carteira.
            if valor > carteira.saldo:
                return Response(
                    {"detail": f"Saldo insuficiente. Disponível: R$ {carteira.saldo}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
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
            if not carteira.tem_saldo_suficiente(valor):
                return Response({"detail": "Saldo insuficiente."}, status=status.HTTP_400_BAD_REQUEST)
            with transaction.atomic():
                carteira.debitar(valor=valor, descricao=descricao)
            return Response(CarteiraSerializer(carteira).data)

    @action(detail=True, methods=["post"], url_path="calcular-custo-voo")
    def calcular_custo_voo(self, request, pk=None):
        """
        POST /api/v1/carteiras/{id}/calcular-custo-voo/
        Preview do custo de um voo com price freeze, sem efetuar nenhum débito.

        Body: mesmos campos de debitar-voo (sem descricao e max_debit).
        Resposta: { total_calculado, saldo_insuficiente }
        """
        carteira = self.get_object()

        aeronave_id = request.data.get("aeronave_id")
        tipo_voo = request.data.get("tipo_voo", "solo")
        duracao_minutos_raw = request.data.get("duracao_minutos")
        data_voo_raw = request.data.get("data_voo")

        if not aeronave_id or not duracao_minutos_raw or not data_voo_raw:
            return Response(
                {"detail": "Campos obrigatórios: aeronave_id, duracao_minutos, data_voo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            duracao_minutos = int(duracao_minutos_raw)
        except (ValueError, TypeError):
            return Response({"detail": "duracao_minutos deve ser um inteiro."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if isinstance(data_voo_raw, str):
                from datetime import datetime
                data_voo = datetime.strptime(data_voo_raw, "%Y-%m-%d").date()
            else:
                data_voo = data_voo_raw
        except ValueError:
            return Response({"detail": "data_voo deve estar no formato YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.aeronaves.models import Aeronave
        try:
            aeronave = Aeronave.objects.get(pk=aeronave_id)
        except Aeronave.DoesNotExist:
            return Response({"detail": "Aeronave não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            total, _, saldo_insuficiente = _calcular_debito_com_price_freeze(
                carteira, aeronave, tipo_voo, duracao_minutos, data_voo
            )
            transaction.set_rollback(True)

        return Response({
            "total_calculado": str(total),
            "saldo_insuficiente": saldo_insuficiente,
        })

    @action(detail=True, methods=["post"], url_path="debitar-voo")
    def debitar_voo(self, request, pk=None):
        """
        POST /api/v1/carteiras/{id}/debitar-voo/
        Débito de voo com price freeze.

        Body:
            aeronave_id    (int)   — aeronave do voo
            tipo_voo       (str)   — "solo" ou "duplo"
            duracao_minutos (int)  — duração do voo em minutos
            data_voo       (str)   — data do voo (YYYY-MM-DD)
            descricao      (str)   — descrição opcional
        """
        carteira = self.get_object()

        aeronave_id = request.data.get("aeronave_id")
        tipo_voo = request.data.get("tipo_voo", "solo")
        duracao_minutos_raw = request.data.get("duracao_minutos")
        data_voo_raw = request.data.get("data_voo")
        descricao = request.data.get("descricao", "Débito de voo")
        max_debit_raw = request.data.get("max_debit")
        voo_id = request.data.get("voo_id")

        if not aeronave_id or not duracao_minutos_raw or not data_voo_raw:
            return Response(
                {"detail": "Campos obrigatórios: aeronave_id, duracao_minutos, data_voo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            duracao_minutos = int(duracao_minutos_raw)
        except (ValueError, TypeError):
            return Response({"detail": "duracao_minutos deve ser um inteiro."}, status=status.HTTP_400_BAD_REQUEST)

        max_debit = None
        if max_debit_raw is not None:
            try:
                max_debit = Decimal(str(max_debit_raw))
            except Exception:
                return Response({"detail": "max_debit deve ser um número decimal."}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import date as date_type
        try:
            if isinstance(data_voo_raw, str):
                from datetime import datetime
                data_voo = datetime.strptime(data_voo_raw, "%Y-%m-%d").date()
            else:
                data_voo = data_voo_raw
        except ValueError:
            return Response({"detail": "data_voo deve estar no formato YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.aeronaves.models import Aeronave
        try:
            aeronave = Aeronave.objects.get(pk=aeronave_id)
        except Aeronave.DoesNotExist:
            return Response({"detail": "Aeronave não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            total_debitado, breakdown, saldo_insuficiente = _calcular_debito_com_price_freeze(
                carteira, aeronave, tipo_voo, duracao_minutos, data_voo, max_debit=max_debit
            )

            if total_debitado > 0:
                carteira.saldo -= total_debitado
                carteira.save(update_fields=["saldo"])
                MovimentacaoCarteira.objects.create(
                    carteira=carteira,
                    tipo=MovimentacaoCarteira.TIPO_DEBITO,
                    valor=total_debitado,
                    descricao=descricao,
                    voo_id=voo_id or None,
                    metadados={
                        "aeronave_id": aeronave_id,
                        "aeronave_nome": aeronave.nome,
                        "tipo_voo": tipo_voo,
                        "duracao_minutos": duracao_minutos,
                        "breakdown": breakdown,
                    },
                )

        return Response({
            "total_debitado": str(total_debitado),
            "saldo_atual": str(carteira.saldo),
            "saldo_insuficiente": saldo_insuficiente,
            "breakdown": breakdown,
        })


class MovimentacaoCarteiraViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/movimentacoes-carteira/?participante=ID"""
    queryset = MovimentacaoCarteira.objects.select_related("carteira__participante").order_by("-data_transacao")
    serializer_class = MovimentacaoCarteiraSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        carteira_id = self.request.query_params.get("carteira")
        if carteira_id:
            qs = qs.filter(carteira_id=carteira_id)
        participante_id = self.request.query_params.get("participante")
        if participante_id:
            qs = qs.filter(carteira__participante_id=participante_id)
        return qs
