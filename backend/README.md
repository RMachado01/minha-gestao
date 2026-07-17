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

A API usa o PostgreSQL do Supabase indicado em `DATABASE_URL` e valida o JWT emitido
pelo Supabase Auth. O schema SQL é versionado em `../supabase/migrations`; não execute
`Base.metadata.create_all()`, pois autenticação, RLS, views e RPCs são geridas pelas
migrations.

Para validar localmente sem banco real:

```powershell
ruff check app tests
pytest -q
```
