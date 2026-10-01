import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CRM Core API"
    environment: str = "development"
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 30
    cors_origins: str = "http://localhost:5173"
    frontend_url: str = "http://localhost:5173"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "CRM Core"
    smtp_use_tls: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()

# Railway containers have an ephemeral filesystem. When a Railway Volume is
# attached, point SQLite at that persistent mount automatically. This keeps
# local development unchanged while making production storage durable.
volume_mount = os.getenv("RAILWAY_VOLUME_MOUNT_PATH")
if settings.database_url.startswith("sqlite") and volume_mount:
    raw_path = settings.database_url.replace("sqlite:///", "", 1)
    db_path = Path(raw_path)
    if not db_path.is_absolute():
        db_path = Path(volume_mount) / db_path.name
    db_path.parent.mkdir(parents=True, exist_ok=True)
    settings.database_url = f"sqlite:///{db_path}"
