"""
Controle de acesso parametrizável (híbrido) por perfil e por usuário.

- PermissaoPerfil: base por perfil — quais funcionalidades cada perfil acessa.
- PermissaoUsuario: exceção por usuário — libera/bloqueia uma funcionalidade
  para um usuário específico, sobrepondo o default do perfil.

Acesso efetivo de um usuário a uma funcionalidade:
  1. admin/superuser → sempre liberado (regra de negócio);
  2. se houver override do usuário (PermissaoUsuario) → vale o override;
  3. senão → vale o default do perfil ativo (PermissaoPerfil).
"""

from django.db import models

from apps.users.models import Usuario


class Funcionalidade(models.Model):
    """Catálogo de telas/funcionalidades controláveis (ex.: 'voos', 'relatorios')."""

    chave = models.SlugField("Chave", max_length=50, unique=True)
    nome = models.CharField("Nome", max_length=100)
    rota = models.CharField("Rota", max_length=100, blank=True, default="")
    ordem = models.PositiveIntegerField("Ordem", default=0)

    class Meta:
        verbose_name = "Funcionalidade"
        verbose_name_plural = "Funcionalidades"
        ordering = ["ordem", "nome"]

    def __str__(self):
        return self.nome


class PermissaoPerfil(models.Model):
    """Base por perfil: liga um perfil a uma funcionalidade com flag de acesso."""

    perfil = models.CharField("Perfil", max_length=20, choices=Usuario.PERFIL_CHOICES)
    funcionalidade = models.ForeignKey(
        Funcionalidade,
        on_delete=models.CASCADE,
        related_name="permissoes",
    )
    permitido = models.BooleanField("Permitido", default=False)

    class Meta:
        verbose_name = "Permissão de Perfil"
        verbose_name_plural = "Permissões de Perfil"
        unique_together = ("perfil", "funcionalidade")

    def __str__(self):
        return f"{self.perfil} → {self.funcionalidade.chave}: {self.permitido}"


class PermissaoUsuario(models.Model):
    """Exceção por usuário: sobrepõe o default do perfil para uma funcionalidade.

    A existência da linha indica que há override; `permitido` diz se libera (True)
    ou bloqueia (False). Sem linha, o usuário herda o default do perfil.
    """

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="permissoes_funcionalidade",
    )
    funcionalidade = models.ForeignKey(
        Funcionalidade,
        on_delete=models.CASCADE,
        related_name="permissoes_usuario",
    )
    permitido = models.BooleanField("Permitido", default=False)

    class Meta:
        verbose_name = "Permissão de Usuário"
        verbose_name_plural = "Permissões de Usuário"
        unique_together = ("usuario", "funcionalidade")

    def __str__(self):
        return f"{self.usuario_id} → {self.funcionalidade.chave}: {self.permitido}"


# ---------------------------------------------------------------------------
# Resolução de acesso efetivo
# ---------------------------------------------------------------------------

def funcionalidades_do_perfil(perfil):
    """Chaves liberadas para o perfil (base, sem overrides de usuário)."""
    if perfil == Usuario.PERFIL_ADMIN:
        return list(Funcionalidade.objects.values_list("chave", flat=True))
    return list(
        PermissaoPerfil.objects
        .filter(perfil=perfil, permitido=True)
        .values_list("funcionalidade__chave", flat=True)
    )


def funcionalidades_do_usuario(user):
    """Chaves liberadas para o usuário: base do perfil ativo + overrides do usuário."""
    if user.is_superuser or user.perfil_ativo == Usuario.PERFIL_ADMIN:
        return list(Funcionalidade.objects.values_list("chave", flat=True))

    chaves = set(funcionalidades_do_perfil(user.perfil_ativo))
    overrides = (
        PermissaoUsuario.objects
        .filter(usuario=user)
        .values_list("funcionalidade__chave", "permitido")
    )
    for chave, permitido in overrides:
        if permitido:
            chaves.add(chave)
        else:
            chaves.discard(chave)
    return list(chaves)


def usuario_tem_acesso(user, chave):
    """True se o usuário acessa a funcionalidade (admin/override/perfil)."""
    if user.is_superuser or user.perfil_ativo == Usuario.PERFIL_ADMIN:
        return True

    override = (
        PermissaoUsuario.objects
        .filter(usuario=user, funcionalidade__chave=chave)
        .values_list("permitido", flat=True)
        .first()
    )
    if override is not None:
        return override

    return PermissaoPerfil.objects.filter(
        perfil=user.perfil_ativo,
        funcionalidade__chave=chave,
        permitido=True,
    ).exists()
