from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet, EntidadePagarViewSet, FornecedorViewSet, FuncionarioViewSet

router = DefaultRouter()
router.register("clientes", ClienteViewSet, basename="cliente")
router.register("entidades", EntidadePagarViewSet, basename="entidade")
router.register("fornecedores", FornecedorViewSet, basename="fornecedor")
router.register("funcionarios", FuncionarioViewSet, basename="funcionario")

urlpatterns = [path("", include(router.urls))]
