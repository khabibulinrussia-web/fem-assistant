"""Core financial engine — Python port of ФЭМ v6 Excel logic"""

from typing import List, Dict, Any
from models import Assumptions

MONTHS = 36


def run_calculation(a: Assumptions) -> Dict[str, Any]:
    """Main calculation entry point. Takes Assumptions, returns all sheets."""

    # === 1. Helper: ramp-up coefficient for each month ===
    def ramp(m: int) -> float:
        if m < 1:
            return 0.0
        return a.ramp_month_1 if m == 1 else a.ramp_month_2 if m == 2 else a.ramp_month_3

    # === 2. Revenue & costs per month ===
    daily_revenue = [a.target_revenue_per_day * ramp(m) for m in range(1, MONTHS + 1)]
    orders = [a.orders_per_day * 30 * ramp(m) for m in range(1, MONTHS + 1)]

    revenue = [round(d * 30, 2) for d in daily_revenue]
    acquiring = [round(r * a.acquiring_pct / 100, 2) for r in revenue]
    net_revenue = [round(revenue[i] - acquiring[i], 2) for i in range(MONTHS)]

    cost_of_goods = [round(o * a.cost_per_order, 2) for o in orders]
    payroll = [a.payroll] * MONTHS
    logistics = [round(o * a.logistics_per_order, 2) for o in orders]
    marketing = [a.marketing] * MONTHS
    rent = [a.rent] * MONTHS
    other = [a.other_expenses] * MONTHS

    total_expenses = [
        round(cost_of_goods[i] + payroll[i] + logistics[i] + marketing[i] + rent[i] + other[i], 2)
        for i in range(MONTHS)
    ]

    profit_before_tax = [round(net_revenue[i] - total_expenses[i], 2) for i in range(MONTHS)]

    if a.tax_system == "USN_6":
        tax = [round(max(revenue[i] * 0.06, 0), 2) for i in range(MONTHS)]
    elif a.tax_system == "USN_15":
        tax = [round(max(profit_before_tax[i] * a.tax_rate, 0), 2) for i in range(MONTHS)]
    else:  # OSNO — simplified
        tax = [round(max(profit_before_tax[i] * 0.20, 0), 2) for i in range(MONTHS)]

    net_profit = [round(profit_before_tax[i] - tax[i], 2) for i in range(MONTHS)]

    cumulative_profit = []
    running = 0.0
    for p in net_profit:
        running += p
        cumulative_profit.append(round(running, 2))

    # === 3. Cash Flow (БДДС) ===
    investments = a.reg_ip + a.equipment + a.website + a.reserve_fund

    operating_inflow = revenue  # поступления от продаж
    operating_outflow = [
        round(cost_of_goods[i] + acquiring[i] + payroll[i] + logistics[i] + marketing[i] + rent[i] + other[i] + tax[i], 2)
        for i in range(MONTHS)
    ]
    net_operating = [round(operating_inflow[i] - operating_outflow[i], 2) for i in range(MONTHS)]

    # Investment: only in month 1
    investing = [0.0] * MONTHS
    if investments > 0:
        investing[0] = -investments

    # Financing: учредительские вложения = покрытие отрицательного CF
    financing = [0.0] * MONTHS
    cash_start = [0.0] * MONTHS
    cash_end = [0.0] * MONTHS

    for i in range(MONTHS):
        cf_before_finance = net_operating[i] + investing[i]
        if i == 0:
            start = 0.0
        else:
            start = cash_end[i - 1]

        # Если денег не хватает — учредитель докидывает
        if start + cf_before_finance < 0:
            financing[i] = round(-(start + cf_before_finance), 2)
        elif i == 0 and cf_before_finance < 0 and investments > 0:
            # Первый месяц: покрываем начальные расходы
            financing[i] = round(investments, 2)

        cash_start[i] = round(start, 2)
        cash_end[i] = round(start + cf_before_finance + financing[i], 2)

    net_cashflow = [round(cash_end[i] - cash_start[i], 2) for i in range(MONTHS)]

    # === 4. Balance Sheet ===
    cash = cash_end
    inventory = [round(a.inventory_days * cost_of_goods[i] / 30, 2) for i in range(MONTHS)]
    fixed_assets = []
    remaining = investments
    for i in range(MONTHS):
        if i == 0:
            fa = investments
        else:
            amort = round(fixed_assets[i - 1] * 0.02, 2)
            fa = round(max(fixed_assets[i - 1] - amort, 0), 2)
        fixed_assets.append(fa)

    total_assets = [round(cash[i] + inventory[i] + fixed_assets[i], 2) for i in range(MONTHS)]

    equity = round(investments + cumulative_profit[MONTHS - 1], 2)  # УК + нераспред. прибыль
    capital = [round(investments + cumulative_profit[i], 2) for i in range(MONTHS)]
    accounts_payable = [round(a.supplier_deferral * cost_of_goods[i] / 30, 2) for i in range(MONTHS)]
    total_liabilities = [round(capital[i] + accounts_payable[i], 2) for i in range(MONTHS)]

    # === 5. Ratios (год 3 = последний год) ===
    y3_start = 24
    y3_revenue = sum(revenue[y3_start:y3_start + 12])
    y3_net_profit = sum(net_profit[y3_start:y3_start + 12])
    y3_equity = capital[y3_start + 11]
    y3_assets = total_assets[y3_start + 11]
    y3_cogs = sum(cost_of_goods[y3_start:y3_start + 12])
    y3_total_assets_avg = round((total_assets[y3_start] + total_assets[y3_start + 11]) / 2, 2)
    y3_equity_avg = round((capital[y3_start] + capital[y3_start + 11]) / 2, 2)

    ratios = {
        "ROE": round(y3_net_profit / y3_equity * 100, 2) if y3_equity else 0,
        "ROCE": round(y3_net_profit / (y3_equity + sum(accounts_payable[y3_start:y3_start + 12]) / 12) * 100, 2),
        "OPM": round(y3_net_profit / y3_revenue * 100, 2) if y3_revenue else 0,
        "GPM": round((y3_revenue - y3_cogs) / y3_revenue * 100, 2) if y3_revenue else 0,
        "BalanceCheck": round(total_assets[y3_start + 11] - total_liabilities[y3_start + 11], 2),
    }

    # === 6. Break-even ===
    monthly_fixed = a.payroll + a.rent + a.marketing + a.other_expenses + (a.target_revenue_per_day * 30 * a.acquiring_pct / 100)
    margin_per_order = a.avg_check - a.cost_per_order - a.logistics_per_order
    break_even_orders = round(monthly_fixed / margin_per_order) if margin_per_order > 0 else 0
    break_even_revenue = round(break_even_orders * a.avg_check, 2)

    return {
        "assumptions": a.model_dump(),
        "pnl": {
            "revenue": revenue,
            "acquiring": acquiring,
            "net_revenue": net_revenue,
            "cost_of_goods": cost_of_goods,
            "payroll": payroll,
            "logistics": logistics,
            "marketing": marketing,
            "rent": rent,
            "other": other,
            "total_expenses": total_expenses,
            "profit_before_tax": profit_before_tax,
            "tax": tax,
            "net_profit": net_profit,
            "cumulative_profit": cumulative_profit,
        },
        "cashflow": {
            "operating_inflow": operating_inflow,
            "operating_outflow": operating_outflow,
            "net_operating": net_operating,
            "investing": investing,
            "financing": financing,
            "cash_start": cash_start,
            "cash_end": cash_end,
            "net_cashflow": net_cashflow,
        },
        "balance_sheet": {
            "cash": cash,
            "inventory": inventory,
            "fixed_assets": fixed_assets,
            "total_assets": total_assets,
            "capital": capital,
            "accounts_payable": accounts_payable,
            "total_liabilities": total_liabilities,
        },
        "ratios": ratios,
        "break_even": {
            "monthly_fixed": round(monthly_fixed, 2),
            "break_even_orders": break_even_orders,
            "break_even_revenue": break_even_revenue,
        },
    }
