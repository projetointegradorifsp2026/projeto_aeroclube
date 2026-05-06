from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import EntidadePagar, Fornecedor, Funcionario, Favorecido
from .serializers import (
    EntidadePagarSerializer,
    FornecedorSerializer,
    FuncionarioSerializer,
    FavorecidoSerializer,
)


class EntidadePagarViewSet(viewsets.ModelViewSet):
    """GET /api/v1/entidades/ — lista todas as entidades (fornecedores, funcionários, instrutores)."""
    queryset = EntidadePagar.objects.filter(is_active=True).order_by("nome")
    serializer_class = EntidadePagarSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_active = False
        obj.save()
        return Response({"detail": "Entidade desativada."}, status=status.HTTP_200_OK)


class FornecedorViewSet(viewsets.ModelViewSet):
    """GET /api/v1/fornecedores/"""
    queryset = Fornecedor.objects.filter(is_active=True).order_by("nome")
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated]


class FuncionarioViewSet(viewsets.ModelViewSet):
    """GET /api/v1/funcionarios/  (inclui instrutores)"""
    queryset = Funcionario.objects.filter(is_active=True).order_by("nome")
    serializer_class = FuncionarioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        is_instrutor = self.request.query_params.get("instrutor")
        if is_instrutor is not None:
            qs = qs.filter(is_instrutor=is_instrutor.lower() == "true")
        return qs
