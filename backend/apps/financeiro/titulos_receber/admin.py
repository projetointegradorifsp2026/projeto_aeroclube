from django.contrib import admin
from .models import TituloReceber

@admin.register(TituloReceber)
class TituloReceberAdmin(admin.ModelAdmin):
    list_display = ["participante", "descricao", "tipo", "valor_original", "saldo_devedor", "data_vencimento", "status", "esta_atrasado"]
    list_filter = ["tipo", "status"]
    search_fields = ["participante__nome", "descricao"]
    readonly_fields = ["created_at", "updated_at", "valor_pago", "multa"]
