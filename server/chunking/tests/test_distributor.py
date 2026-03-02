from unittest.mock import MagicMock

from django.test import TestCase

from chunking.distributor import ChunkDistributor
from chunking.exceptions import InsufficientStorageError


class TestChunkDistributor(TestCase):
    def setUp(self):
        self.distributor = ChunkDistributor()

    def _make_quota(self, name, remaining):
        account = MagicMock()
        account.__str__ = lambda s: name
        return {"account": account, "remaining": remaining}

    def test_single_drive_fits(self):
        """File fits on a single drive — should produce one chunk."""
        quotas = [self._make_quota("drive_a", 10_000_000_000)]
        allocation = self.distributor.compute_allocation(1_000_000_000, quotas)

        self.assertEqual(len(allocation), 1)
        self.assertEqual(allocation[0]["chunk_index"], 0)
        self.assertEqual(allocation[0]["chunk_size"], 1_000_000_000)

    def test_even_distribution(self):
        """Two equal drives split a file evenly."""
        quotas = [
            self._make_quota("drive_a", 5_000_000_000),
            self._make_quota("drive_b", 5_000_000_000),
        ]
        file_size = 10_000_000_000
        allocation = self.distributor.compute_allocation(file_size, quotas)

        self.assertEqual(len(allocation), 2)
        total_allocated = sum(a["chunk_size"] for a in allocation)
        self.assertEqual(total_allocated, file_size)

    def test_uneven_distribution(self):
        """Drives with 10GB, 5GB, 20GB free — fill biggest first."""
        quotas = [
            self._make_quota("drive_a", 10_000_000_000),
            self._make_quota("drive_b", 5_000_000_000),
            self._make_quota("drive_c", 20_000_000_000),
        ]
        file_size = 30_000_000_000
        allocation = self.distributor.compute_allocation(file_size, quotas)

        # 20GB + 10GB = 30GB, so only 2 drives are needed
        self.assertEqual(len(allocation), 2)
        # Should be ordered biggest-first: 20GB, then 10GB
        self.assertEqual(allocation[0]["chunk_size"], 20_000_000_000)
        self.assertEqual(allocation[1]["chunk_size"], 10_000_000_000)
        total_allocated = sum(a["chunk_size"] for a in allocation)
        self.assertEqual(total_allocated, file_size)

    def test_partial_fill(self):
        """File smaller than single largest drive — only one chunk needed."""
        quotas = [
            self._make_quota("drive_a", 10_000_000_000),
            self._make_quota("drive_b", 5_000_000_000),
        ]
        file_size = 3_000_000_000
        allocation = self.distributor.compute_allocation(file_size, quotas)

        self.assertEqual(len(allocation), 1)
        self.assertEqual(allocation[0]["chunk_size"], 3_000_000_000)

    def test_insufficient_storage(self):
        """Should raise InsufficientStorageError if not enough total space."""
        quotas = [
            self._make_quota("drive_a", 5_000_000_000),
            self._make_quota("drive_b", 3_000_000_000),
        ]
        file_size = 10_000_000_000

        with self.assertRaises(InsufficientStorageError):
            self.distributor.compute_allocation(file_size, quotas)

    def test_zero_remaining_filtered(self):
        """Accounts with zero remaining space are excluded."""
        quotas = [
            self._make_quota("drive_a", 0),
            self._make_quota("drive_b", 5_000_000_000),
        ]
        file_size = 3_000_000_000
        allocation = self.distributor.compute_allocation(file_size, quotas)

        self.assertEqual(len(allocation), 1)
        self.assertEqual(allocation[0]["chunk_size"], 3_000_000_000)

    def test_exact_fit(self):
        """File size exactly equals available space."""
        quotas = [self._make_quota("drive_a", 1_000_000_000)]
        allocation = self.distributor.compute_allocation(1_000_000_000, quotas)

        self.assertEqual(len(allocation), 1)
        self.assertEqual(allocation[0]["chunk_size"], 1_000_000_000)

    def test_chunk_indices_sequential(self):
        """Chunk indices should be sequential starting from 0."""
        quotas = [
            self._make_quota("drive_a", 10_000_000_000),
            self._make_quota("drive_b", 10_000_000_000),
            self._make_quota("drive_c", 10_000_000_000),
        ]
        file_size = 25_000_000_000
        allocation = self.distributor.compute_allocation(file_size, quotas)

        indices = [a["chunk_index"] for a in allocation]
        self.assertEqual(indices, [0, 1, 2])
