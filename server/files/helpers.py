import logging

from storage.connectors import get_connector
from storage.models import StorageAccount

logger = logging.getLogger(__name__)


def select_storage_account(user, file_size: int) -> StorageAccount:
    """
    Auto-select the best storage account for the given file size.
    Picks the active account with the most remaining storage that
    can fit the file.
    """
    accounts = StorageAccount.objects.filter(user=user, is_active=True)

    if not accounts.exists():
        raise ValueError("No active storage accounts. Connect one in Settings.")

    best_account = None
    best_remaining = -1

    for account in accounts:
        try:
            connector = get_connector(account)
            quota = connector.get_storage_quota()
            remaining = quota.get("remaining", 0)

            if remaining >= file_size and remaining > best_remaining:
                best_account = account
                best_remaining = remaining
        except Exception as e:
            logger.warning(f"Failed to check quota for {account}: {e}")
            continue

    if best_account is None:
        # Fallback: if quota check fails for all, use the first active account
        best_account = accounts.first()
        if best_account is None:
            raise ValueError("No storage account available with enough space.")

    return best_account
