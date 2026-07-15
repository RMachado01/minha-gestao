from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TransactionCreate(BaseModel):
    type: Literal["income", "expense", "benefit"]
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    occurred_on: date
    description: str = Field(min_length=2, max_length=240)
    category: str = Field(min_length=2, max_length=80)
    category_id: UUID | None = None
    origin: Literal["fixed_income", "variable_income", "expense", "recurring_expense"] | None = None
    status: Literal["pending", "paid", "received"] = "pending"
    benefit_kind: Literal["vr", "va", "flex"] | None = None
    recurring: bool = False
    payment_method: Literal["pix", "credit", "cash", "benefit"] | None = None
    credit_card_id: UUID | None = None
    installments_total: int | None = Field(default=None, ge=1)
    current_installment: int | None = Field(default=None, ge=1)
    bill_reference: str | None = Field(default=None, max_length=7)
    idempotency_key: str = Field(min_length=8, max_length=80)

    @model_validator(mode="after")
    def validate_benefit(self):
        if self.type == "benefit" and self.benefit_kind is None:
            raise ValueError("benefit_kind é obrigatório para VR/VA")
        if self.type == "benefit":
            self.category = "Alimentação"
        if self.payment_method == "credit" and self.credit_card_id is None:
            raise ValueError("credit_card_id é obrigatório para compra no crédito")
        return self


class VehicleCreate(BaseModel):
    brand: str = Field(min_length=2, max_length=80)
    model: str = Field(min_length=1, max_length=120)
    year: int = Field(ge=1980, le=2100)
    state_code: str = Field(pattern=r"^[A-Z]{2}$")
    powertrain: Literal["combustion", "hybrid", "electric"]


class EnergyCostCreate(BaseModel):
    occurred_on: date
    consumed_kwh: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    tariff_per_kwh: Decimal = Field(gt=0, max_digits=12, decimal_places=4)
    distributor: str | None = Field(default=None, max_length=120)

    @property
    def total_cost(self) -> Decimal:
        return (self.consumed_kwh * self.tariff_per_kwh).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class EnergyCostResult(BaseModel):
    vehicle_id: UUID
    consumed_kwh: Decimal
    tariff_per_kwh: Decimal
    total_cost: Decimal
    model_config = ConfigDict(from_attributes=True)


class UberDailyEntryCreate(BaseModel):
    occurred_on: date
    vehicle_id: UUID | None = None
    kilometers: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    gross_revenue: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    powertrain: Literal["combustion", "hybrid", "electric"]
    efficiency: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    unit_price: Decimal = Field(gt=0, max_digits=12, decimal_places=4)
    other_costs: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    idempotency_key: str = Field(min_length=8, max_length=80)

    @property
    def consumed_units(self) -> Decimal:
        if self.powertrain == "electric":
            return (self.kilometers * self.efficiency / Decimal("100")).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
        return (self.kilometers / self.efficiency).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)

    @property
    def energy_or_fuel_cost(self) -> Decimal:
        return (self.consumed_units * self.unit_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @property
    def net_profit(self) -> Decimal:
        return (self.gross_revenue - self.energy_or_fuel_cost - self.other_costs).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class CreditCardCreate(BaseModel):
    nickname: str = Field(min_length=2, max_length=80)
    brand: str = Field(min_length=2, max_length=40)
    total_limit: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    closing_day: int = Field(ge=1, le=31)
    due_day: int = Field(ge=1, le=31)
    color: str | None = Field(default=None, max_length=20)


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    state_code: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    currency: str = Field(default="BRL", pattern=r"^[A-Z]{3}$")


class FamilyInviteCreate(BaseModel):
    email: str
    relation: str = Field(min_length=2, max_length=40)
    role: Literal["manager", "member", "viewer"] = "member"


# --------------- Category ---------------

class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    type: Literal["income", "expense"]
    color: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=40)


class CategoryRead(BaseModel):
    id: UUID
    name: str
    type: str
    color: str | None
    icon: str | None
    model_config = ConfigDict(from_attributes=True)


# --------------- RecurrenceRule ---------------

class RecurrenceRuleCreate(BaseModel):
    description: str = Field(min_length=2, max_length=240)
    type: Literal["subscription", "installment", "fixed_bill"]
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    day_of_month: int = Field(ge=1, le=31)
    start_date: date
    end_date: date | None = None
    total_installments: int | None = Field(default=None, ge=1)
    category_id: UUID | None = None

    @model_validator(mode="after")
    def validate_installment(self):
        if self.type == "installment" and self.total_installments is None:
            raise ValueError("total_installments obrigatório para parcelamento")
        return self


class RecurrenceRuleRead(BaseModel):
    id: UUID
    description: str
    type: str
    amount: Decimal
    day_of_month: int
    start_date: date
    end_date: date | None
    total_installments: int | None
    current_installment: int | None
    active: bool
    category_id: UUID | None
    model_config = ConfigDict(from_attributes=True)


# --------------- Investment ---------------

class InvestmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    type: Literal["renda_fixa", "renda_variavel", "fundo", "cripto", "outro"]
    invested_amount: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    application_date: date
    institution: str = Field(min_length=2, max_length=120)


class InvestmentRead(BaseModel):
    id: UUID
    name: str
    type: str
    invested_amount: Decimal
    application_date: date
    institution: str
    model_config = ConfigDict(from_attributes=True)


class InvestmentSnapshotCreate(BaseModel):
    snapshot_date: date
    current_value: Decimal = Field(max_digits=12, decimal_places=2)


class InvestmentSnapshotRead(BaseModel):
    id: UUID
    investment_id: UUID
    snapshot_date: date
    current_value: Decimal
    model_config = ConfigDict(from_attributes=True)


# --------------- CreditCard / Bill reads ---------------

class CreditCardRead(BaseModel):
    id: UUID
    nickname: str
    brand: str
    total_limit: Decimal
    closing_day: int
    due_day: int
    color: str | None
    active: bool
    model_config = ConfigDict(from_attributes=True)


class CreditCardBillRead(BaseModel):
    id: UUID
    credit_card_id: UUID
    reference_month: str
    total_amount: Decimal
    status: str
    model_config = ConfigDict(from_attributes=True)


# --------------- Transaction read ---------------

class TransactionRead(BaseModel):
    id: UUID
    type: str
    amount: Decimal
    occurred_on: date
    description: str
    category: str
    category_id: UUID | None
    origin: str | None
    status: str
    benefit_kind: str | None
    recurring: bool
    recurrence_id: UUID | None
    credit_card_id: UUID | None
    installments_total: int | None
    current_installment: int | None
    bill_reference: str | None
    model_config = ConfigDict(from_attributes=True)


# --------------- Financial goals ---------------

class FinancialGoalCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    goal_type: Literal["reserve", "vehicle", "home", "travel", "education", "retirement", "other"]
    description: str | None = Field(default=None, max_length=600)
    target_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    current_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    contribution_mode: Literal["fixed", "percentage"]
    contribution_value: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    target_date: date | None = None
    preferred_scenario: Literal["savings", "cdb", "treasury", "dividends", "custom"] = "cdb"
    custom_annual_rate: Decimal | None = Field(default=None, ge=0, le=100, max_digits=6, decimal_places=3)

    @model_validator(mode="after")
    def validate_contribution(self):
        if self.contribution_mode == "percentage" and self.contribution_value > 100:
            raise ValueError("contribution_value deve ser no máximo 100 para percentual")
        if self.preferred_scenario == "custom" and self.custom_annual_rate is None:
            raise ValueError("custom_annual_rate é obrigatório no cenário personalizado")
        return self


class FinancialGoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=600)
    target_amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    contribution_mode: Literal["fixed", "percentage"] | None = None
    contribution_value: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    target_date: date | None = None
    preferred_scenario: Literal["savings", "cdb", "treasury", "dividends", "custom"] | None = None
    custom_annual_rate: Decimal | None = Field(default=None, ge=0, le=100, max_digits=6, decimal_places=3)
    status: Literal["active", "paused", "completed", "cancelled"] | None = None


class GoalEventCreate(BaseModel):
    event_type: Literal["contribution", "withdrawal", "milestone", "note"]
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    description: str | None = Field(default=None, max_length=400)
    occurred_on: date

    @model_validator(mode="after")
    def validate_amount(self):
        if self.event_type in {"contribution", "withdrawal"} and self.amount is None:
            raise ValueError("amount é obrigatório para aporte ou retirada")
        if self.event_type in {"milestone", "note"} and self.amount is not None:
            raise ValueError("amount deve ser vazio para marco ou nota")
        return self
