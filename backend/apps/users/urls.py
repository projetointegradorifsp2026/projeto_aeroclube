from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet, solicitar_reset_senha, confirmar_reset_senha

router = DefaultRouter()
router.register("usuarios", UsuarioViewSet, basename="usuario")

urlpatterns = [
    path("auth/solicitar-reset-senha/", solicitar_reset_senha, name="solicitar-reset-senha"),
    path("auth/confirmar-reset-senha/", confirmar_reset_senha, name="confirmar-reset-senha"),
    path("", include(router.urls)),
]
