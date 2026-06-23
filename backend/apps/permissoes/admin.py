from django.contrib import admin

from .models import Funcionalidade, PermissaoPerfil, PermissaoUsuario


@admin.register(Funcionalidade)
class FuncionalidadeAdmin(admin.ModelAdmin):
    list_display = ["ordem", "chave", "nome", "rota"]
    ordering = ["ordem"]
    search_fields = ["chave", "nome"]


@admin.register(PermissaoPerfil)
class PermissaoPerfilAdmin(admin.ModelAdmin):
    list_display = ["perfil", "funcionalidade", "permitido"]
    list_filter = ["perfil", "permitido"]


@admin.register(PermissaoUsuario)
class PermissaoUsuarioAdmin(admin.ModelAdmin):
    list_display = ["usuario", "funcionalidade", "permitido"]
    list_filter = ["permitido"]
    search_fields = ["usuario__nome", "usuario__email"]
