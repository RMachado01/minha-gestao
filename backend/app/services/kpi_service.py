from decimal import Decimal, ROUND_HALF_UP


def calculate_trend(current: Decimal, previous: Decimal) -> dict:
    """Variação % entre períodos (CLAUDE.md §3.4).

    > 0 = alta; < 0 = queda.
    """
    if previous == 0:
        return {"variation_pct": None, "direction": "neutral"}
    variation = ((current - previous) / previous * 100).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    direction = "up" if variation > 0 else "down" if variation < 0 else "neutral"
    return {"variation_pct": str(variation), "direction": direction}


def calculate_margin(profit: Decimal, revenue: Decimal) -> str | None:
    """Margem líquida (%) = lucro / receita."""
    if revenue == 0:
        return None
    return str(
        (profit / revenue * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    )


def build_kpi_card(
    label: str,
    value: Decimal,
    previous: Decimal | None = None,
    format_as: str = "currency",
) -> dict:
    card: dict = {"label": label, "value": str(value), "format": format_as}
    if previous is not None:
        card["trend"] = calculate_trend(value, previous)
    return card
