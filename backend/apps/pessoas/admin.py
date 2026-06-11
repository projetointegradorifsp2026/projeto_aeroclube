from django.contrib import admin
from .models import EntidadePagar, Fornecedor, Funcionario, Favorecido, Cliente

admin.site.register(EntidadePagar)
admin.site.register(Fornecedor)
admin.site.register(Funcionario)
admin.site.register(Favorecido)
admin.site.register(Cliente)
