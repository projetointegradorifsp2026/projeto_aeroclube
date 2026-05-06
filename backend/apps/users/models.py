"""
Modelo de usuário customizado do Aeroclube.

Usa AbstractBaseUser para ter controle total sobre os campos,
mantendo compatibilidade com o sistema de autenticação do Django.

Um usuário pode ter múltiplos perfis (roles). O perfil ativo
é controlado pelo campo `perfil_ativo`.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """
    Usuário customizado baseado em AbstractUser (compatível com admin).
    Login é feito por e-mail em vez de username.
    """

    # REMOVE username padrão
    username = None

    PERFIL_ALUNO = "aluno"
    PERFIL_SOCIO = "socio"
    PERFIL_INSTRUTOR = "instrutor"
    PERFIL_EXTERNO = "externo"
    PERFIL_ADMIN = "admin"

    PERFIL_CHOICES = [
        (PERFIL_ALUNO, "Aluno"),
        (PERFIL_SOCIO, "Sócio"),
        (PERFIL_INSTRUTOR, "Instrutor"),
        (PERFIL_EXTERNO, "Cliente Externo"),
        (PERFIL_ADMIN, "Administrador"),
    ]

    # Campos personalizados
    nome = models.CharField("Nome completo", max_length=200)
    cpf_cnpj = models.CharField("CPF/CNPJ", max_length=18, unique=True, blank=True, null=True)

    email = models.EmailField("E-mail", unique=True)

    perfil_ativo = models.CharField(
        "Perfil ativo",
        max_length=20,
        choices=PERFIL_CHOICES,
        default=PERFIL_ALUNO,
    )

    updated_at = models.DateTimeField("Última atualização", auto_now=True)

    # Configuração de login
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nome"]

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.get_perfil_ativo_display()})"


class UsuarioPerfil(models.Model):
    """
    Tabela intermediária: um usuário pode ter múltiplos perfis.
    O administrador cadastra quais perfis um usuário possui.
    """

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="perfis",
    )
    perfil = models.CharField(
        "Perfil",
        max_length=20,
        choices=Usuario.PERFIL_CHOICES,
    )

    class Meta:
        verbose_name = "Perfil do Usuário"
        verbose_name_plural = "Perfis do Usuário"
        unique_together = ("usuario", "perfil")

    def __str__(self):
        return f"{self.usuario.nome} — {self.get_perfil_display()}"
