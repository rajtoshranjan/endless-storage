import logging

from .exceptions import InsufficientStorageError


logger = logging.getLogger(__name__)


class ChunkDistributor:
    """Allocates file bytes across storage accounts by available space."""

    def compute_allocation(
        self,
        file_size: int,
        account_quotas: list[dict],
    ) -> list[dict]:
        """
        Compute how to distribute a file's bytes across storage accounts.

        Each account gets at most one chunk, sized to the minimum of
        its available space and the remaining unallocated bytes.
        Accounts are filled largest-first.

        Args:
            file_size: Total bytes to distribute.
            account_quotas: List of dicts with keys:
                - "account": StorageAccount instance
                - "remaining": int (free bytes on this account)

        Returns:
            List of dicts, each with:
                - "storage_account": StorageAccount
                - "chunk_index": int (0-based)
                - "chunk_size": int (bytes for this chunk)

        Raises:
            InsufficientStorageError: If total free space < file_size.
        """
        # Filter out accounts with no usable space
        usable = [q for q in account_quotas if q["remaining"] > 0]

        total_available = sum(q["remaining"] for q in usable)
        if total_available < file_size:
            raise InsufficientStorageError(
                f"Not enough storage space. Need {file_size} bytes, "
                f"but only {total_available} bytes available across "
                f"{len(usable)} connected drive(s)."
            )

        # Sort by remaining space descending — fill biggest drives first
        usable.sort(key=lambda q: q["remaining"], reverse=True)

        allocation = []
        bytes_left = file_size
        chunk_index = 0

        for quota in usable:
            if bytes_left <= 0:
                break

            chunk_size = min(quota["remaining"], bytes_left)
            allocation.append(
                {
                    "storage_account": quota["account"],
                    "chunk_index": chunk_index,
                    "chunk_size": chunk_size,
                }
            )
            bytes_left -= chunk_size
            chunk_index += 1

        return allocation
