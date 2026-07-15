from uuid import UUID

from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import (
    Transaction, TransactionType, UberDailyEntry, CreditCard,
    Investment, InvestmentSnapshot,
)


async def get_monthly_summary(db: AsyncSession, user_id: UUID, year: int) -> list[dict]:
    """Resumo mensal: entradas, saídas, saldo — §6.4 vw_resumo_mensal."""
    stmt = (
        select(
            func.date_trunc("month", Transaction.occurred_on).label("month"),
            func.sum(case((Transaction.type == TransactionType.income, Transaction.amount), else_=0)).label("total_income"),
            func.sum(case((Transaction.type.in_([TransactionType.expense, TransactionType.benefit]), Transaction.amount), else_=0)).label("total_expenses"),
        )
        .where(Transaction.user_id == user_id)
        .where(func.extract("year", Transaction.occurred_on) == year)
        .group_by(func.date_trunc("month", Transaction.occurred_on))
        .order_by(func.date_trunc("month", Transaction.occurred_on))
    )
    result = await db.execute(stmt)
    return [
        {
            "month": row.month.strftime("%Y-%m"),
            "total_income": str(row.total_income or 0),
            "total_expenses": str(row.total_expenses or 0),
            "balance": str((row.total_income or 0) - (row.total_expenses or 0)),
        }
        for row in result.all()
    ]


async def get_expenses_by_category(db: AsyncSession, user_id: UUID, month: str) -> list[dict]:
    """Gastos por categoria no mês — §6.4 vw_gastos_por_categoria_mensal."""
    year, m = month.split("-")
    stmt = (
        select(Transaction.category, func.sum(Transaction.amount).label("total"))
        .where(Transaction.user_id == user_id)
        .where(Transaction.type.in_([TransactionType.expense, TransactionType.benefit]))
        .where(func.extract("year", Transaction.occurred_on) == int(year))
        .where(func.extract("month", Transaction.occurred_on) == int(m))
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    result = await db.execute(stmt)
    return [{"category": row.category, "total": str(row.total)} for row in result.all()]


async def get_credit_card_summary(db: AsyncSession, user_id: UUID) -> list[dict]:
    """Resumo cartões: limite usado vs disponível."""
    cards_stmt = select(CreditCard).where(CreditCard.user_id == user_id, CreditCard.active == True)  # noqa: E712
    cards_result = await db.execute(cards_stmt)
    cards = cards_result.scalars().all()

    # ponytail: single query instead of N+1, filter only pending/unpaid transactions
    used_stmt = (
        select(Transaction.credit_card_id, func.coalesce(func.sum(Transaction.amount), 0).label("used"))
        .where(Transaction.credit_card_id.in_([c.id for c in cards]))
        .where(Transaction.status.in_(["pending", "received"]))  # exclude paid
        .group_by(Transaction.credit_card_id)
    )
    used_result = await db.execute(used_stmt)
    used_map = {row.credit_card_id: row.used for row in used_result.all()}

    return [
        {
            "card_id": str(card.id),
            "nickname": card.nickname,
            "brand": card.brand,
            "total_limit": str(card.total_limit),
            "used": str(used_map.get(card.id, 0)),
            "available": str(card.total_limit - used_map.get(card.id, 0)),
            "closing_day": card.closing_day,
            "due_day": card.due_day,
        }
        for card in cards
    ]


async def get_uber_summary(db: AsyncSession, user_id: UUID, days: int = 30) -> list[dict]:
    """Resumo Uber por dia — §6.4 vw_uber_resumo_diario."""
    stmt = (
        select(
            UberDailyEntry.occurred_on,
            func.sum(UberDailyEntry.gross_revenue).label("revenue"),
            func.sum(UberDailyEntry.energy_or_fuel_cost).label("fuel_cost"),
            func.sum(UberDailyEntry.other_costs).label("other_costs"),
            func.sum(UberDailyEntry.net_profit).label("profit"),
            func.sum(UberDailyEntry.kilometers).label("km"),
        )
        .where(UberDailyEntry.user_id == user_id)
        .group_by(UberDailyEntry.occurred_on)
        .order_by(UberDailyEntry.occurred_on.desc())
        .limit(days)
    )
    result = await db.execute(stmt)
    return [
        {
            "date": row.occurred_on.isoformat(),
            "revenue": str(row.revenue),
            "fuel_cost": str(row.fuel_cost),
            "other_costs": str(row.other_costs),
            "profit": str(row.profit),
            "km": str(row.km),
        }
        for row in result.all()
    ]


async def get_investment_summary(db: AsyncSession, user_id: UUID) -> list[dict]:
    """Evolução patrimonial — §6.4 vw_evolucao_investimentos."""
    stmt = (
        select(
            InvestmentSnapshot.snapshot_date,
            Investment.type.label("investment_type"),
            func.sum(Investment.invested_amount).label("total_invested"),
            func.sum(InvestmentSnapshot.current_value).label("total_current"),
        )
        .join(InvestmentSnapshot, InvestmentSnapshot.investment_id == Investment.id)
        .where(Investment.user_id == user_id)
        .group_by(InvestmentSnapshot.snapshot_date, Investment.type)
        .order_by(InvestmentSnapshot.snapshot_date)
    )
    result = await db.execute(stmt)
    return [
        {
            "date": row.snapshot_date.isoformat(),
            "type": row.investment_type,
            "total_invested": str(row.total_invested),
            "total_current": str(row.total_current),
        }
        for row in result.all()
    ]
