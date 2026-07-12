from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, status
from typing import Annotated

from app.core.auth import current_user_id
from app.schemas.finance import CreditCardCreate, EnergyCostCreate, EnergyCostResult, FamilyInviteCreate, ProfileUpdate, TransactionCreate, UberDailyEntryCreate, VehicleCreate

router = APIRouter(prefix="/api/v1")
UserId = Annotated[str, Depends(current_user_id)]


@router.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "minha-gestao-api"}


@router.post("/transactions", status_code=status.HTTP_202_ACCEPTED, tags=["transactions"])
async def create_transaction(payload: TransactionCreate, user_id: UserId) -> dict:
    return {"id": str(uuid4()), "user_id": user_id, "status": "accepted", **payload.model_dump(mode="json")}


@router.post("/vehicles", status_code=status.HTTP_202_ACCEPTED, tags=["uber"])
async def create_vehicle(payload: VehicleCreate, user_id: UserId) -> dict:
    return {"id": str(uuid4()), "user_id": user_id, "status": "accepted", **payload.model_dump(mode="json")}


@router.post("/vehicles/{vehicle_id}/energy-cost", response_model=EnergyCostResult, tags=["uber"])
async def calculate_energy_cost(vehicle_id: UUID, payload: EnergyCostCreate, user_id: UserId) -> EnergyCostResult:
    return EnergyCostResult(vehicle_id=vehicle_id, consumed_kwh=payload.consumed_kwh, tariff_per_kwh=payload.tariff_per_kwh, total_cost=payload.total_cost)


@router.post("/uber/daily-entries", status_code=status.HTTP_202_ACCEPTED, tags=["uber"])
async def create_uber_daily_entry(payload: UberDailyEntryCreate, user_id: UserId) -> dict:
    return {"id": str(uuid4()), "user_id": user_id, "status": "accepted", **payload.model_dump(mode="json"), "consumed_units": str(payload.consumed_units), "energy_or_fuel_cost": str(payload.energy_or_fuel_cost), "net_profit": str(payload.net_profit)}


@router.post("/credit-cards", status_code=status.HTTP_202_ACCEPTED, tags=["cards"])
async def create_credit_card(payload: CreditCardCreate, user_id: UserId) -> dict:
    return {"id": str(uuid4()), "user_id": user_id, "status": "accepted", **payload.model_dump(mode="json")}


@router.put("/profile", tags=["settings"])
async def update_profile(payload: ProfileUpdate, user_id: UserId) -> dict:
    return {"user_id": user_id, "status": "updated", **payload.model_dump(mode="json")}


@router.post("/households/{household_id}/invites", status_code=status.HTTP_202_ACCEPTED, tags=["family"])
async def invite_family_member(household_id: UUID, payload: FamilyInviteCreate, user_id: UserId) -> dict:
    return {"id": str(uuid4()), "household_id": str(household_id), "invited_by": user_id, "status": "pending", **payload.model_dump(mode="json")}
