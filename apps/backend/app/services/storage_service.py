import uuid
from pathlib import Path

from app.config import settings


class StorageService:
    def __init__(self, base_dir: str = settings.STORAGE_DIR):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_path(self, object_key: str) -> Path:
        # Prevent directory traversal
        safe_name = Path(object_key).name
        return self.base_dir / safe_name

    def save_sync(self, filename: str, data: bytes) -> str:
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        target_path = self.base_dir / unique_name
        target_path.write_bytes(data)
        return unique_name

    def get_sync(self, object_key: str) -> bytes:
        target_path = self._get_path(object_key)
        if not target_path.exists():
            raise FileNotFoundError(f"File not found: {object_key}")
        return target_path.read_bytes()

    def delete_sync(self, object_key: str) -> None:
        target_path = self._get_path(object_key)
        if target_path.exists():
            target_path.unlink()


storage = StorageService()
