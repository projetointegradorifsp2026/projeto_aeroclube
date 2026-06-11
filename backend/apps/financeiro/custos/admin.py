from django.contrib import admin
from .models import Custo


@admin.register(Custo)
class CustoAdmin(admin.ModelAdmin):
    list_display = ["descricao", "favorecido", "tipo", "valor", "data_vencimento", "status"]
    list_filter = ["tipo", "status"]
    search_fields = ["descricao"]
    readonly_fields = ["created_at", "updated_at"]
