import os
import shutil
from pathlib import Path

from app.config import settings
from app.database import Base, engine
from app import models


def sqlite_path(url: str) -> Path | None:
    if not url.startswith("sqlite:///"):
        return None
    raw = url.replace("sqlite:///", "", 1)
    path = Path(raw)
    return path if path.is_absolute() else Path.cwd() / path


def main() -> None:
    target = sqlite_path(settings.database_url)
    legacy = sqlite_path(os.getenv("DATABASE_URL", ""))
    if not target or not legacy or target.resolve() == legacy.resolve():
        return

    target.parent.mkdir(parents=True, exist_ok=True)

    # Preserve the existing ephemeral DB on the first deployment that gets a
    # persistent volume. Never overwrite an existing persistent database.
    if not target.exists() and legacy.exists():
        shutil.copy2(legacy, target)
        print(f"Copied legacy SQLite database to persistent path: {target}")

    # Create any newly added tables without disturbing existing business data.
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    main()
