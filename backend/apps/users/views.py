from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models import Usuario, UsuarioPerfil
from .serializers import UsuarioSerializer, UsuarioCreateSerializer, UsuarioPerfilSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD de usuários. Somente administradores podem criar/editar usuários.
    GET /api/v1/usuarios/          — lista todos
    POST /api/v1/usuarios/         — cria usuário (admin)
    GET /api/v1/usuarios/{id}/     — detalhe
    PATCH /api/v1/usuarios/{id}/   — edita parcialmente
    DELETE /api/v1/usuarios/{id}/  — desativa (soft delete)
    """

    queryset = Usuario.objects.prefetch_related("perfis").order_by("nome")

    def get_queryset(self):
        qs = super().get_queryset()
        perfil = self.request.query_params.get("perfil")
        if perfil:
            qs = qs.filter(perfis__perfil=perfil)
        return qs.distinct()

    def get_serializer_class(self):
        if self.action == "create":
            return UsuarioCreateSerializer
        return UsuarioSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        """Soft delete: apenas desativa o usuário."""
        usuario = self.get_object()
        usuario.is_active = False
        usuario.save()
        return Response({"detail": "Usuário desativado."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["patch"], url_path="perfil-ativo")
    def alterar_perfil_ativo(self, request, pk=None):
        """PATCH /api/v1/usuarios/{id}/perfil-ativo/ — altera o perfil ativo."""
        usuario = self.get_object()
        perfil = request.data.get("perfil_ativo")
        perfis_validos = [p.perfil for p in usuario.perfis.all()]
        if perfil not in perfis_validos:
            return Response(
                {"detail": f"Perfil inválido. Perfis disponíveis: {perfis_validos}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        usuario.perfil_ativo = perfil
        usuario.save()
        return Response(UsuarioSerializer(usuario).data)

    @action(detail=True, methods=["post"], url_path="adicionar-perfil")
    def adicionar_perfil(self, request, pk=None):
        """POST /api/v1/usuarios/{id}/adicionar-perfil/ — adiciona um perfil ao usuário."""
        usuario = self.get_object()
        perfil = request.data.get("perfil")
        if not perfil:
            return Response({"detail": "Campo 'perfil' é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)
        obj, created = UsuarioPerfil.objects.get_or_create(usuario=usuario, perfil=perfil)
        if not created:
            return Response({"detail": "Usuário já possui este perfil."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(UsuarioPerfilSerializer(obj).data, status=status.HTTP_201_CREATED)
