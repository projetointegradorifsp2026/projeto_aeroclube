from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TituloReceberViewSet

router = DefaultRouter()
router.register("titulos-receber", TituloReceberViewSet, basename="titulo-receber")

urlpatterns = [path("", include(router.urls))]
