from django.contrib import admin
from .models import RemessaCnab240


@admin.register(RemessaCnab240)
class RemessaCnab240Admin(admin.ModelAdmin):
    list_display = [
        "numero_sequencial", "data_geracao", "status",
        "nome_arquivo", "qtd_titulos", "valor_total",
        "qtd_liquidados", "qtd_rejeitados",
    ]
    list_filter = ["status"]
    readonly_fields = [
        "numero_sequencial", "data_geracao", "qtd_titulos",
        "valor_total", "data_retorno", "qtd_liquidados",
        "qtd_rejeitados", "log_retorno",
    ]
    filter_horizontal = ["titulos"]
