from datetime import date
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import current_user_id
from app.db.session import get_db
from app.services import dashboard_service, kpi_service

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])
UserId = Annotated[str, Depends(current_user_id)]
Db = Annotated[AsyncSession, Depends(get_db)]


@router.get("/monthly-summary")
async def monthly_summary(
    user_id: UserId, db: Db, year: int = Query(default_factory=lambda: date.today().year)
) -> list[dict]:
    return await dashboard_service.get_monthly_summary(db, UUID(user_id), year)


@router.get("/expenses-by-category")
async def expenses_by_category(
    user_id: UserId, db: Db, month: str = Query(pattern=r"^\d{4}-\d{2}$")
) -> list[dict]:
    return await dashboard_service.get_expenses_by_category(db, UUID(user_id), month)


@router.get("/credit-cards-summary")
async def credit_cards_summary(user_id: UserId, db: Db) -> list[dict]:
    return await dashboard_service.get_credit_card_summary(db, UUID(user_id))


@router.get("/uber-summary")
async def uber_summary(user_id: UserId, db: Db, days: int = Query(30, le=365)) -> list[dict]:
    return await dashboard_service.get_uber_summary(db, UUID(user_id), days)


@router.get("/investments-summary")
async def investments_summary(user_id: UserId, db: Db) -> list[dict]:
    return await dashboard_service.get_investment_summary(db, UUID(user_id))


@router.get("/overview")
async def overview(user_id: UserId, db: Db) -> dict:
    """KPIs combinados para a tela Home — saldo do mês atual + tendência vs mês anterior."""
    today = date.today()
    year = today.year
    uid = UUID(user_id)
    monthly = await dashboard_service.get_monthly_summary(db, uid, year)

    current_month = today.strftime("%Y-%m")
    prev_month_num = today.month - 1 if today.month > 1 else 12
    prev_year = year if today.month > 1 else year - 1
    prev_month = f"{prev_year}-{prev_month_num:02d}"

    current = next((m for m in monthly if m["month"] == current_month), None)
    previous = next((m for m in monthly if m["month"] == prev_month), None)

    income = Decimal(current["total_income"]) if current else Decimal(0)
    expenses = Decimal(current["total_expenses"]) if current else Decimal(0)
    balance = income - expenses

    prev_balance = Decimal(previous["balance"]) if previous else Decimal(0)

    return {
        "month": current_month,
        "kpis": [
            kpi_service.build_kpi_card("Entradas", income, Decimal(previous["total_income"]) if previous else None),
            kpi_service.build_kpi_card("Saídas", expenses, Decimal(previous["total_expenses"]) if previous else None),
            kpi_service.build_kpi_card("Saldo", balance, prev_balance if previous else None),
        ],
    }
