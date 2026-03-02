from uuid import uuid4

from django.db import models


class BaseModel(models.Model):
    """
    Base model class providing common fields for all models.
    """

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
