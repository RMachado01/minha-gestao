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
    benefit_kind: Literal["vr", "va", "flex"] | None = None
    recurring: bool = False
    payment_method: Literal["pix", "credit", "cash", "benefit"] | None = None
    credit_card_id: UUID | None = None
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
