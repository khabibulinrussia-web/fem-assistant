"""ФЭМ-ассистент v6 engine — точная копия Excel P&L/Cash Flow/Balance Sheet
Форма присылает значения в человеческом формате:
- проценты: 5 (а не 0.05), 0.4 (а не 0.004), 15 (а не 0.15)
- рубли: 10350, 8020, 50000
Engine конвертирует проценты автоматически.
"""
from typing import Dict, Any

MONTHS = 36
RAMP_COEFFS = [0.05, 0.10, 0.18, 0.28, 0.40, 0.55, 0.72, 0.85]

def pct(x: float) -> float:
    """Конвертирует процентное значение (5 → 0.05, 0.4 → 0.004)"""
    if abs(x) >= 1:  # 5 → 0.05, 15 → 0.15
        return x / 100.0
    return x  # уже дробь (0.05)

def inflation_rate(x: float) -> float:
    """Инфляция: 0.4% → 0.004. Если пришло 0.004, тоже ок."""
    if x > 0.1:  # это проценты
        return x / 100.0
    return x

def run_calculation(a: Dict) -> Dict:
    """1:1 расчёт по формулам Excel v6"""

    # === Assumptions ===
    T = float(a.get('target_orders', 320))
    S = float(a.get('start_orders', 15))
    
    our_price = float(a.get('our_price', 10350))
    discount_pct = pct(float(a.get('discount_pct', 5)))
    purchase_cost = float(a.get('purchase_cost', 8020))
    delivery_to_client = float(a.get('delivery_to_client', 500))
    delivery_cost = float(a.get('delivery_cost', 350))
    
    INF = inflation_rate(float(a.get('monthly_inflation', 0.4)))
    
    # Расходы (берём из данных формы)
    rent_storage = float(a.get('rent_storage', 0))
    internet_phone = float(a.get('internet_phone', 3000))
    hosting = float(a.get('hosting', 1500))
    software = float(a.get('software', 5000))
    ad_target = float(a.get('ad_target', 0))
    ad_context = float(a.get('ad_context', 0))
    banking = float(a.get('banking', 6000))
    other_expenses = float(a.get('other_expenses', 10000))
    insurance_fixed = float(a.get('insurance_fixed', 4300))
    
    FIXED_SUM = rent_storage + internet_phone + hosting + software + ad_target + ad_context + banking + other_expenses + insurance_fixed
    
    # Инвестиции
    reg_ip = float(a.get('reg_ip', 5000))
    website_cost = float(a.get('website_cost', 0))
    vk_app = float(a.get('vk_app', 0))
    first_purchase = float(a.get('first_purchase', 0))
    equipment_cost = float(a.get('equipment_cost', 0))
    reserve = float(a.get('reserve_fund', 50000))
    INVEST = reg_ip + website_cost + vk_app + first_purchase + equipment_cost + reserve
    
    # Налоги
    USN_RATE = pct(float(a.get('usn_rate', 15)))
    MIN_TAX = pct(float(a.get('min_tax_rate', 1)))
    
    def orders_month(m: int) -> int:
        """Заказы по формуле Excel: ROUND((T*coeff+(1-coeff)*S)*season,0)"""
        coeff = RAMP_COEFFS[m] if m < 8 else 1.0
        season_map = {0: 1.0, 1: 0.9, 2: 0.9, 3: 1.0, 4: 1.0, 5: 1.0,
                      6: 0.85, 7: 0.85, 8: 1.0, 9: 1.0, 10: 1.0, 11: 1.0}
        season = season_map.get(m % 12, 1.0)
        return round((T * coeff + (1 - coeff) * S) * season, 0)

    O = [orders_month(m) for m in range(MONTHS)]
    discount = round(our_price * discount_pct, 2)

    # === P&L ===
    revenue = [round(q * (our_price + delivery_to_client), 2) for q in O]
    purchase = [round(q * purchase_cost * (1+INF)**m, 2) for m, q in enumerate(O)]
    delivery_cogs = [round(q * delivery_cost * (1+INF)**m, 2) for m, q in enumerate(O)]
    acquiring = [0.0] * MONTHS
    total_var = [round(purchase[i] + delivery_cogs[i] + acquiring[i], 2) for i in range(MONTHS)]
    gross_profit = [round(revenue[i] - total_var[i], 2) for i in range(MONTHS)]
    gp_margin = [round(gross_profit[i] / revenue[i], 4) if revenue[i] > 0 else 0 for i in range(MONTHS)]
    
    fixed_costs = [round(FIXED_SUM * (1 + INF) ** m, 2) for m in range(MONTHS)]
    marketing = [0.0] * MONTHS
    total_fixed = [round(fixed_costs[i] + marketing[i], 2) for i in range(MONTHS)]
    ebitda = [round(gross_profit[i] - total_fixed[i], 2) for i in range(MONTHS)]
    tax = [round(max(ebitda[i] * USN_RATE, revenue[i] * MIN_TAX), 2) for i in range(MONTHS)]
    net_profit = [round(ebitda[i] - tax[i], 2) for i in range(MONTHS)]
    profitability = [round(net_profit[i] / revenue[i], 4) if revenue[i] > 0 else 0 for i in range(MONTHS)]
    
    cum = 0.0
    cumulative_profit = []
    for i in range(MONTHS):
        cum += net_profit[i]
        cumulative_profit.append(round(cum, 2))

    # === Cash Flow ===
    op_inflow = revenue
    supplier_payments = [round(purchase[i] + delivery_cogs[i], 2) for i in range(MONTHS)]
    op_expenses = total_fixed
    tax_payments = tax
    net_op = [round(op_inflow[i] - supplier_payments[i] - op_expenses[i] - tax_payments[i], 2) for i in range(MONTHS)]
    
    investing = [0.0] * MONTHS
    investing[0] = -reg_ip
    financing = [0.0] * MONTHS
    financing[0] = reserve
    
    net_cf = [round(net_op[i] + investing[i] + financing[i], 2) for i in range(MONTHS)]
    cash_start = [0.0] * MONTHS
    cash_end = [0.0] * MONTHS
    cash_start[0] = 0.0
    cash_end[0] = round(cash_start[0] + net_cf[0], 2)
    for i in range(1, MONTHS):
        cash_start[i] = cash_end[i-1]
        cash_end[i] = round(cash_start[i] + net_cf[i], 2)

    # === Balance Sheet ===
    inv_days = int(a.get('inventory_turnover', 10))
    inventory = [round(purchase[i] * inv_days / 30, 2) for i in range(MONTHS)]
    ar = [0.0] * MONTHS
    total_assets = [round(cash_end[i] + inventory[i] + ar[i], 2) for i in range(MONTHS)]
    capital = [round(INVEST + cumulative_profit[i], 2) for i in range(MONTHS)]
    ap_days = int(a.get('payables_days', 30))
    ap = [round((purchase[i] + delivery_cogs[i]) * ap_days / 30, 2) for i in range(MONTHS)]
    total_l = [round(capital[i] + ap[i], 2) for i in range(MONTHS)]
    balance_check = [round(total_assets[i] - total_l[i], 2) for i in range(MONTHS)]

    # === Ratios ===
    y3 = 24
    y3_rev = sum(revenue[y3:y3+12])
    y3_np = sum(net_profit[y3:y3+12])
    y3_gp = sum(gross_profit[y3:y3+12])
    y3_eb = sum(ebitda[y3:y3+12])
    y3_pur = sum(purchase[y3:y3+12])
    cap_end = capital[y3+11]
    ap_end = ap[y3+11]
    ta_end = total_assets[y3+11]
    cash_y3 = cash_end[y3+11]
    avg_inv = (inventory[y3] + inventory[y3+11]) / 2 or 1
    roe = round(y3_np / cap_end * 100, 2) if cap_end else 0
    roce = round(y3_eb / (cap_end + ap_end) * 100, 2) if (cap_end + ap_end) else 0
    opm = round(y3_eb / y3_rev * 100, 2) if y3_rev else 0
    gpm = round(y3_gp / y3_rev * 100, 2) if y3_rev else 0
    inv_turn = round(y3_pur / avg_inv, 2) if avg_inv else 0
    curr_ratio = round(ta_end / ap_end, 2) if ap_end else 999
    acid_test = round(cash_y3 / ap_end, 2) if ap_end else 999
    gearing = round(ap_end / cap_end * 100, 2) if cap_end else 0
    payback = round(INVEST / (y3_np / 12), 1) if y3_np else 0
    margin_per_bag = our_price - discount - purchase_cost - delivery_cost
    avg_fixed = round(sum(total_fixed[:12]) / 12, 2)
    be_orders = round(avg_fixed / margin_per_bag) if margin_per_bag > 0 else 0

    return {
        "orders": [int(q) for q in O],
        "pnl": {
            "revenue": revenue,
            "purchase_cogs": purchase,
            "delivery_cogs": delivery_cogs,
            "acquiring": acquiring,
            "total_variable": total_var,
            "gross_profit": gross_profit,
            "gross_margin": gp_margin,
            "fixed_costs": fixed_costs,
            "marketing": marketing,
            "total_fixed": total_fixed,
            "ebitda": ebitda,
            "tax": tax,
            "net_profit": net_profit,
            "profitability": profitability,
            "cumulative_profit": cumulative_profit,
        },
        "cashflow": {
            "operating_inflow": op_inflow,
            "supplier_payments": supplier_payments,
            "op_expenses": op_expenses,
            "tax_payments": tax_payments,
            "net_operating": net_op,
            "investing": investing,
            "financing": financing,
            "cash_start": cash_start,
            "cash_end": cash_end,
            "net_cashflow": net_cf,
        },
        "balance_sheet": {
            "cash": cash_end,
            "inventory": inventory,
            "accounts_receivable": ar,
            "total_assets": total_assets,
            "capital": capital,
            "accounts_payable": ap,
            "total_liabilities": total_l,
            "balance_check": balance_check,
        },
        "ratios": {
            "ROE": roe, "ROCE": roce, "OPM": opm, "GPM": gpm,
            "InventoryTurnover": inv_turn,
            "CurrentRatio": curr_ratio, "AcidTest": acid_test,
            "GearingRatio": gearing, "PaybackMonths": payback,
        },
        "break_even": {
            "monthly_fixed": avg_fixed,
            "margin_per_bag": round(margin_per_bag, 2),
            "break_even_orders": be_orders,
        },
        "calculated": {
            "discount": discount,
            "total_investments": INVEST,
        }
    }
