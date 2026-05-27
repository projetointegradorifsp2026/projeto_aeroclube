from django.db import models


class ContaFixa(models.Model):
    nome = models.CharField("Nome", max_length=200)
    descricao = models.TextField("Descrição", blank=True, default="")
    favorecido = models.CharField("Favorecido", max_length=200)
    valor = models.DecimalField("Valor mensal (R$)", max_digits=10, decimal_places=2)
    dia_vencimento = models.PositiveSmallIntegerField("Dia de vencimento")
    is_active = models.BooleanField("Ativa", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Conta Fixa"
        verbose_name_plural = "Contas Fixas"
        ordering = ["nome"]

    def __str__(self):
        return self.nome
