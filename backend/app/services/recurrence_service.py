from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import RecurrenceRule, Transaction, RecurrenceType


async def generate_recurring_transactions(
    db: AsyncSession, reference_date: date | None = None
) -> int:
    """Gera Transactions a partir de RecurrenceRules ativas (CLAUDE.md §3.1).

    Idempotente: usa idempotency_key = rec-{rule.id}-{YYYY-MM}.
    Para installments: incrementa parcela_atual, desativa ao atingir total.
    """
    if reference_date is None:
        reference_date = date.today()

    month_key = reference_date.strftime("%Y-%m")

    stmt = select(RecurrenceRule).where(RecurrenceRule.active == True)  # noqa: E712
    result = await db.execute(stmt)
    rules = result.scalars().all()

    created = 0
    for rule in rules:
        idempotency_key = f"rec-{rule.id}-{month_key}"

        existing = await db.execute(
            select(Transaction.id).where(Transaction.idempotency_key == idempotency_key)
        )
        if existing.scalar_one_or_none():
            continue

        if rule.start_date and reference_date < rule.start_date:
            continue
        if rule.end_date and reference_date > rule.end_date:
            continue

        # ponytail: naive day clamping to 28, proper month-end handling if needed later
        txn_date = reference_date.replace(day=min(rule.day_of_month, 28))
        # ponytail: defaults to expense; add transaction_type to RecurrenceRule when income recurrences needed
        txn = Transaction(
            user_id=rule.user_id,
            type="expense",
            amount=rule.amount,
            occurred_on=txn_date,
            description=rule.description,
            category="Recorrente",
            category_id=rule.category_id,
            recurring=True,
            recurrence_id=rule.id,
            origin="recurring_expense",
            status="pending",
            idempotency_key=idempotency_key,
        )
        db.add(txn)

        if rule.type == RecurrenceType.installment:
            rule.current_installment = (rule.current_installment or 0) + 1
            if rule.total_installments and rule.current_installment >= rule.total_installments:
                rule.active = False

        created += 1

    await db.commit()
    return created
