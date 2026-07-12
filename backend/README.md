# Minha Gestão API

Fundação FastAPI + SQLAlchemy assíncrono para PostgreSQL.

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/api/v1/health`.

As rotas de criação retornam dados validados nesta primeira fundação. A persistência será conectada na próxima etapa, após provisionar PostgreSQL e gerar a migration Alembic inicial.
