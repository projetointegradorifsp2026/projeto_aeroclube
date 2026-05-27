from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import ContaFixa
from .serializers import ContaFixaSerializer


class ContaFixaViewSet(viewsets.ModelViewSet):
    queryset = ContaFixa.objects.all().order_by("nome")
    serializer_class = ContaFixaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        return qs
