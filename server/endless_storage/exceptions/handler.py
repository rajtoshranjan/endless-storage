from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def handle_validation_error(exc, context, response):
    """Handle validation errors."""

    return Response(
        {
            "success": False,
            "status_code": status.HTTP_400_BAD_REQUEST,
            "message": "Validation error",
            "type": "ValidationError",
            "data": exc.detail,
        }
    )


def handle_token_error(exc, context, response):
    """Handle JWT token errors."""
    return Response(
        {
            "success": False,
            "status_code": status.HTTP_401_UNAUTHORIZED,
            "message": str(exc),
            "type": "TokenError",
        }
    )


def handle_unauthenticated_error(exc, context, response):
    """Handle unauthenticated access attempts."""
    return Response(
        {
            "success": False,
            "status_code": status.HTTP_401_UNAUTHORIZED,
            "message": "Authentication required",
            "type": "NotAuthenticated",
        }
    )


def handle_permission_error(exc, context, response):
    """Handle permission denied errors."""
    return Response(
        {
            "success": False,
            "status_code": status.HTTP_403_FORBIDDEN,
            "message": str(exc),
            "type": "PermissionDenied",
        }
    )


def handle_integrity_error(exc, context, response):
    """Handle database integrity errors."""
    return Response(
        {
            "success": False,
            "status_code": status.HTTP_409_CONFLICT,
            "message": "Database integrity error",
            "type": "IntegrityError",
            "data": str(exc),
        }
    )


def handle_method_not_allowed(exc, context, response):
    """Handle method not allowed errors."""
    return Response(
        {
            "success": False,
            "status_code": status.HTTP_405_METHOD_NOT_ALLOWED,
            "message": "Method not allowed",
            "type": "MethodNotAllowed",
        }
    )


def handle_generic_error(exc, context, response):
    """Handle any unhandled exceptions."""

    if not response:
        print(exc)
        return Response(
            {
                "success": False,
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "message": "Internal server error",
                "type": "ServerError",
            }
        )

    return Response(
        {
            "success": False,
            "status_code": response.status_code,
            "message": str(exc) if str(exc) else "Something went wrong",
            "type": exc.__class__.__name__,
            "data": getattr(exc, "detail", {}),
        }
    )


handlers = {
    "InvalidToken": handle_token_error,
    "NotAuthenticated": handle_unauthenticated_error,
    "PermissionDenied": handle_permission_error,
    "TokenError": handle_token_error,
    "ValidationError": handle_validation_error,
    "IntegrityError": handle_integrity_error,
    "MethodNotAllowed": handle_method_not_allowed,
}


def custom_exception_handler(exc, context):
    """
    Custom exception handler for consistent error responses.
    """
    exception_class = exc.__class__.__name__
    response = exception_handler(exc, context)

    if exception_class in handlers:
        return handlers[exception_class](exc, context, response)
    return handle_generic_error(exc, context, response)
