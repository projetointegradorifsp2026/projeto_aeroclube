from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db import transaction
from django.http import HttpResponse

from .cnab240 import gerar_arquivo_remessa

from .models import (
    ConfiguracaoBancaria,
    DadosBancarios,
    RemessaCNAB,
    RemessaCNABItem,
    RetornoCNAB,
)
from .serializers import (
    ConfiguracaoBancariaSerializer,
    DadosBancariosSerializer,
    RemessaCNABSerializer,
    RetornoCNABSerializer,
)


class ConfiguracaoBancariaViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/config-bancaria/ — dados do cedente (Sicoob).
    Apenas administradores podem visualizar/editar.
    """
    queryset = ConfiguracaoBancaria.objects.all().order_by("-is_active", "descricao")
    serializer_class = ConfiguracaoBancariaSerializer
    permission_classes = [IsAdminUser]


class DadosBancariosViewSet(viewsets.ModelViewSet):
    """
    CRUD /api/v1/dados-bancarios/
    Filtros: ?usuario=ID  ?entidade=ID
    """
    queryset = DadosBancarios.objects.select_related("usuario", "entidade").all()
    serializer_class = DadosBancariosSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        usuario_id = self.request.query_params.get("usuario")
        if usuario_id:
            qs = qs.filter(usuario_id=usuario_id)
        entidade_id = self.request.query_params.get("entidade")
        if entidade_id:
            qs = qs.filter(entidade_id=entidade_id)
        return qs


class RemessaCNABViewSet(viewsets.ModelViewSet):
    """
    /api/v1/remessas-cnab/
    Geração manual: POST /api/v1/remessas-cnab/gerar/
        body: { "configuracao": <id>, "titulo_ids": [..] }
    Ao gerar, cada TituloReceber selecionado passa para o status "remessa_criada".
    A escrita efetiva do arquivo .REM será feita em etapa futura.
    """
    queryset = RemessaCNAB.objects.select_related("configuracao", "criado_por").prefetch_related("itens")
    serializer_class = RemessaCNABSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="gerar")
    def gerar(self, request):
        from apps.financeiro.titulos_receber.models import TituloReceber

        configuracao_id = request.data.get("configuracao")
        titulo_ids = request.data.get("titulo_ids") or []

        if not configuracao_id:
            return Response({"detail": "Informe a configuração bancária (cedente)."},
                            status=status.HTTP_400_BAD_REQUEST)
        if not titulo_ids:
            return Response({"detail": "Selecione ao menos um título a receber."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            config = ConfiguracaoBancaria.objects.get(pk=configuracao_id)
        except ConfiguracaoBancaria.DoesNotExist:
            return Response({"detail": "Configuração bancária não encontrada."},
                            status=status.HTTP_404_NOT_FOUND)

        # Apenas títulos em aberto podem entrar numa remessa.
        titulos = list(
            TituloReceber.objects.filter(id__in=titulo_ids, status=TituloReceber.STATUS_ABERTO)
        )
        if not titulos:
            return Response(
                {"detail": "Nenhum título em aberto encontrado entre os selecionados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            config = ConfiguracaoBancaria.objects.select_for_update().get(pk=config.pk)
            nsa = config.proximo_nsa

            remessa = RemessaCNAB.objects.create(
                configuracao=config,
                numero_sequencial=nsa,
                status=RemessaCNAB.STATUS_GERADA,
                criado_por=request.user if request.user.is_authenticated else None,
                nome_arquivo=f"COB{nsa:07d}.REM",
            )

            total = Decimal("0.00")
            for titulo in titulos:
                RemessaCNABItem.objects.create(
                    remessa=remessa,
                    titulo_receber=titulo,
                    valor=titulo.saldo_devedor,
                )
                titulo.status = TituloReceber.STATUS_REMESSA_CRIADA
                titulo.save(update_fields=["status", "updated_at"])
                total += titulo.saldo_devedor

            remessa.quantidade_titulos = len(titulos)
            remessa.valor_total = total
            # Gera o conteúdo posicional do arquivo .REM (CNAB240) e armazena.
            remessa.conteudo_arquivo = gerar_arquivo_remessa(remessa)
            remessa.save(update_fields=[
                "quantidade_titulos", "valor_total", "conteudo_arquivo", "updated_at",
            ])

            config.proximo_nsa = nsa + 1
            config.save(update_fields=["proximo_nsa", "updated_at"])

        return Response(RemessaCNABSerializer(remessa).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="arquivo")
    def arquivo(self, request, pk=None):
        """
        GET /api/v1/remessas-cnab/{id}/arquivo/
        Retorna o arquivo de remessa .REM (CNAB240) para download.
        Regenera o conteúdo caso ainda não tenha sido gravado.
        """
        remessa = self.get_object()
        conteudo = remessa.conteudo_arquivo or gerar_arquivo_remessa(remessa)
        if not remessa.conteudo_arquivo:
            remessa.conteudo_arquivo = conteudo
            remessa.save(update_fields=["conteudo_arquivo", "updated_at"])
        nome = remessa.nome_arquivo or f"COB{remessa.numero_sequencial:07d}.REM"
        # ANSI (latin-1) e CRLF, conforme exigência do layout Sicoob.
        resp = HttpResponse(conteudo.encode("latin-1", "ignore"), content_type="text/plain")
        resp["Content-Disposition"] = f'attachment; filename="{nome}"'
        return resp


class RetornoCNABViewSet(viewsets.ModelViewSet):
    """
    /api/v1/retornos-cnab/ — registro de arquivos de retorno (modelagem apenas).
    A leitura/processamento efetivo do .RET será feito em etapa futura.
    """
    queryset = RetornoCNAB.objects.select_related("configuracao", "criado_por").prefetch_related("itens")
    serializer_class = RetornoCNABSerializer
    permission_classes = [IsAuthenticated]
