from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.finance import UberDailyEntryCreate


def test_electric_costs_use_decimal_and_round_half_up() -> None:
    payload = UberDailyEntryCreate(
        occurred_on="2026-07-17",
        kilometers="180.00",
        gross_revenue="250.00",
        powertrain="electric",
        efficiency="18.500",
        unit_price="0.9500",
        other_costs="10.00",
        hours_worked="8.25",
        idempotency_key="entry-20260717",
    )

    assert payload.consumed_units == Decimal("33.300")
    assert payload.energy_or_fuel_cost == Decimal("31.64")
    assert payload.net_profit == Decimal("208.36")


def test_odometer_pair_is_source_of_truth_for_distance() -> None:
    payload = UberDailyEntryCreate(
        entry_kind="garage",
        occurred_on="2026-07-17",
        kilometers="999.00",
        odometer_start="1000.10",
        odometer_end="1012.45",
        gross_revenue="0",
        powertrain="combustion",
        efficiency="10.000",
        unit_price="5.5000",
        other_costs="2.25",
        idempotency_key="garage-20260717",
    )

    assert payload.kilometers == Decimal("12.35")
    assert payload.consumed_units == Decimal("1.235")
    assert payload.energy_or_fuel_cost == Decimal("6.79")
    assert payload.net_profit == Decimal("-9.04")


@pytest.mark.parametrize(
    ("changes", "error_message"),
    [
        ({"odometer_start": "100"}, "devem ser informados juntos"),
        (
            {"odometer_start": "100", "odometer_end": "100"},
            "deve ser maior",
        ),
        ({"gross_revenue": "1"}, "deve ser zero"),
        ({"hours_worked": "1"}, "deve ser vazio"),
    ],
)
def test_garage_entry_rejects_inconsistent_values(
    changes: dict[str, str], error_message: str
) -> None:
    data = {
        "entry_kind": "garage",
        "occurred_on": "2026-07-17",
        "kilometers": "10",
        "gross_revenue": "0",
        "powertrain": "hybrid",
        "efficiency": "12",
        "unit_price": "5",
        "idempotency_key": "garage-invalid",
        **changes,
    }

    with pytest.raises(ValidationError, match=error_message):
        UberDailyEntryCreate(**data)
