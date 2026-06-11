from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConfiguracaoBancariaViewSet,
    DadosBancariosViewSet,
    RemessaCNABViewSet,
    RetornoCNABViewSet,
)

router = DefaultRouter()
router.register("config-bancaria", ConfiguracaoBancariaViewSet, basename="config-bancaria")
router.register("dados-bancarios", DadosBancariosViewSet, basename="dados-bancarios")
router.register("remessas-cnab", RemessaCNABViewSet, basename="remessa-cnab")
router.register("retornos-cnab", RetornoCNABViewSet, basename="retorno-cnab")

urlpatterns = [path("", include(router.urls))]
