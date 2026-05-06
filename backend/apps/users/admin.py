from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, UsuarioPerfil


class UsuarioPerfilInline(admin.TabularInline):
    model = UsuarioPerfil
    extra = 1


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    inlines = [UsuarioPerfilInline]
    list_display = ["nome", "email", "cpf_cnpj", "perfil_ativo", "is_active"]
    list_filter = ["perfil_ativo", "is_active"]
    search_fields = ["nome", "email", "cpf_cnpj"]
    ordering = ["nome"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Dados pessoais", {"fields": ("nome", "cpf_cnpj")}),
        ("Perfis", {"fields": ("perfil_ativo",)}),
        ("Permissões Django", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "nome", "cpf_cnpj", "perfil_ativo", "password1", "password2")}),
    )
