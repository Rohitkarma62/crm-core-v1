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
