from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VooViewSet, simular_tempo_decimal

router = DefaultRouter()
router.register("voos", VooViewSet, basename="voo")

urlpatterns = [
    path("", include(router.urls)),
    path("voos/simular-decimal/", simular_tempo_decimal, name="simular-decimal"),
]
