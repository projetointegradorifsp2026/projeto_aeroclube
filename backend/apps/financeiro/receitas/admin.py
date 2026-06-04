from django.contrib import admin
from .models import Receita


@admin.register(Receita)
class ReceitaAdmin(admin.ModelAdmin):
    list_display = ["participante", "cliente", "descricao", "tipo", "valor", "data_vencimento", "status"]
    list_filter = ["tipo", "status"]
    search_fields = ["participante__nome", "cliente__nome", "descricao"]
    readonly_fields = ["created_at", "updated_at"]
