from django.conf import settings
from django.db import models

from secure_share.models import BaseModel

from .constants import StorageProvider


class StorageAccount(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="storage_accounts",
    )
    provider = models.CharField(
        max_length=20,
        choices=StorageProvider.choices(),
    )
    provider_email = models.CharField(max_length=255)
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_expiry = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "provider", "provider_email"],
                name="unique_user_provider_email",
                violation_error_message="This storage account is already connected",
            )
        ]

    def __str__(self):
        return f"{self.provider} - {self.provider_email}"
