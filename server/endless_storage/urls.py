from django.urls import include, path

urlpatterns = [
    path("accounts/", include("accounts.urls")),
    path("files/", include("files.urls")),
    path("drives/", include("drive.urls")),
    path("storage/", include("storage.urls")),
]
