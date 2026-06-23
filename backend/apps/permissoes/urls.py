from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    FuncionalidadeViewSet,
    PermissoesMatrizView,
    UsuarioPermissoesView,
)

router = DefaultRouter()
router.register("funcionalidades", FuncionalidadeViewSet, basename="funcionalidade")

urlpatterns = [
    path("permissoes/", PermissoesMatrizView.as_view(), name="permissoes-matriz"),
    path(
        "permissoes-usuario/<int:usuario_id>/",
        UsuarioPermissoesView.as_view(),
        name="permissoes-usuario",
    ),
    path("", include(router.urls)),
]
