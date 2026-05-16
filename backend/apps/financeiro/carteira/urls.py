from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CarteiraViewSet, MovimentacaoCarteiraViewSet

router = DefaultRouter()
router.register("carteiras", CarteiraViewSet, basename="carteira")
router.register("movimentacoes-carteira", MovimentacaoCarteiraViewSet, basename="movimentacao-carteira")

urlpatterns = [path("", include(router.urls))]
