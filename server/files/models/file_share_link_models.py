from django.db import models
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from endless_storage.models import BaseModel

from ..managers import FileShareLinkManager
from .file_models import File


class FileShareLink(BaseModel):
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name="share_links")
    expires_at = models.DateTimeField()
    slug = models.CharField(
        max_length=8,
        unique=True,
        db_index=True,
    )

    def clean(self):
        # Validate that expires_at is not in the past
        if self.expires_at < timezone.now():
            raise ValidationError({"expires_at": "Expiry date cannot be in the past"})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    # Properties.
    @property
    def is_expired(self):
        return self.expires_at < timezone.now()

    # Managers.
    objects = FileShareLinkManager()
