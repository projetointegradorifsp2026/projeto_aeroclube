from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustoViewSet

router = DefaultRouter()
router.register("custos", CustoViewSet, basename="custo")

urlpatterns = [path("", include(router.urls))]
