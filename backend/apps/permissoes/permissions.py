"""Permission class de enforcement por funcionalidade.

Uma view declara `funcionalidade_chave = "<chave>"` e inclui esta classe em
`permission_classes`. O acesso é liberado para admin/superuser sempre; para os
demais perfis exige uma linha PermissaoPerfil com permitido=True.
"""

from rest_framework.permissions import BasePermission

from .models import usuario_tem_acesso


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
