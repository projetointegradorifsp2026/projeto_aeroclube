"""
Controle de acesso para "admins secundários".

Regras:
- superusuário (admin principal) → acesso total, não controlável;
- usuário com perfil ativo `admin` (não superusuário) → vê as TELAS_COMUNS mais
  as telas administrativas liberadas individualmente via PermissaoUsuario (checkbox);
- demais perfis (não-admin) → acesso FIXO pelas regras de negócio (TELAS_FIXAS_PERFIL).

Enforcement usa o fecho de DEPENDENCIAS: liberar uma tela libera o acesso às
telas de que ela depende (ex.: Voos consome Aeronaves/Usuários/Receitas/Custos).
"""

from django.db import models

from apps.users.models import Usuario


class Funcionalidade(models.Model):
    """Catálogo de telas/funcionalidades."""

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


class PermissaoUsuario(models.Model):
    """Tela administrativa liberada para um admin secundário (checkbox)."""

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
    permitido = models.BooleanField("Permitido", default=True)

    class Meta:
        verbose_name = "Permissão de Usuário"
        verbose_name_plural = "Permissões de Usuário"
        unique_together = ("usuario", "funcionalidade")

    def __str__(self):
        return f"{self.usuario_id} → {self.funcionalidade.chave}"


# ---------------------------------------------------------------------------
# Regras fixas (negócio) — não parametrizáveis
# ---------------------------------------------------------------------------

# Sempre liberadas a qualquer usuário autenticado.
TELAS_COMUNS = ["dashboard", "movimentacoes"]

# Telas administrativas que podem ser liberadas a um admin secundário (checkbox).
TELAS_CONTROLAVEIS = [
    "usuarios", "receitas", "custos", "voos", "titulos-a-receber",
    "titulos-a-pagar", "aeronaves", "clientes", "fornecedores",
    "conta-fixa", "remessas-cnab", "config-bancaria", "relatorios",
]

# Acesso fixo dos perfis não-admin (espelha as regras atuais do frontend).
TELAS_FIXAS_PERFIL = {
    Usuario.PERFIL_ALUNO: ["dashboard", "movimentacoes", "voos", "titulos-a-receber"],
    Usuario.PERFIL_SOCIO: ["dashboard", "movimentacoes", "voos", "titulos-a-receber"],
    Usuario.PERFIL_EXTERNO: ["dashboard", "movimentacoes", "voos", "titulos-a-receber"],
    Usuario.PERFIL_INSTRUTOR: ["dashboard", "movimentacoes", "voos", "titulos-a-pagar"],
    Usuario.PERFIL_FUNCIONARIO: ["dashboard", "movimentacoes", "titulos-a-pagar"],
}

# Liberar a tela-chave libera o acesso (API) às telas de que ela depende.
DEPENDENCIAS = {
    "dashboard": ["usuarios", "voos", "titulos-a-receber", "titulos-a-pagar"],
    "movimentacoes": ["titulos-a-receber", "titulos-a-pagar"],
    "voos": ["aeronaves", "usuarios", "receitas", "custos"],
    "titulos-a-receber": ["usuarios"],
    "titulos-a-pagar": ["usuarios"],
    "usuarios": ["aeronaves", "titulos-a-receber", "titulos-a-pagar"],
    "remessas-cnab": ["titulos-a-receber"],
    "receitas": ["usuarios"],
    "custos": ["usuarios", "fornecedores"],
}


# ---------------------------------------------------------------------------
# Resolução de acesso
# ---------------------------------------------------------------------------

def _todas_chaves():
    return list(Funcionalidade.objects.values_list("chave", flat=True))


def telas_menu(user):
    """Telas que aparecem no menu / dirigem o frontend (sem dependências)."""
    if user.is_superuser:
        return _todas_chaves()
    if user.perfil_ativo == Usuario.PERFIL_ADMIN:
        liberadas = (
            PermissaoUsuario.objects
            .filter(usuario=user, permitido=True)
            .values_list("funcionalidade__chave", flat=True)
        )
        return list(dict.fromkeys(TELAS_COMUNS + list(liberadas)))
    return list(TELAS_FIXAS_PERFIL.get(user.perfil_ativo, TELAS_COMUNS))


def _fecho(chaves):
    """Fecho transitivo das dependências."""
    resultado = set(chaves)
    pilha = list(chaves)
    while pilha:
        atual = pilha.pop()
        for dep in DEPENDENCIAS.get(atual, ()):
            if dep not in resultado:
                resultado.add(dep)
                pilha.append(dep)
    return resultado


def telas_acesso(user):
    """Telas acessíveis para enforcement (menu + fecho de dependências)."""
    if user.is_superuser:
        return set(_todas_chaves())
    return _fecho(telas_menu(user))


def usuario_tem_acesso(user, chave):
    if user.is_superuser:
        return True
    return chave in telas_acesso(user)
