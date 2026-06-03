from django.urls import path
from .views import (
    DashboardResumoView,
    DashboardVencidosPorMesView,
    DashboardEntradasPorGrupoView,
    DashboardHistoricoAnualView,
)

urlpatterns = [
    path('dashboard/resumo/', DashboardResumoView.as_view(), name='dashboard-resumo'),
    path('dashboard/vencidos-por-mes/', DashboardVencidosPorMesView.as_view(), name='dashboard-vencidos-por-mes'),
    path('dashboard/entradas-por-grupo/', DashboardEntradasPorGrupoView.as_view(), name='dashboard-entradas-por-grupo'),
    path('dashboard/historico-anual/', DashboardHistoricoAnualView.as_view(), name='dashboard-historico-anual'),
]
