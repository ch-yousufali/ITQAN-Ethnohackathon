from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, ClassVar

from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class DataManifest:
    source_name: str
    source_version: str
    source_url: str | None = None
    file_path: str | None = None
    file_checksum: str | None = None
    loaded_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    row_count: int = 0
    notes: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_file(
        cls, source_name: str, source_version: str, path: Path, **kwargs: Any
    ) -> "DataManifest":
        checksum = hashlib.sha256(path.read_bytes()).hexdigest()[:16]
        return cls(
            source_name=source_name,
            source_version=source_version,
            file_path=str(path),
            file_checksum=checksum,
            **kwargs,
        )


@dataclass
class LoaderResult:
    manifest: DataManifest
    inserted: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


class BaseLoader:
    source_name: ClassVar[str] = ""
    source_version: ClassVar[str] = ""

    async def load(self, session: AsyncSession, path: Path) -> LoaderResult:
        raise NotImplementedError
