from django.contrib import admin

from .models import Funcionalidade, PermissaoUsuario


@admin.register(Funcionalidade)
class FuncionalidadeAdmin(admin.ModelAdmin):
    list_display = ["ordem", "chave", "nome", "rota"]
    ordering = ["ordem"]
    search_fields = ["chave", "nome"]


@admin.register(PermissaoUsuario)
class PermissaoUsuarioAdmin(admin.ModelAdmin):
    list_display = ["usuario", "funcionalidade", "permitido"]
    list_filter = ["permitido"]
    search_fields = ["usuario__nome", "usuario__email"]
