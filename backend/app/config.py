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

# Railway Volume persistence. Prefer the explicit mounted path when it exists,
# and fall back to Railway's volume env var. Local development remains unchanged.
if settings.database_url.startswith("sqlite"):
    volume_mount = os.getenv("RAILWAY_VOLUME_MOUNT_PATH")
    if not volume_mount and Path("/app/data").is_dir():
        volume_mount = "/app/data"

    if volume_mount:
        raw_path = settings.database_url.replace("sqlite:///", "", 1)
        db_name = Path(raw_path).name or "crm.db"
        db_path = Path(volume_mount) / db_name
        db_path.parent.mkdir(parents=True, exist_ok=True)
        settings.database_url = f"sqlite:///{db_path}"
