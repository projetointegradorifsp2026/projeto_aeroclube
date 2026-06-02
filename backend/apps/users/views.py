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
    GET /api/v1/usuarios/me/       — retorna o usuário autenticado
    """

    queryset = Usuario.objects.prefetch_related("perfis").order_by("nome")

    def get_queryset(self):
        qs = super().get_queryset()
        perfil = self.request.query_params.get("perfil")
        if perfil:
            qs = qs.filter(perfis__perfil=perfil)
        return qs.distinct()

    def get_serializer_class(self):
        return UsuarioSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Cria usuário e retorna o serializer completo (com id)."""
        write_ser = UsuarioCreateSerializer(data=request.data)
        write_ser.is_valid(raise_exception=True)
        usuario = write_ser.save()
        return Response(UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """Soft delete: apenas desativa o usuário."""
        usuario = self.get_object()
        usuario.is_active = False
        usuario.save()
        return Response({"detail": "Usuário desativado."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="me", permission_classes=[IsAuthenticated])
    def me(self, request):
        """GET /api/v1/usuarios/me/ — retorna o usuário autenticado."""
        return Response(UsuarioSerializer(request.user).data)

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

    @action(detail=True, methods=["post"], url_path="resetar-senha", permission_classes=[IsAdminUser])
    def resetar_senha(self, request, pk=None):
        """POST /api/v1/usuarios/{id}/resetar-senha/ — reseta a senha para aero + 5 primeiros dígitos do CPF."""
        usuario = self.get_object()
        cpf = usuario.cpf_cnpj or ""
        digits = "".join(filter(str.isdigit, cpf))
        if len(digits) < 5:
            return Response(
                {"detail": "Usuário não possui CPF com ao menos 5 dígitos para resetar a senha."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        nova_senha = f"aero{digits[:5]}"
        usuario.set_password(nova_senha)
        usuario.save()
        return Response({"detail": "Senha resetada com sucesso."}, status=status.HTTP_200_OK)

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

    @action(detail=True, methods=["post"], url_path="remover-perfil")
    def remover_perfil(self, request, pk=None):
        """POST /api/v1/usuarios/{id}/remover-perfil/ — remove um perfil do usuário."""
        usuario = self.get_object()
        perfil = request.data.get("perfil")
        if not perfil:
            return Response({"detail": "Campo 'perfil' é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = UsuarioPerfil.objects.filter(usuario=usuario, perfil=perfil).delete()
        if not deleted:
            return Response({"detail": "Usuário não possui este perfil."}, status=status.HTTP_400_BAD_REQUEST)
        # Se o perfil removido era o ativo, troca para o primeiro restante
        if usuario.perfil_ativo == perfil:
            primeiro = usuario.perfis.first()
            if primeiro:
                usuario.perfil_ativo = primeiro.perfil
                usuario.save()
        return Response({"detail": "Perfil removido."}, status=status.HTTP_200_OK)
