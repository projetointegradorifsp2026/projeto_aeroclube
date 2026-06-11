from rest_framework.routers import DefaultRouter
from .views import ContaFixaViewSet

router = DefaultRouter()
router.register("contas-fixas", ContaFixaViewSet, basename="conta-fixa")

urlpatterns = router.urls
