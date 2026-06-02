"""
Módulo Pessoas / Entidades.

Representa as entidades que NÃO são usuários do sistema (ou podem ser
complementares), como fornecedores, funcionários e instrutores cadastrados
apenas para fins de vínculo financeiro (títulos a pagar, registro de voos).

Hierarquia:
    EntidadePagar (base)
    ├── Fornecedor
    └── Funcionario  ← Instrutor é um Funcionario com is_instrutor=True
"""
from django.db import models
from apps.users.models import Usuario


class EntidadePagar(models.Model):
    """
    Entidade para vínculo nos títulos a pagar.
    Pode ser fornecedor, funcionário ou instrutor.
    """

    TIPO_FORNECEDOR = "fornecedor"
    TIPO_FUNCIONARIO = "funcionario"
    TIPO_INSTRUTOR = "instrutor"
    TIPO_CLIENTE = "cliente"

    TIPO_CHOICES = [
        (TIPO_FORNECEDOR, "Fornecedor"),
        (TIPO_FUNCIONARIO, "Funcionário"),
        (TIPO_INSTRUTOR, "Instrutor"),
        (TIPO_CLIENTE, "Cliente"),
    ]

    nome = models.CharField("Nome / Razão Social", max_length=200)
    cpf_cnpj = models.CharField("CPF/CNPJ", max_length=18, blank=True, null=True)
    email = models.EmailField("E-mail", blank=True, null=True)
    contato = models.CharField("Contato (telefone)", max_length=20, blank=True, null=True)
    tipo = models.CharField("Tipo", max_length=20, choices=TIPO_CHOICES)
    is_active = models.BooleanField("Ativo", default=True)

    # Vínculo opcional com usuário do sistema
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entidade_pagar",
        verbose_name="Usuário do sistema",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Entidade (a pagar)"
        verbose_name_plural = "Entidades (a pagar)"
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.get_tipo_display()})"


class Fornecedor(EntidadePagar):
    """Fornecedor de produtos ou serviços."""

    produto_servico = models.CharField(
        "Produto / Serviço principal",
        max_length=200,
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = "Fornecedor"
        verbose_name_plural = "Fornecedores"

    def save(self, *args, **kwargs):
        self.tipo = EntidadePagar.TIPO_FORNECEDOR
        super().save(*args, **kwargs)


class Funcionario(EntidadePagar):
    """Funcionário ou instrutor do aeroclube."""

    funcao = models.CharField("Função", max_length=100, blank=True, null=True)
    is_instrutor = models.BooleanField("É instrutor?", default=False)
    salario_base = models.DecimalField(
        "Salário base",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Funcionário / Instrutor"
        verbose_name_plural = "Funcionários / Instrutores"

    def save(self, *args, **kwargs):
        self.tipo = EntidadePagar.TIPO_INSTRUTOR if self.is_instrutor else EntidadePagar.TIPO_FUNCIONARIO
        super().save(*args, **kwargs)

    def __str__(self):
        label = "Instrutor" if self.is_instrutor else "Funcionário"
        return f"{self.nome} ({label})"


class Favorecido(models.Model):
    """
    Favorecido de um título a pagar.
    Aponta para um usuário do sistema OU para uma entidade externa.
    Exatamente um dos dois deve estar preenchido.
    """

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="favorecidos",
        verbose_name="Usuário",
    )
    entidade = models.ForeignKey(
        EntidadePagar,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="favorecidos",
        verbose_name="Entidade",
    )

    class Meta:
        verbose_name = "Favorecido"
        verbose_name_plural = "Favorecidos"

    def __str__(self):
        if self.usuario:
            return f"Usuário: {self.usuario.nome}"
        if self.entidade:
            return f"Entidade: {self.entidade.nome}"
        return "Favorecido sem vínculo"

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.usuario and not self.entidade:
            raise ValidationError("Favorecido deve ter usuário ou entidade vinculada.")
        if self.usuario and self.entidade:
            raise ValidationError("Favorecido deve ter apenas um vínculo (usuário OU entidade).")
