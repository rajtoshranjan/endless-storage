from django.db import models
from django.db.models import Q

from endless_storage.models import BaseModel


class Folder(BaseModel):
    name = models.CharField(max_length=255)
    drive = models.ForeignKey(
        "drive.Drive", on_delete=models.CASCADE, related_name="folders"
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="subfolders",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "drive"],
                condition=Q(parent__isnull=True),
                name="unique_root_folder_name_drive",
                violation_error_message="A folder with this name already exists at this level.",
            ),
            models.UniqueConstraint(
                fields=["name", "parent"],
                condition=Q(parent__isnull=False),
                name="unique_subfolder_name_parent",
                violation_error_message="A folder with this name already exists in this folder.",
            ),
        ]

    def __str__(self):
        return self.name

    def is_ancestor_of(self, folder):
        """Return True if self is an ancestor of folder (cycle detection)."""
        current = folder
        while current is not None:
            if current.id == self.id:
                return True
            current = current.parent
        return False

    def has_contents(self):
        """Return True if folder has any files or subfolders."""
        return self.files.exists() or self.subfolders.exists()
