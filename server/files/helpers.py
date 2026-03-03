from endless_storage import logger
from storage.connectors import get_connector
from storage.models import StorageAccount


def get_all_account_quotas(user) -> list[dict]:
    """
    Fetch storage quota information for all active storage accounts.

    Returns:
        List of dicts with keys:
            - "account": StorageAccount instance
            - "remaining": int (free bytes)
    """
    accounts = StorageAccount.objects.filter(user=user, is_active=True)

    if not accounts.exists():
        raise ValueError("No active storage accounts. Connect one in Settings.")

    quotas = []
    for account in accounts:
        try:
            connector = get_connector(account)
            quota = connector.get_storage_quota()
            remaining = quota.get("remaining", 0)
            quotas.append({"account": account, "remaining": remaining})
        except Exception as e:
            logger.warning(f"Failed to check quota for {account}: {e}")
            continue

    if not quotas:
        raise ValueError("Could not retrieve quota from any storage account.")

    return quotas
