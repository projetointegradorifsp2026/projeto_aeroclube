from django.contrib import admin
from .models import Carteira, MovimentacaoCarteira


class MovimentacaoInline(admin.TabularInline):
    model = MovimentacaoCarteira
    extra = 0
    readonly_fields = ["data_transacao"]


@admin.register(Carteira)
class CarteiraAdmin(admin.ModelAdmin):
    list_display = ["participante", "saldo", "updated_at"]
    search_fields = ["participante__nome"]
    readonly_fields = ["saldo", "updated_at"]
    inlines = [MovimentacaoInline]


@admin.register(MovimentacaoCarteira)
class MovimentacaoCarteiraAdmin(admin.ModelAdmin):
    list_display = ["carteira", "tipo", "valor", "descricao", "data_transacao", "data_vencimento"]
    list_filter = ["tipo"]
    readonly_fields = ["data_transacao"]
