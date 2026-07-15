from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Transaction


async def create_transaction(db: AsyncSession, user_id: UUID, data: dict) -> Transaction:
    txn = Transaction(user_id=user_id, **data)
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return txn


async def list_transactions(
    db: AsyncSession,
    user_id: UUID,
    month: str | None = None,
    category: str | None = None,
    type_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Transaction]:
    stmt = select(Transaction).where(Transaction.user_id == user_id)
    if month:
        year, m = month.split("-")
        stmt = stmt.where(func.extract("year", Transaction.occurred_on) == int(year))
        stmt = stmt.where(func.extract("month", Transaction.occurred_on) == int(m))
    if category:
        stmt = stmt.where(Transaction.category == category)
    if type_filter:
        stmt = stmt.where(Transaction.type == type_filter)
    stmt = stmt.order_by(Transaction.occurred_on.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_transaction(db: AsyncSession, user_id: UUID, txn_id: UUID) -> Transaction | None:
    stmt = select(Transaction).where(and_(Transaction.id == txn_id, Transaction.user_id == user_id))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def delete_transaction(db: AsyncSession, user_id: UUID, txn_id: UUID) -> bool:
    txn = await get_transaction(db, user_id, txn_id)
    if not txn:
        return False
    await db.delete(txn)
    await db.commit()
    return True
