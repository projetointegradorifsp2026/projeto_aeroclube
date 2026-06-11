from django.contrib import admin
from .models import Aeronave, Aviao, Planador, HistoricoTarifaAeronave

admin.site.register(Aviao)
admin.site.register(Planador)
admin.site.register(HistoricoTarifaAeronave)
