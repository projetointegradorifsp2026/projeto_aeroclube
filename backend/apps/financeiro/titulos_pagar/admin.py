from django.contrib import admin
from .models import TituloPagar

@admin.register(TituloPagar)
class TituloPagarAdmin(admin.ModelAdmin):
    list_display = ["descricao", "favorecido", "tipo", "valor", "data_vencimento", "status", "esta_atrasado"]
    list_filter = ["tipo", "status"]
    search_fields = ["descricao"]
    readonly_fields = ["created_at", "updated_at"]
