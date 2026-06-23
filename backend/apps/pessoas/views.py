from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.permissoes.permissions import TemAcessoFuncionalidade
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
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated, TemAcessoFuncionalidade]
    funcionalidade_chave = "clientes"
    pagination_class = None

    def get_queryset(self):
        qs = Cliente.objects.filter(is_deleted=False).order_by("nome")
        if self.action == "list":
            ativo = self.request.query_params.get("ativo")
            if ativo is None:
                qs = qs.filter(is_active=True)
            elif ativo.lower() == "false":
                qs = qs.filter(is_active=False)
            # ativo=all: retorna ativos e inativos (nunca excluídos)
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_deleted = True
        obj.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EntidadePagarViewSet(viewsets.ModelViewSet):
    """GET /api/v1/entidades/?tipo=cliente|fornecedor|funcionario|instrutor"""
    serializer_class = EntidadePagarSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = EntidadePagar.objects.filter(is_deleted=False).order_by("nome")
        if self.action == 'list':
            qs = qs.filter(is_active=True)
        tipo = self.request.query_params.get("tipo")
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_deleted = True
        obj.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FornecedorViewSet(viewsets.ModelViewSet):
    """GET /api/v1/fornecedores/"""
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated, TemAcessoFuncionalidade]
    funcionalidade_chave = "fornecedores"
    pagination_class = None

    def get_queryset(self):
        qs = Fornecedor.objects.filter(is_deleted=False).order_by("nome")
        if self.action == 'list':
            qs = qs.filter(is_active=True)
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_deleted = True
        obj.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FuncionarioViewSet(viewsets.ModelViewSet):
    """GET /api/v1/funcionarios/  (inclui instrutores)"""
    serializer_class = FuncionarioSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Funcionario.objects.filter(is_deleted=False).order_by("nome")
        if self.action == 'list':
            qs = qs.filter(is_active=True)
        is_instrutor = self.request.query_params.get("instrutor")
        if is_instrutor is not None:
            qs = qs.filter(is_instrutor=is_instrutor.lower() == "true")
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_deleted = True
        obj.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
