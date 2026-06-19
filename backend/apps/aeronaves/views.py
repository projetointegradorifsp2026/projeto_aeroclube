from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Aeronave, Aviao, Planador, HistoricoTarifaAeronave
from .serializers import AeronaveSerializer, AviaoSerializer, PlanadorSerializer, HistoricoTarifaSerializer


class AeronaveViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/aeronaves/ — lista todas as aeronaves (visão resumida, apenas ativas)."""
    queryset = Aeronave.objects.filter(is_active=True, is_deleted=False).order_by("nome")
    serializer_class = AeronaveSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


def _snapshot_aviao(aviao):
    return {
        "tarifa_solo": str(aviao.tarifa_solo),
        "tarifa_duplo_comando": str(aviao.tarifa_duplo_comando),
    }


def _snapshot_planador(planador):
    return {
        "minutos_franquia": planador.minutos_franquia,
        "valor_fixo_inicial": str(planador.valor_fixo_inicial),
        "valor_minuto_adicional": str(planador.valor_minuto_adicional),
        "valor_fixo_duplo": str(planador.valor_fixo_duplo) if planador.valor_fixo_duplo is not None else None,
        "valor_minuto_duplo": str(planador.valor_minuto_duplo) if planador.valor_minuto_duplo is not None else None,
    }


class AviaoViewSet(viewsets.ModelViewSet):
    """CRUD /api/v1/avioes/  ?all=true inclui inativos (mas nunca excluídos)"""
    serializer_class = AviaoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Aviao.objects.filter(is_deleted=False).order_by("nome")
        if self.action == 'list' and self.request.query_params.get("all") != "true":
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        HistoricoTarifaAeronave.objects.create(
            aeronave=obj,
            descricao_alteracao="Cadastro inicial",
            valores_anteriores={},
            valores_vigentes=_snapshot_aviao(obj),
            alterado_por=self.request.user if self.request.user.is_authenticated else None,
        )

    def perform_update(self, serializer):
        instancia = self.get_object()
        anteriores = _snapshot_aviao(instancia)
        obj = serializer.save()
        vigentes = _snapshot_aviao(obj)
        alteracoes = [
            f"{k}: {anteriores[k]} → {vigentes[k]}"
            for k in vigentes if anteriores.get(k) != vigentes[k]
        ]
        HistoricoTarifaAeronave.objects.create(
            aeronave=obj,
            descricao_alteracao=", ".join(alteracoes) if alteracoes else "Atualização sem mudança de tarifa",
            valores_anteriores=anteriores,
            valores_vigentes=vigentes,
            alterado_por=self.request.user if self.request.user.is_authenticated else None,
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_deleted = True
        obj.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlanadorViewSet(viewsets.ModelViewSet):
    """CRUD /api/v1/planadores/  ?all=true inclui inativos (mas nunca excluídos)"""
    serializer_class = PlanadorSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Planador.objects.filter(is_deleted=False).order_by("nome")
        if self.action == 'list' and self.request.query_params.get("all") != "true":
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        HistoricoTarifaAeronave.objects.create(
            aeronave=obj,
            descricao_alteracao="Cadastro inicial",
            valores_anteriores={},
            valores_vigentes=_snapshot_planador(obj),
            alterado_por=self.request.user if self.request.user.is_authenticated else None,
        )

    def perform_update(self, serializer):
        instancia = self.get_object()
        anteriores = _snapshot_planador(instancia)
        obj = serializer.save()
        vigentes = _snapshot_planador(obj)
        alteracoes = [
            f"{k}: {anteriores.get(k)} → {vigentes.get(k)}"
            for k in vigentes if anteriores.get(k) != vigentes.get(k)
        ]
        HistoricoTarifaAeronave.objects.create(
            aeronave=obj,
            descricao_alteracao=", ".join(alteracoes) if alteracoes else "Atualização sem mudança de tarifa",
            valores_anteriores=anteriores,
            valores_vigentes=vigentes,
            alterado_por=self.request.user if self.request.user.is_authenticated else None,
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_deleted = True
        obj.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="simular-cobranca")
    def simular_cobranca(self, request, pk=None):
        """GET /api/v1/planadores/{id}/simular-cobranca/?minutos=47"""
        planador = self.get_object()
        minutos = request.query_params.get("minutos")
        if not minutos or not minutos.isdigit():
            return Response({"detail": "Parâmetro 'minutos' é obrigatório e deve ser inteiro."}, status=400)
        minutos = int(minutos)
        valor = planador.calcular_valor_voo(minutos)
        excedente = max(0, minutos - planador.minutos_franquia)
        return Response({
            "aeronave": planador.nome,
            "duracao_minutos": minutos,
            "franquia_minutos": planador.minutos_franquia,
            "excedente_minutos": excedente,
            "valor_fixo_inicial": str(planador.valor_fixo_inicial),
            "valor_minuto_adicional": str(planador.valor_minuto_adicional),
            "valor_total": str(valor),
        })


class HistoricoTarifaViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/historico-tarifas/?aeronave=ID"""
    serializer_class = HistoricoTarifaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = HistoricoTarifaAeronave.objects.select_related("aeronave", "alterado_por").order_by("-alterado_em")
        aeronave_id = self.request.query_params.get("aeronave")
        if aeronave_id:
            qs = qs.filter(aeronave_id=aeronave_id)
        return qs
