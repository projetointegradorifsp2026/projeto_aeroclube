"""
Modelo de usuário customizado do Aeroclube.

Usa AbstractBaseUser para ter controle total sobre os campos,
mantendo compatibilidade com o sistema de autenticação do Django.

Um usuário pode ter múltiplos perfis (roles). O perfil ativo
é controlado pelo campo `perfil_ativo`.
"""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UsuarioManager(BaseUserManager):
    def create_user(self, email, nome, password=None, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório")

        email = self.normalize_email(email)
        user = self.model(email=email, nome=nome, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nome, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser precisa ter is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser precisa ter is_superuser=True.")

        return self.create_user(email, nome, password, **extra_fields)


class Usuario(AbstractUser):
    """
    Usuário customizado baseado em AbstractUser (compatível com admin).
    Login é feito por e-mail em vez de username.
    """
    # REMOVE username padrão
    username = None

    # Manager customizado
    objects = UsuarioManager()

    PERFIL_ALUNO = "aluno"
    PERFIL_SOCIO = "socio"
    PERFIL_INSTRUTOR = "instrutor"
    PERFIL_EXTERNO = "externo"
    PERFIL_ADMIN = "admin"
    PERFIL_FUNCIONARIO = "funcionario"

    PERFIL_CHOICES = [
        (PERFIL_ALUNO, "Aluno"),
        (PERFIL_SOCIO, "Sócio"),
        (PERFIL_INSTRUTOR, "Instrutor"),
        (PERFIL_EXTERNO, "Aluno Externo"),
        (PERFIL_ADMIN, "Administrador"),
        (PERFIL_FUNCIONARIO, "Funcionário"),
    ]

    # Campos personalizados
    nome = models.CharField("Nome completo", max_length=200)
    cpf_cnpj = models.CharField("CPF/CNPJ", max_length=18, unique=True, blank=True, null=True)

    email = models.EmailField("E-mail", unique=True)

    # Endereço — obrigatório para o sacado na remessa CNAB (segmento Q)
    cep = models.CharField("CEP", max_length=9, blank=True, default="")
    logradouro = models.CharField("Logradouro", max_length=100, blank=True, default="")
    numero = models.CharField("Número", max_length=10, blank=True, default="")
    bairro = models.CharField("Bairro", max_length=50, blank=True, default="")
    cidade = models.CharField("Cidade", max_length=60, blank=True, default="")
    uf = models.CharField("UF", max_length=2, blank=True, default="")

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