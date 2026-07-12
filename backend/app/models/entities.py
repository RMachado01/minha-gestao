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


class Powertrain(str, enum.Enum):
    combustion = "combustion"
    hybrid = "hybrid"
    electric = "electric"


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))


class Transaction(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key"),)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    credit_card_id: Mapped[UUID | None] = mapped_column(ForeignKey("credit_cards.id"), index=True)
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    occurred_on: Mapped[date] = mapped_column(Date, index=True)
    description: Mapped[str] = mapped_column(String(240))
    category: Mapped[str] = mapped_column(String(80))
    benefit_kind: Mapped[str | None] = mapped_column(String(20))
    recurring: Mapped[bool] = mapped_column(Boolean, default=False)
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
