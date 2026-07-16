from functools import lru_cache
import os

from pydantic import BaseModel

_INSECURE_JWT_SECRET_DEFAULT = "development-only"
_INSECURE_SECRET_KEY_DEFAULT = "development-only-change-me-at-least-32-characters"


class Settings(BaseModel):
    app_name: str = os.getenv("APP_NAME", "Minha Gestão API")
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/minha_gestao")
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    secret_key: str = os.getenv("SECRET_KEY", _INSECURE_SECRET_KEY_DEFAULT)
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_jwt_secret: str = os.getenv("SUPABASE_JWT_SECRET", _INSECURE_JWT_SECRET_DEFAULT)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.app_env != "development":
        # supabase_jwt_secret assina/valida todo token de autenticação (current_user_id).
        # Um valor padrão público em produção equivale a não ter autenticação nenhuma.
        if settings.supabase_jwt_secret == _INSECURE_JWT_SECRET_DEFAULT:
            raise RuntimeError(
                "SUPABASE_JWT_SECRET não configurado (usando o valor padrão de desenvolvimento) "
                f"com APP_ENV={settings.app_env!r}. Defina a variável de ambiente real antes de iniciar."
            )
        if settings.secret_key == _INSECURE_SECRET_KEY_DEFAULT:
            raise RuntimeError(
                "SECRET_KEY não configurado (usando o valor padrão de desenvolvimento) "
                f"com APP_ENV={settings.app_env!r}. Defina a variável de ambiente real antes de iniciar."
            )
    return settings
