from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from apps.permissoes.permissions import TemAcessoFuncionalidade
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
    funcionalidade_chave = "usuarios"
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
        # Self-service: qualquer usuário autenticado age sobre si mesmo.
        if self.action in ["me", "alterar_perfil_ativo", "alterar_minha_senha"]:
            return [IsAuthenticated()]
        # Ações de gestão restritas a administradores.
        if self.action in [
            "create", "destroy", "resetar_senha",
            "adicionar_perfil", "remover_perfil",
        ]:
            return [IsAdminUser()]
        # list/retrieve/update/partial_update: exige acesso à tela "usuarios".
        return [IsAuthenticated(), TemAcessoFuncionalidade()]

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
        texto = (
            f"Olá {user.nome},\n\n"
            f"Recebemos uma solicitação para redefinir sua senha.\n"
            f"Acesse o link abaixo para criar uma nova senha:\n\n{link}\n\n"
            f"O link expira em 24 horas.\n\n"
            f"Se você não solicitou essa redefinição, ignore este e-mail.\n\n"
            f"— Equipe Aeroclube"
        )
        html = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                <tr>
                  <td style="background:#1a3a5c;padding:32px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">✈ AEROCLUBE - RIO CLARO</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:40px 40px 24px;">
                    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Olá, <strong>{user.nome}</strong></p>
                    <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
                      Recebemos uma solicitação para redefinir a senha da sua conta no Aeroclube.
                      Clique no botão abaixo para criar uma nova senha:
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                      <tr>
                        <td style="background:#1a3a5c;border-radius:6px;">
                          <a href="{link}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
                            Redefinir minha senha
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 8px;font-size:13px;color:#888888;">
                      Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
                    </p>
                    <p style="margin:0 0 24px;font-size:12px;color:#aaaaaa;word-break:break-all;">{link}</p>
                    <p style="margin:0;font-size:13px;color:#aaaaaa;">
                      O link expira em <strong>24 horas</strong>. Se você não solicitou a redefinição, ignore este e-mail.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background:#f4f6f8;padding:20px;text-align:center;border-top:1px solid #e8eaed;">
                    <p style="margin:0;font-size:12px;color:#aaaaaa;">© 2026 Aeroclube — Sistema de Gestão</p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """
        msg = EmailMultiAlternatives(
            subject="Redefinição de senha — Aeroclube",
            body=texto,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=False)
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
