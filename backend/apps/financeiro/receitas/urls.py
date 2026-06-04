from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReceitaViewSet

router = DefaultRouter()
router.register("receitas", ReceitaViewSet, basename="receita")

urlpatterns = [path("", include(router.urls))]
