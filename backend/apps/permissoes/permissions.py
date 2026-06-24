"""Permission class de enforcement por funcionalidade.

Uma view declara `funcionalidade_chave = "<chave>"` e inclui esta classe em
`permission_classes`. O acesso depende de `usuario_tem_acesso`: superusuário
sempre; admin secundário conforme telas liberadas (mais o fecho de
dependências); demais perfis conforme TELAS_FIXAS_PERFIL.
"""

from rest_framework.permissions import BasePermission

from .models import usuario_tem_acesso


class IsSuperUser(BasePermission):
    """Acesso restrito a superusuários (gestão das telas liberadas)."""

    message = "Apenas superusuários podem acessar este recurso."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and user.is_superuser)


class TemAcessoFuncionalidade(BasePermission):
    message = "Seu perfil não tem acesso a esta funcionalidade."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            return False

        chave = getattr(view, "funcionalidade_chave", None)
        if not chave:
            return True

        return usuario_tem_acesso(user, chave)
