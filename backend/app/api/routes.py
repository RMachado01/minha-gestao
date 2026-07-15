from datetime import date
from uuid import UUID
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import current_user_id
from app.db.session import get_db
from app.models.entities import (
    Category, CreditCard, CreditCardBill, Investment, InvestmentSnapshot,
    RecurrenceRule, Transaction, UberDailyEntry, Vehicle,
)
from app.schemas.finance import (
    CategoryCreate, CategoryRead,
    CreditCardCreate, CreditCardBillRead,
    InvestmentCreate, InvestmentRead,
    InvestmentSnapshotCreate, InvestmentSnapshotRead,
    ProfileUpdate,
    RecurrenceRuleCreate, RecurrenceRuleRead,
    TransactionCreate,
    UberDailyEntryCreate,
    VehicleCreate,
)

router = APIRouter(prefix="/api/v1")
UserId = Annotated[str, Depends(current_user_id)]
Db = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@router.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "minha-gestao-api"}


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

@router.post("/transactions", status_code=status.HTTP_201_CREATED, tags=["transactions"])
async def create_transaction(payload: TransactionCreate, user_id: UserId, db: Db) -> dict:
    data = payload.model_dump(exclude={"payment_method"})
    tx = Transaction(user_id=UUID(user_id), **data)
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return _tx_dict(tx)


@router.get("/transactions", tags=["transactions"])
async def list_transactions(
    user_id: UserId,
    db: Db,
    month: str | None = Query(default=None, description="YYYY-MM"),
    category: str | None = Query(default=None),
    type: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    stmt = select(Transaction).where(Transaction.user_id == UUID(user_id))
    if month:
        try:
            year_n, month_n = int(month[:4]), int(month[5:7])
            stmt = stmt.where(
                Transaction.occurred_on >= date(year_n, month_n, 1),
                Transaction.occurred_on < _next_month(year_n, month_n),
            )
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="month deve ser YYYY-MM")
    if category:
        stmt = stmt.where(Transaction.category == category)
    if type:
        stmt = stmt.where(Transaction.type == type)
    stmt = stmt.order_by(Transaction.occurred_on.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [_tx_dict(tx) for tx in result.scalars().all()]


@router.get("/transactions/{transaction_id}", tags=["transactions"])
async def get_transaction(transaction_id: UUID, user_id: UserId, db: Db) -> dict:
    tx = await _get_or_404(db, Transaction, transaction_id, UUID(user_id))
    return _tx_dict(tx)


@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["transactions"])
async def delete_transaction(transaction_id: UUID, user_id: UserId, db: Db) -> None:
    tx = await _get_or_404(db, Transaction, transaction_id, UUID(user_id))
    await db.delete(tx)
    await db.commit()


# ---------------------------------------------------------------------------
# Credit Cards
# ---------------------------------------------------------------------------

@router.post("/credit-cards", status_code=status.HTTP_201_CREATED, tags=["cards"])
async def create_credit_card(payload: CreditCardCreate, user_id: UserId, db: Db) -> dict:
    card = CreditCard(user_id=UUID(user_id), **payload.model_dump())
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return _card_dict(card)


@router.get("/credit-cards", tags=["cards"])
async def list_credit_cards(user_id: UserId, db: Db) -> list[dict]:
    result = await db.execute(
        select(CreditCard)
        .where(CreditCard.user_id == UUID(user_id), CreditCard.active.is_(True))
        .order_by(CreditCard.nickname)
    )
    return [_card_dict(c) for c in result.scalars().all()]


@router.put("/credit-cards/{card_id}", tags=["cards"])
async def update_credit_card(card_id: UUID, payload: CreditCardCreate, user_id: UserId, db: Db) -> dict:
    card = await _get_or_404(db, CreditCard, card_id, UUID(user_id))
    for field, value in payload.model_dump().items():
        setattr(card, field, value)
    await db.commit()
    await db.refresh(card)
    return _card_dict(card)


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@router.post("/categories", status_code=status.HTTP_201_CREATED, tags=["categories"])
async def create_category(payload: CategoryCreate, user_id: UserId, db: Db) -> CategoryRead:
    cat = Category(user_id=UUID(user_id), **payload.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.get("/categories", tags=["categories"])
async def list_categories(user_id: UserId, db: Db) -> list[CategoryRead]:
    result = await db.execute(
        select(Category).where(Category.user_id == UUID(user_id)).order_by(Category.name)
    )
    return list(result.scalars().all())


@router.put("/categories/{cat_id}", tags=["categories"])
async def update_category(cat_id: UUID, payload: CategoryCreate, user_id: UserId, db: Db) -> CategoryRead:
    cat = await _get_or_404(db, Category, cat_id, UUID(user_id))
    for field, value in payload.model_dump().items():
        setattr(cat, field, value)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/categories/{cat_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["categories"])
async def delete_category(cat_id: UUID, user_id: UserId, db: Db) -> None:
    cat = await _get_or_404(db, Category, cat_id, UUID(user_id))
    await db.delete(cat)
    await db.commit()


# ---------------------------------------------------------------------------
# Credit Card Bills
# ---------------------------------------------------------------------------

@router.get("/credit-cards/{card_id}/bills", tags=["cards"])
async def list_card_bills(card_id: UUID, user_id: UserId, db: Db) -> list[CreditCardBillRead]:
    await _get_or_404(db, CreditCard, card_id, UUID(user_id))
    result = await db.execute(
        select(CreditCardBill)
        .where(CreditCardBill.credit_card_id == card_id)
        .order_by(CreditCardBill.reference_month.desc())
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Recurrence Rules
# ---------------------------------------------------------------------------

@router.post("/recurrences", status_code=status.HTTP_201_CREATED, tags=["recurrences"])
async def create_recurrence(payload: RecurrenceRuleCreate, user_id: UserId, db: Db) -> RecurrenceRuleRead:
    rule = RecurrenceRule(user_id=UUID(user_id), **payload.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.get("/recurrences", tags=["recurrences"])
async def list_recurrences(user_id: UserId, db: Db, active_only: bool = True) -> list[RecurrenceRuleRead]:
    stmt = select(RecurrenceRule).where(RecurrenceRule.user_id == UUID(user_id))
    if active_only:
        stmt = stmt.where(RecurrenceRule.active.is_(True))
    result = await db.execute(stmt.order_by(RecurrenceRule.day_of_month))
    return list(result.scalars().all())


@router.put("/recurrences/{rule_id}", tags=["recurrences"])
async def update_recurrence(rule_id: UUID, payload: RecurrenceRuleCreate, user_id: UserId, db: Db) -> RecurrenceRuleRead:
    rule = await _get_or_404(db, RecurrenceRule, rule_id, UUID(user_id))
    for field, value in payload.model_dump().items():
        setattr(rule, field, value)
    await db.commit()
    await db.refresh(rule)
    return rule


# ---------------------------------------------------------------------------
# Investments
# ---------------------------------------------------------------------------

@router.post("/investments", status_code=status.HTTP_201_CREATED, tags=["investments"])
async def create_investment(payload: InvestmentCreate, user_id: UserId, db: Db) -> InvestmentRead:
    inv = Investment(user_id=UUID(user_id), **payload.model_dump())
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return inv


@router.get("/investments", tags=["investments"])
async def list_investments(user_id: UserId, db: Db) -> list[InvestmentRead]:
    result = await db.execute(
        select(Investment).where(Investment.user_id == UUID(user_id)).order_by(Investment.name)
    )
    return list(result.scalars().all())


@router.post("/investments/{inv_id}/snapshots", status_code=status.HTTP_201_CREATED, tags=["investments"])
async def add_snapshot(inv_id: UUID, payload: InvestmentSnapshotCreate, user_id: UserId, db: Db) -> InvestmentSnapshotRead:
    await _get_or_404(db, Investment, inv_id, UUID(user_id))
    snap = InvestmentSnapshot(investment_id=inv_id, **payload.model_dump())
    db.add(snap)
    await db.commit()
    await db.refresh(snap)
    return snap


@router.get("/investments/{inv_id}/snapshots", tags=["investments"])
async def list_snapshots(inv_id: UUID, user_id: UserId, db: Db) -> list[InvestmentSnapshotRead]:
    await _get_or_404(db, Investment, inv_id, UUID(user_id))
    result = await db.execute(
        select(InvestmentSnapshot)
        .where(InvestmentSnapshot.investment_id == inv_id)
        .order_by(InvestmentSnapshot.snapshot_date.desc())
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Vehicles
# ---------------------------------------------------------------------------

@router.post("/vehicles", status_code=status.HTTP_201_CREATED, tags=["uber"])
async def create_vehicle(payload: VehicleCreate, user_id: UserId, db: Db) -> dict:
    vehicle = Vehicle(user_id=UUID(user_id), **payload.model_dump())
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return _vehicle_dict(vehicle)


@router.get("/vehicles", tags=["uber"])
async def list_vehicles(user_id: UserId, db: Db) -> list[dict]:
    result = await db.execute(
        select(Vehicle)
        .where(Vehicle.user_id == UUID(user_id), Vehicle.active.is_(True))
    )
    return [_vehicle_dict(v) for v in result.scalars().all()]


# ---------------------------------------------------------------------------
# Uber Daily Entries
# ---------------------------------------------------------------------------

@router.post("/uber/daily-entries", status_code=status.HTTP_201_CREATED, tags=["uber"])
async def create_uber_daily_entry(payload: UberDailyEntryCreate, user_id: UserId, db: Db) -> dict:
    entry = UberDailyEntry(
        user_id=UUID(user_id),
        vehicle_id=payload.vehicle_id,
        occurred_on=payload.occurred_on,
        kilometers=payload.kilometers,
        gross_revenue=payload.gross_revenue,
        consumed_units=payload.consumed_units,        # computed server-side via schema property
        energy_or_fuel_cost=payload.energy_or_fuel_cost,  # computed server-side
        other_costs=payload.other_costs,
        net_profit=payload.net_profit,                # computed server-side
        idempotency_key=payload.idempotency_key,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return _uber_entry_dict(entry)


@router.get("/uber/daily-entries", tags=["uber"])
async def list_uber_daily_entries(
    user_id: UserId,
    db: Db,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    stmt = select(UberDailyEntry).where(UberDailyEntry.user_id == UUID(user_id))
    if date_from:
        stmt = stmt.where(UberDailyEntry.occurred_on >= date_from)
    if date_to:
        stmt = stmt.where(UberDailyEntry.occurred_on <= date_to)
    stmt = stmt.order_by(UberDailyEntry.occurred_on.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [_uber_entry_dict(e) for e in result.scalars().all()]


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@router.put("/profile", tags=["settings"])
async def update_profile(payload: ProfileUpdate, user_id: UserId, db: Db) -> dict:
    from app.models.entities import User
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    user.name = payload.full_name
    await db.commit()
    return {"user_id": user_id, **payload.model_dump()}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_or_404(db: AsyncSession, model, record_id: UUID, user_id: UUID):
    result = await db.execute(
        select(model).where(model.id == record_id, model.user_id == user_id)
    )
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Não encontrado")
    return obj


def _next_month(year: int, month: int) -> date:
    if month == 12:
        return date(year + 1, 1, 1)
    return date(year, month + 1, 1)


def _tx_dict(tx: Transaction) -> dict:
    return {
        "id": str(tx.id),
        "user_id": str(tx.user_id),
        "type": tx.type,
        "amount": str(tx.amount),
        "occurred_on": tx.occurred_on.isoformat(),
        "description": tx.description,
        "category": tx.category,
        "category_id": str(tx.category_id) if tx.category_id else None,
        "origin": tx.origin,
        "status": tx.status,
        "benefit_kind": tx.benefit_kind,
        "recurring": tx.recurring,
        "recurrence_id": str(tx.recurrence_id) if tx.recurrence_id else None,
        "credit_card_id": str(tx.credit_card_id) if tx.credit_card_id else None,
        "installments_total": tx.installments_total,
        "current_installment": tx.current_installment,
        "bill_reference": tx.bill_reference,
        "idempotency_key": tx.idempotency_key,
    }


def _card_dict(card: CreditCard) -> dict:
    return {
        "id": str(card.id),
        "user_id": str(card.user_id),
        "nickname": card.nickname,
        "brand": card.brand,
        "total_limit": str(card.total_limit),
        "closing_day": card.closing_day,
        "due_day": card.due_day,
        "color": card.color,
        "active": card.active,
    }


def _vehicle_dict(v: Vehicle) -> dict:
    return {
        "id": str(v.id),
        "user_id": str(v.user_id),
        "brand": v.brand,
        "model": v.model,
        "year": v.year,
        "state_code": v.state_code,
        "powertrain": v.powertrain,
        "efficiency": str(v.efficiency) if v.efficiency else None,
        "unit_price": str(v.unit_price) if v.unit_price else None,
        "active": v.active,
    }


def _uber_entry_dict(e: UberDailyEntry) -> dict:
    return {
        "id": str(e.id),
        "user_id": str(e.user_id),
        "vehicle_id": str(e.vehicle_id) if e.vehicle_id else None,
        "occurred_on": e.occurred_on.isoformat(),
        "kilometers": str(e.kilometers),
        "gross_revenue": str(e.gross_revenue),
        "consumed_units": str(e.consumed_units),
        "energy_or_fuel_cost": str(e.energy_or_fuel_cost),
        "other_costs": str(e.other_costs),
        "net_profit": str(e.net_profit),
        "idempotency_key": e.idempotency_key,
    }
