from rest_framework.exceptions import NotFound

from endless_storage.exceptions import BadRequest

from .models import Drive


def get_active_drive(request, raise_exception=True):
    drive_id = request.headers.get("X-Active-Drive-Id")

    if not drive_id and raise_exception:
        raise BadRequest("Active drive is required")
    elif not drive_id:
        return None

    try:
        drive = Drive.objects.get(id=drive_id)
    except Drive.DoesNotExist:
        if raise_exception:
            raise BadRequest("Active drive not found")
        return None

    if (
        drive.owner != request.user
        and not drive.members.filter(user=request.user).exists()
    ):
        raise NotFound

    return drive
