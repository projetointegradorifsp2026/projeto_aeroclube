from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import Cnab240ViewSet

router = DefaultRouter()
router.register("cnab240", Cnab240ViewSet, basename="cnab240")

urlpatterns = [path("", include(router.urls))]
