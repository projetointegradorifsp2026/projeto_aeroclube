from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.users.models import Usuario
from .models import Funcionalidade, PermissaoUsuario, TELAS_CONTROLAVEIS
from .permissions import IsSuperUser
from .serializers import FuncionalidadeSerializer, PermissaoUsuarioItemSerializer


class FuncionalidadeViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/funcionalidades/ — catálogo de telas controláveis."""

    queryset = Funcionalidade.objects.all()
    serializer_class = FuncionalidadeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class UsuarioPermissoesView(APIView):
    """Telas administrativas liberadas para um admin secundário (checkbox).

    Só faz sentido para usuários com perfil ativo `admin` que não são
    superusuários. Somente superusuários acessam (a gestão de telas
    liberadas é exclusiva do superusuário).

    GET   /api/v1/permissoes-usuario/<id>/  → { usuario, perfil_ativo, itens }
        itens: [{ funcionalidade, nome, permitido }] para as TELAS_CONTROLAVEIS
    PATCH /api/v1/permissoes-usuario/<id>/  → [{ funcionalidade, permitido }]
        permitido True  → libera a tela (update_or_create)
        permitido False → remove a liberação (delete)
    """

    permission_classes = [IsSuperUser]

    def _itens(self, usuario):
        funcionalidades = {
            f.chave: f
            for f in Funcionalidade.objects.filter(chave__in=TELAS_CONTROLAVEIS)
        }
        liberadas = set(
            PermissaoUsuario.objects
            .filter(usuario=usuario, permitido=True)
            .values_list("funcionalidade__chave", flat=True)
        )
        itens = []
        for chave in TELAS_CONTROLAVEIS:
            f = funcionalidades.get(chave)
            if f is None:
                continue
            itens.append({
                "funcionalidade": f.chave,
                "nome": f.nome,
                "permitido": f.chave in liberadas,
            })
        return itens

    def get(self, request, usuario_id):
        usuario = get_object_or_404(Usuario, pk=usuario_id)
        return Response({
            "usuario": usuario.id,
            "perfil_ativo": usuario.perfil_ativo,
            "itens": self._itens(usuario),
        })

    def patch(self, request, usuario_id):
        usuario = get_object_or_404(Usuario, pk=usuario_id)
        serializer = PermissaoUsuarioItemSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        funcionalidades = {
            f.chave: f
            for f in Funcionalidade.objects.filter(chave__in=TELAS_CONTROLAVEIS)
        }
        for item in serializer.validated_data:
            f = funcionalidades.get(item["funcionalidade"])
            if f is None:  # fora das telas controláveis → ignora
                continue
            if item["permitido"]:
                PermissaoUsuario.objects.update_or_create(
                    usuario=usuario,
                    funcionalidade=f,
                    defaults={"permitido": True},
                )
            else:
                PermissaoUsuario.objects.filter(
                    usuario=usuario, funcionalidade=f,
                ).delete()
        return self.get(request, usuario_id)
