from functools import lru_cache
import os

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = os.getenv("APP_NAME", "Minha Gestão API")
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/minha_gestao")
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    secret_key: str = os.getenv("SECRET_KEY", "development-only-change-me-at-least-32-characters")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_jwt_secret: str = os.getenv("SUPABASE_JWT_SECRET", "development-only")


@lru_cache
def get_settings() -> Settings:
    return Settings()
