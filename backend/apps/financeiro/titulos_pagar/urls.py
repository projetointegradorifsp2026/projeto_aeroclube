from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TituloPagarViewSet

router = DefaultRouter()
router.register("titulos-pagar", TituloPagarViewSet, basename="titulo-pagar")

urlpatterns = [path("", include(router.urls))]
