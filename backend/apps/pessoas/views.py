from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Cliente, EntidadePagar, Fornecedor, Funcionario, Favorecido
from .serializers import (
    ClienteSerializer,
    EntidadePagarSerializer,
    FornecedorSerializer,
    FuncionarioSerializer,
    FavorecidoSerializer,
)


class ClienteViewSet(viewsets.ModelViewSet):
    """GET/POST/PATCH/DELETE /api/v1/clientes/"""
    queryset = Cliente.objects.all().order_by("nome")
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            ativo = self.request.query_params.get("ativo")
            if ativo is None:
                qs = qs.filter(is_active=True)
            elif ativo.lower() == "false":
                qs = qs.filter(is_active=False)
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_active = False
        obj.save()
        return Response({"detail": "Cliente desativado."}, status=status.HTTP_200_OK)


class EntidadePagarViewSet(viewsets.ModelViewSet):
    """GET /api/v1/entidades/?tipo=cliente|fornecedor|funcionario|instrutor"""
    queryset = EntidadePagar.objects.all().order_by("nome")
    serializer_class = EntidadePagarSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = EntidadePagar.objects.all().order_by("nome")
        if self.action == 'list':
            qs = qs.filter(is_active=True)
        tipo = self.request.query_params.get("tipo")
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_active = False
        obj.save()
        return Response({"detail": "Entidade desativada."}, status=status.HTTP_200_OK)


class FornecedorViewSet(viewsets.ModelViewSet):
    """GET /api/v1/fornecedores/"""
    queryset = Fornecedor.objects.all().order_by("nome")
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Fornecedor.objects.all().order_by("nome")
        if self.action == 'list':
            qs = qs.filter(is_active=True)
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_active = False
        obj.save()
        return Response({"detail": "Fornecedor desativado."}, status=status.HTTP_200_OK)


class FuncionarioViewSet(viewsets.ModelViewSet):
    """GET /api/v1/funcionarios/  (inclui instrutores)"""
    queryset = Funcionario.objects.all().order_by("nome")
    serializer_class = FuncionarioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Funcionario.objects.all().order_by("nome")
        if self.action == 'list':
            qs = qs.filter(is_active=True)
        is_instrutor = self.request.query_params.get("instrutor")
        if is_instrutor is not None:
            qs = qs.filter(is_instrutor=is_instrutor.lower() == "true")
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_active = False
        obj.save()
        return Response({"detail": "Funcionário desativado."}, status=status.HTTP_200_OK)
