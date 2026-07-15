import enum
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"
    benefit = "benefit"


class CategoryType(str, enum.Enum):
    income = "income"
    expense = "expense"


class RecurrenceType(str, enum.Enum):
    subscription = "subscription"
    installment = "installment"
    fixed_bill = "fixed_bill"


class InvestmentType(str, enum.Enum):
    renda_fixa = "renda_fixa"
    renda_variavel = "renda_variavel"
    fundo = "fundo"
    cripto = "cripto"
    outro = "outro"


class BillStatus(str, enum.Enum):
    open = "open"
    closed = "closed"
    paid = "paid"


class TransactionOrigin(str, enum.Enum):
    fixed_income = "fixed_income"
    variable_income = "variable_income"
    expense = "expense"
    recurring_expense = "recurring_expense"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    received = "received"


class Powertrain(str, enum.Enum):
    combustion = "combustion"
    hybrid = "hybrid"
    electric = "electric"


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))


class Category(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "categories"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    type: Mapped[CategoryType] = mapped_column(Enum(CategoryType))
    color: Mapped[str | None] = mapped_column(String(20))
    icon: Mapped[str | None] = mapped_column(String(40))


class RecurrenceRule(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "recurrence_rules"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    description: Mapped[str] = mapped_column(String(240))
    type: Mapped[RecurrenceType] = mapped_column(Enum(RecurrenceType))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    day_of_month: Mapped[int] = mapped_column(Integer)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    total_installments: Mapped[int | None] = mapped_column(Integer)
    current_installment: Mapped[int | None] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    category_id: Mapped[UUID | None] = mapped_column(ForeignKey("categories.id"))


class Transaction(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key"),)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    credit_card_id: Mapped[UUID | None] = mapped_column(ForeignKey("credit_cards.id"), index=True)
    category_id: Mapped[UUID | None] = mapped_column(ForeignKey("categories.id"))
    recurrence_id: Mapped[UUID | None] = mapped_column(ForeignKey("recurrence_rules.id"))
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    occurred_on: Mapped[date] = mapped_column(Date, index=True)
    description: Mapped[str] = mapped_column(String(240))
    category: Mapped[str] = mapped_column(String(80))
    origin: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(10), default="pending")
    benefit_kind: Mapped[str | None] = mapped_column(String(20))
    recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    installments_total: Mapped[int | None] = mapped_column(Integer)
    current_installment: Mapped[int | None] = mapped_column(Integer)
    bill_reference: Mapped[str | None] = mapped_column(String(7))
    idempotency_key: Mapped[str] = mapped_column(String(80))


class Vehicle(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "vehicles"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    brand: Mapped[str] = mapped_column(String(80))
    model: Mapped[str] = mapped_column(String(120))
    year: Mapped[int] = mapped_column(Integer)
    state_code: Mapped[str] = mapped_column(String(2))
    powertrain: Mapped[Powertrain] = mapped_column(Enum(Powertrain))
    efficiency: Mapped[Decimal | None] = mapped_column(Numeric(12, 3))
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    energy_entries: Mapped[list["VehicleEnergyEntry"]] = relationship(back_populates="vehicle")


class VehicleEnergyEntry(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "vehicle_energy_entries"
    vehicle_id: Mapped[UUID] = mapped_column(ForeignKey("vehicles.id"), index=True)
    occurred_on: Mapped[date] = mapped_column(Date, index=True)
    consumed_kwh: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    tariff_per_kwh: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    distributor: Mapped[str | None] = mapped_column(String(120))
    vehicle: Mapped[Vehicle] = relationship(back_populates="energy_entries")


class UberDailyEntry(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "uber_daily_entries"
    __table_args__ = (UniqueConstraint("user_id", "occurred_on", "idempotency_key"),)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    vehicle_id: Mapped[UUID | None] = mapped_column(ForeignKey("vehicles.id"), index=True)
    occurred_on: Mapped[date] = mapped_column(Date, index=True)
    kilometers: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    gross_revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    consumed_units: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    energy_or_fuel_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    other_costs: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    net_profit: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    idempotency_key: Mapped[str] = mapped_column(String(80))


class CreditCard(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "credit_cards"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    nickname: Mapped[str] = mapped_column(String(80))
    brand: Mapped[str] = mapped_column(String(40))
    total_limit: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    closing_day: Mapped[int] = mapped_column(Integer)
    due_day: Mapped[int] = mapped_column(Integer)
    color: Mapped[str | None] = mapped_column(String(20))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class CreditCardBill(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "credit_card_bills"
    __table_args__ = (UniqueConstraint("credit_card_id", "reference_month"),)
    credit_card_id: Mapped[UUID] = mapped_column(ForeignKey("credit_cards.id"), index=True)
    reference_month: Mapped[str] = mapped_column(String(7))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[BillStatus] = mapped_column(Enum(BillStatus), default=BillStatus.open)


class Investment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "investments"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    type: Mapped[InvestmentType] = mapped_column(Enum(InvestmentType))
    invested_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    application_date: Mapped[date] = mapped_column(Date)
    institution: Mapped[str] = mapped_column(String(120))
    snapshots: Mapped[list["InvestmentSnapshot"]] = relationship(back_populates="investment")


class InvestmentSnapshot(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "investment_snapshots"
    investment_id: Mapped[UUID] = mapped_column(ForeignKey("investments.id"), index=True)
    snapshot_date: Mapped[date] = mapped_column(Date)
    current_value: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    investment: Mapped[Investment] = relationship(back_populates="snapshots")


class FinancialGoal(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "financial_goals"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    goal_type: Mapped[str] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(String(600))
    target_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    current_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    contribution_mode: Mapped[str] = mapped_column(String(12))
    contribution_value: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    target_date: Mapped[date | None] = mapped_column(Date)
    preferred_scenario: Mapped[str] = mapped_column(String(20), default="cdb")
    custom_annual_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 3))
    status: Mapped[str] = mapped_column(String(12), default="active")
    events: Mapped[list["GoalEvent"]] = relationship(back_populates="goal")


class GoalEvent(UUIDMixin, Base):
    __tablename__ = "goal_events"
    goal_id: Mapped[UUID] = mapped_column(ForeignKey("financial_goals.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(20))
    amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    description: Mapped[str | None] = mapped_column(String(400))
    occurred_on: Mapped[date] = mapped_column(Date, index=True)
    goal: Mapped[FinancialGoal] = relationship(back_populates="events")
