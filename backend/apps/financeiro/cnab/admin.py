from django.contrib import admin
from .models import (
    ConfiguracaoBancaria,
    DadosBancarios,
    RemessaCNAB,
    RemessaCNABItem,
    RetornoCNAB,
    RetornoCNABItem,
)


@admin.register(ConfiguracaoBancaria)
class ConfiguracaoBancariaAdmin(admin.ModelAdmin):
    list_display = ["descricao", "nome_beneficiario", "codigo_banco", "prefixo_cooperativa", "conta_corrente", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["descricao", "nome_beneficiario", "cpf_cnpj"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(DadosBancarios)
class DadosBancariosAdmin(admin.ModelAdmin):
    list_display = ["__str__", "banco", "agencia", "conta", "tipo_conta"]
    search_fields = ["titular", "usuario__nome", "entidade__nome"]
    readonly_fields = ["created_at", "updated_at"]


class RemessaCNABItemInline(admin.TabularInline):
    model = RemessaCNABItem
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(RemessaCNAB)
class RemessaCNABAdmin(admin.ModelAdmin):
    list_display = ["numero_sequencial", "data_geracao", "status", "quantidade_titulos", "valor_total"]
    list_filter = ["status"]
    inlines = [RemessaCNABItemInline]
    readonly_fields = ["created_at", "updated_at"]


class RetornoCNABItemInline(admin.TabularInline):
    model = RetornoCNABItem
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(RetornoCNAB)
class RetornoCNABAdmin(admin.ModelAdmin):
    list_display = ["data_retorno", "status"]
    list_filter = ["status"]
    inlines = [RetornoCNABItemInline]
    readonly_fields = ["created_at", "updated_at"]
