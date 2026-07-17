from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.core.auth import current_user_id
from app.db.session import get_db
from app.main import app
from app.models.entities import Profile


USER_ID = UUID("11111111-1111-4111-8111-111111111111")


class FakeScalarResult:
    def __init__(self, value: object | None) -> None:
        self.value = value

    def scalar_one_or_none(self) -> object | None:
        return self.value


class FakeSession:
    def __init__(self, query_result: object | None = None) -> None:
        self.query_result = query_result
        self.added: list[object] = []
        self.commits = 0

    def add(self, value: object) -> None:
        self.added.append(value)

    async def execute(self, _statement: object) -> FakeScalarResult:
        return FakeScalarResult(self.query_result)

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, value: object) -> None:
        if getattr(value, "id", None) is None:
            value.id = uuid4()


def request_with_session(
    method: str, url: str, session: FakeSession, json: dict[str, object]
):
    async def fake_user_id() -> str:
        return str(USER_ID)

    async def fake_db():
        yield session

    app.dependency_overrides[current_user_id] = fake_user_id
    app.dependency_overrides[get_db] = fake_db
    try:
        with TestClient(app) as client:
            return client.request(method, url, json=json)
    finally:
        app.dependency_overrides.clear()


def test_create_garage_entry_persists_computed_fields() -> None:
    session = FakeSession()
    response = request_with_session(
        "POST",
        "/api/v1/uber/daily-entries",
        session,
        json={
            "entry_kind": "garage",
            "occurred_on": "2026-07-17",
            "vehicle_id": "22222222-2222-4222-8222-222222222222",
            "odometer_start": "1000.10",
            "odometer_end": "1012.45",
            "gross_revenue": "0",
            "powertrain": "combustion",
            "efficiency": "10.000",
            "unit_price": "5.5000",
            "other_costs": "2.25",
            "idempotency_key": "garage-20260717",
        },
    )

    assert response.status_code == 201
    body = response.json()
    UUID(body.pop("id"))
    assert body == {
        "user_id": str(USER_ID),
        "vehicle_id": "22222222-2222-4222-8222-222222222222",
        "occurred_on": "2026-07-17",
        "kilometers": "12.35",
        "gross_revenue": "0",
        "consumed_units": "1.235",
        "energy_or_fuel_cost": "6.79",
        "other_costs": "2.25",
        "net_profit": "-9.04",
        "idempotency_key": "garage-20260717",
        "entry_kind": "garage",
        "hours_worked": None,
        "odometer_start": "1000.10",
        "odometer_end": "1012.45",
    }
    assert session.commits == 1
    assert len(session.added) == 1


def test_update_profile_writes_public_profile_fields() -> None:
    profile = Profile(
        id=USER_ID,
        full_name="Nome antigo",
        phone=None,
        state_code=None,
        currency="BRL",
    )
    session = FakeSession(query_result=profile)
    response = request_with_session(
        "PUT",
        "/api/v1/profile",
        session,
        json={
            "full_name": "Maria da Silva",
            "phone": "+55 11 99999-0000",
            "state_code": "SP",
            "currency": "BRL",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "user_id": str(USER_ID),
        "full_name": "Maria da Silva",
        "phone": "+55 11 99999-0000",
        "state_code": "SP",
        "currency": "BRL",
    }
    assert profile.full_name == "Maria da Silva"
    assert profile.phone == "+55 11 99999-0000"
    assert profile.state_code == "SP"
    assert session.commits == 1
