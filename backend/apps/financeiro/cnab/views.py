from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db import transaction
from django.http import HttpResponse

from .cnab240 import gerar_arquivo_remessa
from .cnab_retorno import ler_arquivo_retorno

from .models import (
    ConfiguracaoBancaria,
    DadosBancarios,
    RemessaCNAB,
    RemessaCNABItem,
    RetornoCNAB,
    RetornoCNABItem,
)
from .serializers import (
    ConfiguracaoBancariaSerializer,
    DadosBancariosSerializer,
    RemessaCNABSerializer,
    RetornoCNABSerializer,
)
from apps.pessoas.validators import validar_cpf_cnpj


# Descrições amigáveis das ocorrências de retorno mais comuns (Sicoob/FEBRABAN).
OCORRENCIAS_RETORNO = {
    "02": "Entrada confirmada",
    "03": "Entrada rejeitada",
    "06": "Liquidação",
    "09": "Baixa",
    "10": "Baixa solicitada",
    "17": "Liquidação após baixa",
    "28": "Débito de tarifas/custas",
}


def _validar_sacados(titulos):
    """
    Verifica se cada título tem um pagador com os dados exigidos pelo segmento Q
    da remessa (CPF/CNPJ válido + endereço completo). Retorna uma lista de
    pendências (uma por título com problema) para exibição no frontend.
    """
    from django.core.exceptions import ValidationError as DjangoValidationError

    obrigatorios = [
        ("logradouro", "endereço"),
        ("bairro", "bairro"),
        ("cep", "CEP"),
        ("cidade", "cidade"),
        ("uf", "UF"),
    ]
    pendencias = []
    for titulo in titulos:
        pessoa = titulo.participante or titulo.cliente
        faltando = []
        nome = getattr(pessoa, "nome", None) or "—"
        if pessoa is None:
            faltando.append("pagador (participante ou cliente)")
        else:
            cpf = pessoa.cpf_cnpj or ""
            if not cpf.strip():
                faltando.append("CPF/CNPJ")
            else:
                try:
                    validar_cpf_cnpj(cpf)
                except DjangoValidationError:
                    faltando.append("CPF/CNPJ válido")
            for campo, rotulo in obrigatorios:
                if not (getattr(pessoa, campo, "") or "").strip():
                    faltando.append(rotulo)
        if faltando:
            pendencias.append({
                "titulo_id": titulo.id,
                "descricao": titulo.descricao,
                "pagador": nome,
                "faltando": faltando,
            })
    return pendencias


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
            .select_related("participante", "cliente")
        )
        if not titulos:
            return Response(
                {"detail": "Nenhum título em aberto encontrado entre os selecionados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valida os dados do sacado (segmento Q exige CPF/CNPJ e endereço completo).
        pendencias = _validar_sacados(titulos)
        if pendencias:
            return Response(
                {
                    "detail": "Existem títulos com dados do pagador incompletos para a remessa.",
                    "pendencias": pendencias,
                },
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
            proximo_nn = config.proximo_nosso_numero
            for titulo in titulos:
                # Nosso Número sequencial quando a emissão é a cargo do Beneficiário.
                if config.emissao == ConfiguracaoBancaria.EMISSAO_BENEFICIARIO:
                    nosso_numero = f"{proximo_nn:010d}"
                    proximo_nn += 1
                else:
                    nosso_numero = ""
                RemessaCNABItem.objects.create(
                    remessa=remessa,
                    titulo_receber=titulo,
                    valor=titulo.saldo_devedor,
                    nosso_numero=nosso_numero,
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
            config.proximo_nosso_numero = proximo_nn
            config.save(update_fields=["proximo_nsa", "proximo_nosso_numero", "updated_at"])

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
    /api/v1/retornos-cnab/ — importação e processamento dos arquivos de retorno.
    POST /api/v1/retornos-cnab/processar/
        multipart: configuracao=<id>, arquivo=<.RET>
        ou JSON:   { "configuracao": <id>, "conteudo": "<texto do .RET>" }
    Lê o arquivo, registra cada ocorrência e dá baixa automática nos títulos
    cujo código de ocorrência seja de liquidação (config.codigos_liquidacao).
    """
    queryset = RetornoCNAB.objects.select_related("configuracao", "criado_por").prefetch_related("itens")
    serializer_class = RetornoCNABSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="processar")
    def processar(self, request):
        from apps.financeiro.titulos_receber.models import TituloReceber

        configuracao_id = request.data.get("configuracao")
        if not configuracao_id:
            return Response({"detail": "Informe a configuração bancária (cedente)."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            config = ConfiguracaoBancaria.objects.get(pk=configuracao_id)
        except ConfiguracaoBancaria.DoesNotExist:
            return Response({"detail": "Configuração bancária não encontrada."},
                            status=status.HTTP_404_NOT_FOUND)

        # Conteúdo do arquivo: upload (multipart) ou texto no corpo.
        nome_arquivo = ""
        arquivo = request.FILES.get("arquivo")
        if arquivo is not None:
            conteudo = arquivo.read().decode("latin-1", "ignore")
            nome_arquivo = arquivo.name
        else:
            conteudo = request.data.get("conteudo") or ""
        if not conteudo.strip():
            return Response({"detail": "Envie o arquivo .RET (campo 'arquivo') ou o 'conteudo'."},
                            status=status.HTTP_400_BAD_REQUEST)

        ocorrencias = ler_arquivo_retorno(conteudo)
        if not ocorrencias:
            return Response({"detail": "Nenhuma ocorrência reconhecida no arquivo de retorno."},
                            status=status.HTTP_400_BAD_REQUEST)

        codigos_liquidacao = config.codigos_liquidacao_set()
        usuario = request.user if request.user.is_authenticated else None
        resumo = {"itens": 0, "baixados": 0, "sem_titulo": 0, "ignorados": 0}

        with transaction.atomic():
            retorno = RetornoCNAB.objects.create(
                configuracao=config,
                status=RetornoCNAB.STATUS_IMPORTADO,
                conteudo_arquivo=conteudo,
                nome_arquivo=nome_arquivo,
                criado_por=usuario,
            )

            for ocr in ocorrencias:
                resumo["itens"] += 1
                titulo = self._casar_titulo(ocr)
                codigo = ocr["codigo_ocorrencia"]
                RetornoCNABItem.objects.create(
                    retorno=retorno,
                    titulo_receber=titulo,
                    nosso_numero=ocr["nosso_numero"],
                    codigo_ocorrencia=codigo,
                    descricao_ocorrencia=OCORRENCIAS_RETORNO.get(codigo, "Ocorrência"),
                    valor_pago=ocr["valor_pago"],
                    data_pagamento=ocr["data_pagamento"],
                )

                if titulo is None:
                    resumo["sem_titulo"] += 1
                    continue
                if codigo not in codigos_liquidacao:
                    resumo["ignorados"] += 1
                    continue
                # Idempotência: não baixa de novo um título já quitado.
                if titulo.status == TituloReceber.STATUS_BAIXADO:
                    resumo["ignorados"] += 1
                    continue

                valor = ocr["valor_pago"] or titulo.saldo_devedor
                titulo.aplicar_baixa_parcial(
                    valor=valor,
                    data=ocr["data_pagamento"],
                    forma_pagamento="cnab",
                    criado_por=usuario,
                )
                resumo["baixados"] += 1

            retorno.status = RetornoCNAB.STATUS_PROCESSADO
            retorno.save(update_fields=["status", "updated_at"])

        data = RetornoCNABSerializer(retorno).data
        data["resumo"] = resumo
        return Response(data, status=status.HTTP_201_CREATED)

    @staticmethod
    def _casar_titulo(ocr):
        """Casa a ocorrência ao TituloReceber: por nosso_numero (via item de
        remessa) e, na falta, pelo nº do documento que enviamos (id do título)."""
        from apps.financeiro.titulos_receber.models import TituloReceber

        # O "Nosso Número" começa pelo NumTítulo (10 dígitos), que é o valor que
        # gravamos no RemessaCNABItem. Casa por igualdade exata desse bloco.
        nosso_digitos = "".join(filter(str.isdigit, ocr.get("nosso_numero") or ""))
        if nosso_digitos:
            numtitulo = nosso_digitos[:10].zfill(10)
            item = (
                RemessaCNABItem.objects
                .filter(nosso_numero=numtitulo)
                .select_related("titulo_receber")
                .order_by("-id")
                .first()
            )
            if item:
                return item.titulo_receber
        seu = "".join(filter(str.isdigit, ocr.get("seu_numero") or ""))
        if seu:
            return TituloReceber.objects.filter(pk=int(seu)).first()
        return None
