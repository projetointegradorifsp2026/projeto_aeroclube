from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

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
    pagination_class = None

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

    @action(detail=False, methods=["post"], url_path="alterar-minha-senha", permission_classes=[IsAuthenticated])
    def alterar_minha_senha(self, request):
        """POST /api/v1/usuarios/alterar-minha-senha/ — o próprio usuário troca a senha."""
        user = request.user
        senha_atual = request.data.get("senha_atual") or ""
        nova_senha = request.data.get("nova_senha") or ""
        if not senha_atual or not nova_senha:
            return Response(
                {"detail": "Informe a senha atual e a nova senha."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.check_password(senha_atual):
            return Response({"detail": "Senha atual incorreta."}, status=status.HTTP_400_BAD_REQUEST)
        if len(nova_senha) < 6:
            return Response(
                {"detail": "A nova senha deve ter ao menos 6 caracteres."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(nova_senha)
        user.save()
        return Response({"detail": "Senha alterada com sucesso."})

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


@api_view(["POST"])
@permission_classes([AllowAny])
def solicitar_reset_senha(request):
    """
    POST /api/v1/auth/solicitar-reset-senha/  { "email": "..." }
    Envia um e-mail com link de redefinição. Sempre responde 200 (não revela
    se o e-mail existe).
    """
    email = (request.data.get("email") or "").strip().lower()
    user = Usuario.objects.filter(email__iexact=email, is_active=True).first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{settings.FRONTEND_URL}/resetar-senha?uid={uid}&token={token}"
        send_mail(
            subject="Redefinição de senha — Aeroclube",
            message=(
                f"Olá {user.nome},\n\n"
                f"Recebemos uma solicitação para redefinir sua senha. "
                f"Acesse o link abaixo para criar uma nova senha:\n\n{link}\n\n"
                f"Se você não solicitou, ignore este e-mail."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    return Response({"detail": "Se o e-mail estiver cadastrado, enviaremos as instruções de redefinição."})


@api_view(["POST"])
@permission_classes([AllowAny])
def confirmar_reset_senha(request):
    """
    POST /api/v1/auth/confirmar-reset-senha/  { "uid": "...", "token": "...", "nova_senha": "..." }
    Valida o token e define a nova senha.
    """
    uid = request.data.get("uid")
    token = request.data.get("token")
    nova_senha = request.data.get("nova_senha") or ""
    if not uid or not token or not nova_senha:
        return Response({"detail": "Dados incompletos."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = Usuario.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
    except (Usuario.DoesNotExist, ValueError, TypeError, OverflowError):
        return Response({"detail": "Link inválido."}, status=status.HTTP_400_BAD_REQUEST)
    if not default_token_generator.check_token(user, token):
        return Response({"detail": "Link inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)
    if len(nova_senha) < 6:
        return Response(
            {"detail": "A nova senha deve ter ao menos 6 caracteres."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user.set_password(nova_senha)
    user.save()
    return Response({"detail": "Senha redefinida com sucesso."})
