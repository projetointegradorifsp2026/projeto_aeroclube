from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404

from apps.users.models import Usuario
from .models import Funcionalidade, PermissaoPerfil, PermissaoUsuario
from .serializers import FuncionalidadeSerializer, PermissaoItemSerializer


PERFIS_NAO_ADMIN = [
    (chave, nome) for chave, nome in Usuario.PERFIL_CHOICES
    if chave != Usuario.PERFIL_ADMIN
]


class FuncionalidadeViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/funcionalidades/ — catálogo de telas controláveis."""

    queryset = Funcionalidade.objects.all()
    serializer_class = FuncionalidadeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class PermissoesMatrizView(APIView):
    """Matriz de permissões por perfil. Somente administradores.

    GET   /api/v1/permissoes/  → { perfis, funcionalidades, matriz }
    PATCH /api/v1/permissoes/  → [{ perfil, funcionalidade, permitido }]
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        funcionalidades = list(Funcionalidade.objects.all())
        liberadas = set(
            PermissaoPerfil.objects
            .filter(permitido=True)
            .values_list("perfil", "funcionalidade__chave")
        )
        matriz = [
            {"perfil": perfil, "funcionalidade": f.chave,
             "permitido": (perfil, f.chave) in liberadas}
            for perfil, _ in PERFIS_NAO_ADMIN
            for f in funcionalidades
        ]
        return Response({
            "perfis": [{"chave": c, "nome": n} for c, n in Usuario.PERFIL_CHOICES],
            "perfil_admin": Usuario.PERFIL_ADMIN,
            "funcionalidades": FuncionalidadeSerializer(funcionalidades, many=True).data,
            "matriz": matriz,
        })

    def patch(self, request):
        serializer = PermissaoItemSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        chaves_validas = set(Funcionalidade.objects.values_list("chave", flat=True))
        perfis_validos = {c for c, _ in PERFIS_NAO_ADMIN}

        for item in serializer.validated_data:
            perfil = item["perfil"]
            chave = item["funcionalidade"]
            # admin é bypass; chaves/perfis inválidos são ignorados silenciosamente
            if perfil not in perfis_validos or chave not in chaves_validas:
                continue
            funcionalidade = Funcionalidade.objects.get(chave=chave)
            PermissaoPerfil.objects.update_or_create(
                perfil=perfil,
                funcionalidade=funcionalidade,
                defaults={"permitido": item["permitido"]},
            )
        return self.get(request)


class UsuarioPermissoesView(APIView):
    """Exceções de acesso por usuário (override do perfil). Somente admin.

    GET   /api/v1/permissoes-usuario/<id>/  → estado por funcionalidade
    PATCH /api/v1/permissoes-usuario/<id>/  → [{ funcionalidade, override }]
        override: "herdar" (remove), True (libera), False (bloqueia)
    """

    permission_classes = [IsAdminUser]

    def get(self, request, usuario_id):
        usuario = get_object_or_404(Usuario, pk=usuario_id)
        funcionalidades = list(Funcionalidade.objects.all())
        base = set(
            PermissaoPerfil.objects
            .filter(perfil=usuario.perfil_ativo, permitido=True)
            .values_list("funcionalidade__chave", flat=True)
        )
        overrides = dict(
            PermissaoUsuario.objects
            .filter(usuario=usuario)
            .values_list("funcionalidade__chave", "permitido")
        )
        itens = []
        for f in funcionalidades:
            ov = overrides.get(f.chave)  # None | True | False
            herdado = f.chave in base
            efetivo = ov if ov is not None else herdado
            itens.append({
                "funcionalidade": f.chave,
                "nome": f.nome,
                "rota": f.rota,
                "ordem": f.ordem,
                "herdado_perfil": herdado,
                "override": ov,
                "efetivo": efetivo,
            })
        return Response({
            "usuario": usuario.id,
            "perfil_ativo": usuario.perfil_ativo,
            "itens": itens,
        })

    def patch(self, request, usuario_id):
        usuario = get_object_or_404(Usuario, pk=usuario_id)
        chaves_validas = set(Funcionalidade.objects.values_list("chave", flat=True))

        for item in request.data:
            chave = item.get("funcionalidade")
            override = item.get("override")
            if chave not in chaves_validas:
                continue
            funcionalidade = Funcionalidade.objects.get(chave=chave)
            if override in ("herdar", None):
                PermissaoUsuario.objects.filter(
                    usuario=usuario, funcionalidade=funcionalidade,
                ).delete()
            else:
                PermissaoUsuario.objects.update_or_create(
                    usuario=usuario,
                    funcionalidade=funcionalidade,
                    defaults={"permitido": bool(override)},
                )
        return self.get(request, usuario_id)
