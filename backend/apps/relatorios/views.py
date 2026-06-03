"""
Dashboard financeiro — endpoints de leitura para o painel administrativo.

Todos os endpoints são GET e requerem autenticação JWT.
Nenhum destes endpoints altera dados.
"""
import calendar
from datetime import date

from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth, ExtractMonth
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.financeiro.titulos_pagar.models import TituloPagar
from apps.financeiro.titulos_receber.models import TituloReceber

MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

TIPO_RECEBER_LABELS = {
    TituloReceber.TIPO_MENSALIDADE: 'Mensalidade',
    TituloReceber.TIPO_VOO: 'Cobrança de Voo',
    TituloReceber.TIPO_HORAS_PRE_PAGAS: 'Carteira',
    TituloReceber.TIPO_SERVICO: 'Serviço',
    TituloReceber.TIPO_OUTROS: 'Outros',
}

TIPO_PAGAR_LABELS = {
    TituloPagar.TIPO_FORNECEDOR: 'Fornecedor',
    TituloPagar.TIPO_FOLHA: 'Folha de Pagamento',
    TituloPagar.TIPO_CONTA_FIXA: 'Conta Fixa',
    TituloPagar.TIPO_OUTROS: 'Outros',
}

# tipos de TituloReceber excluídos dos indicadores financeiros (são movimentações internas)
_EXCLUIR_RECEBER = [TituloReceber.TIPO_HORAS_PRE_PAGAS]


def _parse_mes(value: str) -> date:
    """'YYYY-MM' → primeiro dia do mês."""
    year, month = map(int, value.split('-'))
    return date(year, month, 1)


def _fim_mes(value: str) -> date:
    """'YYYY-MM' → último dia do mês."""
    year, month = map(int, value.split('-'))
    _, last = calendar.monthrange(year, month)
    return date(year, month, last)


class DashboardResumoView(APIView):
    """
    GET /api/v1/dashboard/resumo/

    Retorna 7 indicadores financeiros para os cards do painel.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = timezone.now().date()
        inicio_mes = hoje.replace(day=1)

        # Títulos a receber em aberto (excluindo carteira)
        qs_receber_aberto = (
            TituloReceber.objects
            .filter(status=TituloReceber.STATUS_ABERTO)
            .exclude(tipo__in=_EXCLUIR_RECEBER)
        )
        # saldo_devedor é property — precisamos iterar
        total_receber = sum(float(t.saldo_devedor) for t in qs_receber_aberto)
        vencidos_receber = sum(
            float(t.saldo_devedor)
            for t in qs_receber_aberto.filter(data_vencimento__lt=hoje)
        )

        # Títulos a pagar em aberto
        agg_pagar = TituloPagar.objects.filter(
            status=TituloPagar.STATUS_ABERTO
        ).aggregate(total=Sum('valor'))
        total_pagar = float(agg_pagar['total'] or 0)

        agg_venc_pagar = TituloPagar.objects.filter(
            status=TituloPagar.STATUS_ABERTO,
            data_vencimento__lt=hoje,
        ).aggregate(total=Sum('valor'))
        vencidos_pagar = float(agg_venc_pagar['total'] or 0)

        # Recebidos no mês corrente
        agg_rec_mes = (
            TituloReceber.objects
            .filter(status=TituloReceber.STATUS_BAIXADO, data_pagamento__gte=inicio_mes)
            .exclude(tipo__in=_EXCLUIR_RECEBER)
            .aggregate(total=Sum('valor_pago'))
        )
        recebidos_mes = float(agg_rec_mes['total'] or 0)

        # Pagos no mês corrente
        agg_pag_mes = TituloPagar.objects.filter(
            status=TituloPagar.STATUS_BAIXADO,
            data_pagamento__gte=inicio_mes,
        ).aggregate(total=Sum('valor_pago'))
        pagos_mes = float(agg_pag_mes['total'] or 0)

        return Response({
            'total_receber': total_receber,
            'total_pagar': total_pagar,
            'vencidos_receber': vencidos_receber,
            'vencidos_pagar': vencidos_pagar,
            'recebidos_mes': recebidos_mes,
            'pagos_mes': pagos_mes,
            'saldo_mes': recebidos_mes - pagos_mes,
        })


class DashboardVencidosPorMesView(APIView):
    """
    GET /api/v1/dashboard/vencidos-por-mes/

    Query params:
        tipo        receber | pagar  (default: receber)
        metrica     quantidade | valor  (default: valor)
        data_inicio YYYY-MM  (default: 12 meses atrás)
        data_fim    YYYY-MM  (default: mês atual)
        categoria   tipo do título (opcional)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = timezone.now().date()
        tipo = request.query_params.get('tipo', 'receber')
        data_inicio_str = request.query_params.get('data_inicio')
        data_fim_str = request.query_params.get('data_fim')
        categoria = request.query_params.get('categoria', '')

        # Período padrão: últimos 12 meses
        if data_inicio_str:
            inicio = _parse_mes(data_inicio_str)
        else:
            m = hoje.month - 11
            y = hoje.year + (m - 1) // 12
            m = ((m - 1) % 12) + 1
            inicio = date(y, m, 1)

        fim = _fim_mes(data_fim_str) if data_fim_str else hoje

        if tipo == 'pagar':
            qs = TituloPagar.objects.filter(
                status=TituloPagar.STATUS_ABERTO,
                data_vencimento__lt=hoje,
                data_vencimento__gte=inicio,
                data_vencimento__lte=fim,
            )
            if categoria:
                qs = qs.filter(tipo=categoria)
            grouped = (
                qs.annotate(mes=TruncMonth('data_vencimento'))
                .values('mes')
                .annotate(quantidade=Count('id'), valor=Sum('valor'))
                .order_by('mes')
            )
        else:
            qs = (
                TituloReceber.objects
                .filter(
                    status=TituloReceber.STATUS_ABERTO,
                    data_vencimento__lt=hoje,
                    data_vencimento__gte=inicio,
                    data_vencimento__lte=fim,
                )
                .exclude(tipo__in=_EXCLUIR_RECEBER)
            )
            if categoria:
                qs = qs.filter(tipo=categoria)
            grouped = (
                qs.annotate(mes=TruncMonth('data_vencimento'))
                .values('mes')
                .annotate(quantidade=Count('id'), valor=Sum('valor_original'))
                .order_by('mes')
            )

        resultado = []
        for item in grouped:
            mes_date = item['mes']
            resultado.append({
                'mes': f"{mes_date.year}-{mes_date.month:02d}",
                'label': f"{MONTH_LABELS[mes_date.month - 1]}/{str(mes_date.year)[2:]}",
                'quantidade': item['quantidade'],
                'valor': float(item['valor'] or 0),
            })

        return Response(resultado)


class DashboardEntradasPorGrupoView(APIView):
    """
    GET /api/v1/dashboard/entradas-por-grupo/

    Query params:
        data_inicio YYYY-MM-DD  (default: primeiro dia do mês atual)
        data_fim    YYYY-MM-DD  (default: hoje)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = timezone.now().date()
        data_inicio = request.query_params.get('data_inicio', str(hoje.replace(day=1)))
        data_fim = request.query_params.get('data_fim', str(hoje))

        grouped = (
            TituloReceber.objects
            .filter(
                status=TituloReceber.STATUS_BAIXADO,
                data_pagamento__gte=data_inicio,
                data_pagamento__lte=data_fim,
            )
            .exclude(tipo__in=_EXCLUIR_RECEBER)
            .values('tipo')
            .annotate(valor=Sum('valor_pago'))
            .order_by('-valor')
        )

        total = sum(float(g['valor'] or 0) for g in grouped)

        resultado = []
        for item in grouped:
            v = float(item['valor'] or 0)
            resultado.append({
                'grupo': TIPO_RECEBER_LABELS.get(item['tipo'], item['tipo']),
                'tipo': item['tipo'],
                'valor': v,
                'percentual': round((v / total * 100) if total > 0 else 0, 1),
            })

        return Response(resultado)


class DashboardHistoricoAnualView(APIView):
    """
    GET /api/v1/dashboard/historico-anual/

    Query params:
        ano          (default: ano atual)
        tipo_pagar   tipos separados por vírgula (ex: fornecedor,conta_fixa)
        tipo_receber tipos separados por vírgula (ex: mensalidade,voo)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = timezone.now().date()
        ano = int(request.query_params.get('ano', hoje.year))
        tipo_pagar_str = request.query_params.get('tipo_pagar', '')
        tipo_receber_str = request.query_params.get('tipo_receber', '')

        meses = [
            {'mes': m, 'label': MONTH_LABELS[m - 1], 'entradas': 0.0, 'saidas': 0.0, 'saldo': 0.0}
            for m in range(1, 13)
        ]

        # Entradas: títulos receber baixados no ano
        qs_receber = (
            TituloReceber.objects
            .filter(status=TituloReceber.STATUS_BAIXADO, data_pagamento__year=ano)
            .exclude(tipo__in=_EXCLUIR_RECEBER)
        )
        if tipo_receber_str:
            tipos = [t.strip() for t in tipo_receber_str.split(',') if t.strip()]
            qs_receber = qs_receber.filter(tipo__in=tipos)

        for row in (
            qs_receber
            .annotate(m=ExtractMonth('data_pagamento'))
            .values('m')
            .annotate(total=Sum('valor_pago'))
        ):
            meses[row['m'] - 1]['entradas'] = float(row['total'] or 0)

        # Saídas: títulos pagar baixados no ano
        qs_pagar = TituloPagar.objects.filter(
            status=TituloPagar.STATUS_BAIXADO,
            data_pagamento__year=ano,
        )
        if tipo_pagar_str:
            tipos = [t.strip() for t in tipo_pagar_str.split(',') if t.strip()]
            qs_pagar = qs_pagar.filter(tipo__in=tipos)

        for row in (
            qs_pagar
            .annotate(m=ExtractMonth('data_pagamento'))
            .values('m')
            .annotate(total=Sum('valor_pago'))
        ):
            meses[row['m'] - 1]['saidas'] = float(row['total'] or 0)

        for m in meses:
            m['saldo'] = round(m['entradas'] - m['saidas'], 2)

        return Response(meses)
