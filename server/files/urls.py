from rest_framework.routers import DefaultRouter

from .views import (
    FilePermissionViewSet,
    FileShareLinkViewSet,
    FileViewSet,
    FolderViewSet,
)

router = DefaultRouter()
router.register("permissions", FilePermissionViewSet, basename="file-permission")
router.register("links", FileShareLinkViewSet, basename="file-share-link")
router.register("folders", FolderViewSet, basename="folder")
router.register("", FileViewSet, basename="file")

urlpatterns = router.urls
