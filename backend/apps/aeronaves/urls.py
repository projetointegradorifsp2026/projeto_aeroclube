from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AeronaveViewSet, AviaoViewSet, PlanadorViewSet, HistoricoTarifaViewSet

router = DefaultRouter()
router.register("aeronaves", AeronaveViewSet, basename="aeronave")
router.register("avioes", AviaoViewSet, basename="aviao")
router.register("planadores", PlanadorViewSet, basename="planador")
router.register("historico-tarifas", HistoricoTarifaViewSet, basename="historico-tarifa")

urlpatterns = [path("", include(router.urls))]
