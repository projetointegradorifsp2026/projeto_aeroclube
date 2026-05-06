from django.contrib import admin
from .models import Voo

@admin.register(Voo)
class VooAdmin(admin.ModelAdmin):
    list_display = ["data_voo", "participante", "aeronave", "tipo_voo", "tempo_decimal", "valor_total"]
    list_filter = ["tipo_voo", "data_voo", "aeronave"]
    search_fields = ["participante__nome"]
    readonly_fields = ["duracao_minutos", "tempo_decimal", "valor_tarifa_snapshot", "valor_total", "detalhe_cobranca"]
