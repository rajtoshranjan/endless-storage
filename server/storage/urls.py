from rest_framework.routers import DefaultRouter

from .views import StorageAccountViewSet

router = DefaultRouter()
router.register(r"", StorageAccountViewSet, basename="storage-account")

urlpatterns = router.urls
