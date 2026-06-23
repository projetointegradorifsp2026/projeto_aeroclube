"""
URLs raiz do projeto.
Todas as rotas de API ficam sob /api/v1/.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    # JWT
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Apps
    path("api/v1/", include("apps.users.urls")),
    path("api/v1/", include("apps.pessoas.urls")),
    path("api/v1/", include("apps.aeronaves.urls")),
    path("api/v1/", include("apps.voos.urls")),
    path("api/v1/", include("apps.financeiro.titulos_pagar.urls")),
    path("api/v1/", include("apps.financeiro.titulos_receber.urls")),
    path("api/v1/", include("apps.financeiro.carteira.urls")),
    path("api/v1/", include("apps.financeiro.conta_fixa.urls")),
    path("api/v1/", include("apps.financeiro.receitas.urls")),
    path("api/v1/", include("apps.financeiro.custos.urls")),
    path("api/v1/", include("apps.financeiro.cnab.urls")),
    path("api/v1/", include("apps.relatorios.urls")),
    path("api/v1/", include("apps.permissoes.urls")),
    path("api-auth/", include("rest_framework.urls")),
]
