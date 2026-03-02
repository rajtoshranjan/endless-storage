# import base user
from django.contrib.auth.models import AbstractBaseUser
from django.db import models

from endless_storage.models import BaseModel

from .managers import UserManager


class User(AbstractBaseUser, BaseModel):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = "email"

    # Properties.
    @property
    def username(self):
        return self.email

    # Managers.
    objects = UserManager()
