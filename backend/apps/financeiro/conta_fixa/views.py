from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import ContaFixa
from .serializers import ContaFixaSerializer


class ContaFixaViewSet(viewsets.ModelViewSet):
    queryset = ContaFixa.objects.all().order_by("nome")
    serializer_class = ContaFixaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = ContaFixa.objects.all().order_by("nome")
        is_active_param = self.request.query_params.get("is_active")
        if is_active_param is not None:
            qs = qs.filter(is_active=is_active_param.lower() == "true")
        elif self.action == 'list':
            qs = qs.filter(is_active=True)
        return qs
