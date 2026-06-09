"""Core financial engine — Python port of ФЭМ v6 Excel logic"""
from typing import List, Dict, Any, Optional
from .models import Assumptions



def pct(x: float) -> float:
    if abs(x) >= 1:
        return x / 100.0
    return x

def inflation_rate(x: float) -> float:
    if x > 0.1:
        return x / 100.0
    return x

def run_calculation(a: Assumptions) -> Dict[str, Any]:
    a_dict = a.model_dump() if hasattr(a, 'model_dump') else a.dict()
    return run_calculation_dict(a_dict)

def run_calculation_dict(a: Dict) -> Dict[str, Any]:
    """Main calculation entry point. Takes Assumptions dict, returns all sheets."""
    MONTHS = int(a.get('months', 36))
    INF = inflation_rate(float(a.get('monthly_inflation', 0)))

    # === Helper: ramp-up coefficient ===
    RAMP_COEFFS = [0.05, 0.10, 0.18, 0.28, 0.40, 0.55, 0.72, 0.85]
    def ramp(m: int) -> float:
        if m < 8:
            return RAMP_COEFFS[m]
        return 1.0

    T = float(a.get('target_orders', 0))
    S = float(a.get('start_orders', 0))

    # === Products ===
    products = a.get('products', [])
    if not products or not isinstance(products, list) or len(products) == 0:
        # Fallback: one product from flat fields
        our_price = float(a.get('our_price', 0))
        purchase_cost = float(a.get('purchase_cost', 0))
        delivery_to_client = float(a.get('delivery_to_client', 0))
        delivery_cost = float(a.get('delivery_cost', 0))
        discount_pct = pct(float(a.get('discount_pct', 0)))

        if T == 0 and S == 0:
            T = float(a.get('target_orders', a.get('targetOrders', 320)))
            S = float(a.get('start_orders', a.get('startOrders', 15)))
        if our_price == 0:
            our_price = float(a.get('our_price', 10350))

        def orders_month(m: int) -> float:
            coeff = RAMP_COEFFS[m] if m < 8 else 1.0
            season = 1.0
            return round(T * coeff + (1 - coeff) * S) * season

        O = [orders_month(m) for m in range(MONTHS)]
        discount = round(our_price * discount_pct, 2)
        revenue = [round(q * (our_price + delivery_to_client), 2) for q in O]
        purchase = [round(q * purchase_cost * (1+INF)**m, 2) for m, q in enumerate(O)]
        delivery_cogs = [round(q * delivery_cost * (1+INF)**m, 2) for m, q in enumerate(O)]
    else:
        # Revenue per product — quantity in UNITS PER DAY
        revenue = [0.0] * MONTHS
        purchase = [0.0] * MONTHS
        delivery_cogs = [0.0] * MONTHS
        acquiring = [0.0] * MONTHS
        discounts_total = [0.0] * MONTHS

        for prod in products:
            qty_day = float(prod.get('quantity', 0))  # штук в день
            if qty_day <= 0:
                continue
            monthly_qty = qty_day * 30  # → штук в месяц

            # Цена продажи — salePrice (retailPrice как fallback)
            sale_price = float(prod.get('salePrice', prod.get('retailPrice', 0)))
            # Себестоимость единицы — unitCost (cogs как fallback)
            cogs_unit = float(prod.get('unitCost', prod.get('cogs', 0)))

            # Скидка
            disc_type = prod.get('discountType')
            disc_val = float(prod.get('discountValue', 0))
            if disc_type == 'pct' and disc_val > 0:
                disc_per_month = monthly_qty * sale_price * disc_val / 100
                effective_price = sale_price * (1 - disc_val / 100)
            elif disc_type == 'rub' and disc_val > 0:
                disc_per_month = monthly_qty * disc_val
                effective_price = sale_price - disc_val
            else:
                disc_per_month = 0
                effective_price = sale_price

            # Ramp-up: плавный выход на полный объём
            ramp_months = int(prod.get('rampupMonths', 1))
            ramp_start = int(prod.get('rampupStartMonth', 1)) - 1  # 0-based

            for m in range(MONTHS):
                # Рампап: доля от полного объёма
                if m >= ramp_start and m < ramp_start + ramp_months:
                    ramp_factor = (m - ramp_start + 1) / ramp_months
                elif m < ramp_start:
                    ramp_factor = 0
                else:
                    ramp_factor = 1.0
                qty_this_month = monthly_qty * ramp_factor

                revenue[m] += round(qty_this_month * sale_price, 2)
                purchase[m] += round(qty_this_month * cogs_unit, 2)
                discounts_total[m] += round(disc_per_month * ramp_factor, 2)

    acquiring_pct = pct(float(a.get('acquiring_pct', a.get('acquiringPct', 1.5))))
    acquiring = [round(r * acquiring_pct, 2) for r in revenue]

    # === Fixed & variable expenses ===
    fixed_expenses = a.get('fixedExpenses', a.get('fixed_expenses', a.get('expenses', [])))
    FIXED_SUM = 0
    if fixed_expenses and isinstance(fixed_expenses, list):
        for e in fixed_expenses:
            if not isinstance(e, dict):
                continue
            unit = e.get('unit', 'rub')
            amount = float(e.get('value', e.get('amount', 0)) or 0)
            if unit == 'pcs':
                amount = amount * float(e.get('pricePerUnit', 0) or 0)
            FIXED_SUM += amount
    FIXED_SUM += float(a.get('payroll', 0))
    FIXED_SUM += float(a.get('rent', 0))
    FIXED_SUM += float(a.get('other_expenses', 0))

    # Variable expenses from varExpenses
    var_expenses = a.get('varExpenses', a.get('var_expenses', []))
    variable_extra = [0.0] * MONTHS

    # Build a lookup: product id → product data
    products_by_idx = {}
    for i, p in enumerate(products):
        pid = f"prod_{i}"
        products_by_idx[pid] = p

    # Helper to get ramped monthly qty for a product
    def _ramped_qty(prod, month):
        qty_day = float(prod.get('quantity', 0))
        if qty_day <= 0:
            return 0
        monthly_qty = qty_day * 30
        ramp_months = int(prod.get('rampupMonths', 1))
        ramp_start = int(prod.get('rampupStartMonth', 1)) - 1
        if month >= ramp_start and month < ramp_start + ramp_months:
            ramp_factor = (month - ramp_start + 1) / ramp_months
        elif month < ramp_start:
            ramp_factor = 0
        else:
            ramp_factor = 1.0
        return monthly_qty * ramp_factor

    def _ramped_revenue(prod, month):
        qty = _ramped_qty(prod, month)
        price = float(prod.get('salePrice', prod.get('retailPrice', 0)))
        return qty * price

    if var_expenses and isinstance(var_expenses, list):
        for e in var_expenses:
            if not isinstance(e, dict):
                continue
            unit = e.get('unit', e.get('type', ''))
            val = float(e.get('value', e.get('amount', 0)) or 0)
            if val == 0:
                continue

            scope = e.get('scope', '')
            target_product_id = e.get('productId', None)

            # Find target product if scope=product
            target_prod = None
            if scope == 'product' and target_product_id:
                for p in products:
                    if p.get('id') == target_product_id:
                        target_prod = p
                        break

            if unit in ('pct', 'revenue_pct'):
                for m in range(MONTHS):
                    if target_prod:
                        # % от выручки конкретного продукта с рампапом
                        base = _ramped_revenue(target_prod, m)
                    elif scope == 'all_revenue':
                        # % от всей выручки
                        base = revenue[m] if products else 0
                    else:
                        base = 0  # unknown scope, skip
                    variable_extra[m] += round(base * val / 100, 2)
            elif unit in ('rub_per_unit', 'rub_unit'):
                for m in range(MONTHS):
                    if target_prod:
                        # ₽ за штуку конкретного продукта с рампапом
                        monthly_qty = _ramped_qty(target_prod, m)
                    elif scope == 'all_revenue':
                        # ₽/шт по общему количеству
                        monthly_qty = sum(_ramped_qty(p, m) for p in products)
                    else:
                        monthly_qty = 0
                    variable_extra[m] += val * monthly_qty
            else:
                # Фикс сумма в месяц
                for m in range(MONTHS):
                    variable_extra[m] += val

    # Net revenue (after discounts)
    net_revenue = [round(revenue[m] - discounts_total[m], 2) if products else revenue[m] for m in range(MONTHS)]

    # Total variable costs
    total_var = [round(purchase[m] + variable_extra[m], 2) for m in range(MONTHS)]

    # Gross profit
    gross_profit = [round(net_revenue[m] - purchase[m] - variable_extra[m], 2) for m in range(MONTHS)]

    # Fixed costs (spread over months, apply inflation)
    # Fixed costs (без ФОТ — он под ФОТ + налоги отдельно)
    fixed_costs = [round(FIXED_SUM * (1+INF)**m, 2) for m in range(MONTHS)]

    # Staff & payroll
    staff = a.get('staff', [])
    staff_total = 0
    for s in staff:
        if isinstance(s, dict):
            salary = float(s.get('salary', 0))
            count = float(s.get('headcount', s.get('count', 1)))
            staff_total += salary * count

    if not staff:
        # NO staff → zero payroll
        salary_monthly = [0.0] * MONTHS
        payroll_taxes_monthly = [0.0] * MONTHS
        payroll_monthly = [0.0] * MONTHS
    else:
        payroll_tax_rate = 0.15  # 15% для МСП (сверх МРОТ) или 30% для общих
        insurance_fixed = float(a.get('ip_fixed_contrib', a.get('insurance_fixed', 59700)))
        insurance_1pct = float(a.get('ip_extra_contrib', a.get('ipExtraContrib', a.get('insurance_1pct', 0))))
        # ФОТ без налогов
        salary_monthly = [round(staff_total * (1+INF)**m, 2) for m in range(MONTHS)]
        # Налоги с ФОТ + страховые ИП
        payroll_taxes_monthly = [round(staff_total * payroll_tax_rate * (1+INF)**m + insurance_fixed/12 + insurance_1pct/12, 2) for m in range(MONTHS)]
        # Payroll total = ФОТ + налоги
        payroll_monthly = [round(salary_monthly[m] + payroll_taxes_monthly[m], 2) for m in range(MONTHS)]

    # Total fixed = fixed_costs (без ФОТ) + payroll (с налогами)
    total_fixed = [round(fixed_costs[m] + payroll_monthly[m], 2) for m in range(MONTHS)]

    # === Investments with amortization (must be before net_profit) ===
    raw_investments = a.get('investments', a.get('customInvestments', a.get('investments_list', [])))
    if not isinstance(raw_investments, list):
        raw_investments = []

    investing = [0.0] * MONTHS
    amortization = [0.0] * MONTHS
    total_inv_cost = 0.0

    for inv in raw_investments:
        if not isinstance(inv, dict):
            continue
        inv_amount = float(inv.get('amount', inv.get('value', 0)) or 0)
        if inv_amount <= 0:
            continue
        start_month = int(inv.get('startMonth', inv.get('month', 1))) - 1
        amort_months = int(inv.get('amortMonths', inv.get('depreciation', 36)))
        if amort_months < 1:
            amort_months = 12
        if 0 <= start_month < MONTHS:
            investing[start_month] -= inv_amount
        total_inv_cost += inv_amount
        monthly_amort = round(inv_amount / amort_months, 2)
        for am in range(amort_months):
            idx = start_month + am
            if idx < MONTHS:
                amortization[idx] += monthly_amort

    # EBITDA
    ebitda = [round(gross_profit[m] - total_fixed[m], 2) for m in range(MONTHS)]

    # Tax — only if taxSystem is explicitly provided
    tax_system = a.get('taxSystem', a.get('tax_system', None))
    if tax_system is None:
        tax = [0.0] * MONTHS
    else:
        usn_type = a.get('usnType', a.get('usn_type', 'income_minus_expenses'))
        if usn_type in ('income', 'income_minus_expenses'):
            rate = 0.06 if usn_type == 'income' else 0.15
            min_tax_rate = 0.01
        else:
            rate = float(a.get('taxRate', a.get('tax_rate', 0.2)))
            min_tax_rate = 0.01
        tax = []
        for m in range(MONTHS):
            if usn_type == 'income':
                t = max(revenue[m] * rate, 0)
            else:
                t = max(ebitda[m] * rate, revenue[m] * min_tax_rate, 0)
            tax.append(round(t, 2))

    # Net profit
    net_profit = [round(ebitda[m] - amortization[m] - tax[m], 2) for m in range(MONTHS)]
    cumulative = []
    running = 0.0
    for p in net_profit:
        running += p
        cumulative.append(round(running, 2))

    ebitda_margin = [round(ebitda[m] / revenue[m] * 100, 2) if revenue[m] > 0 else 0 for m in range(MONTHS)]

    # === Cash Flow ===
    op_inflow = revenue
    op_outflow = [round(purchase[m] + variable_extra[m] + fixed_costs[m] + tax[m], 2) for m in range(MONTHS)]
    net_op = [round(op_inflow[m] - op_outflow[m], 2) for m in range(MONTHS)]

    # Financing
    financing = [0.0] * MONTHS
    cash_start = [0.0] * MONTHS
    cash_end = [0.0] * MONTHS

    for m in range(MONTHS):
        cf = net_op[m] + investing[m]
        start = cash_end[m - 1] if m > 0 else 0
        if start + cf < 0:
            financing[m] = round(-(start + cf), 2)
        cash_start[m] = round(start, 2)
        cash_end[m] = round(start + cf + financing[m], 2)

    net_cf = [round(cash_end[m] - cash_start[m], 2) for m in range(MONTHS)]

    # === Balance Sheet ===
    ar_days = float(a.get('customer_deferral', a.get('customerDeferral', a.get('accountsReceivableDays', 0))))
    ap_days = float(a.get('supplier_deferral', a.get('supplierDeferral', a.get('accountsPayableDays', 0))))
    inv_days = float(a.get('inventory_days', a.get('inventoryDays', 30)))

    ar = [round(revenue[m] * ar_days / 30, 2) for m in range(MONTHS)]
    ap = [round(purchase[m] * ap_days / 30, 2) for m in range(MONTHS)]
    inventory = [round(purchase[m] * inv_days / 30, 2) for m in range(MONTHS)]

    # Fixed assets = purchase cost - accumulated amortization
    accum_amort = 0.0
    fixed_assets = []
    for m in range(MONTHS):
        accum_amort += amortization[m]
        fa = round(max(total_inv_cost - accum_amort, 0), 2)
        fixed_assets.append(fa)

    total_assets = [round(cash_end[m] + inventory[m] + fixed_assets[m] + ar[m], 2) for m in range(MONTHS)]
    # Capital = total assets - accounts payable (собственные средства = активы - обязательства)
    capital = [round(total_assets[m] - ap[m], 2) for m in range(MONTHS)]
    total_liabilities = [round(capital[m] + ap[m], 2) for m in range(MONTHS)]

    # === Ratios (year 3 = last 12 months) ===
    # Ratios — берём последний доступный год (или весь период)
    y_start = max(0, MONTHS - 12)
    y_len = min(12, MONTHS)
    y_rev = sum(revenue[y_start:y_start+y_len])
    y_np = sum(net_profit[y_start:y_start+y_len])
    y_cogs = sum(purchase[y_start:y_start+y_len])
    y_assets_avg = (total_assets[y_start] + total_assets[-1]) / 2
    y_equity_avg = (capital[y_start] + capital[-1]) / 2

    ratios = {
        "ROE": round(y_np / y_equity_avg * 100, 2) if y_equity_avg else 0,
        "OPM": round(y_np / y_rev * 100, 2) if y_rev else 0,
        "GPM": round((y_rev - y_cogs) / y_rev * 100, 2) if y_rev else 0,
        "BalanceCheck": round(total_assets[-1] - total_liabilities[-1], 2),
    }

    # === Break-even ===
    avg_payroll = sum(payroll_monthly) / MONTHS
    avg_fixed = FIXED_SUM + avg_payroll + sum(acquiring) / MONTHS
    total_monthly_qty_sold = sum(revenue[m] * 0  for m in range(MONTHS))  # dummy — перепишем
    # margin per unit: средняя маржа на единицу товара (≈ средний чек - себест)
    total_units = 0
    total_margin = 0
    if products:
        for prod in products:
            qty_day = float(prod.get('quantity', 0))
            if qty_day <= 0: continue
            monthly_qty = qty_day * 30
            sale_price = float(prod.get('salePrice', prod.get('retailPrice', 0)))
            cogs_unit = float(prod.get('unitCost', prod.get('cogs', 0)))
            disc_type = prod.get('discountType')
            disc_val = float(prod.get('discountValue', 0))
            if disc_type == 'pct' and disc_val > 0:
                eff_price = sale_price * (1 - disc_val / 100)
            elif disc_type == 'rub' and disc_val > 0:
                eff_price = sale_price - disc_val
            else:
                eff_price = sale_price
            total_units += monthly_qty
            total_margin += (eff_price - cogs_unit) * monthly_qty
    margin_per_unit = total_margin / max(total_units, 1)
    be_orders = round(avg_fixed / margin_per_unit) if margin_per_unit > 0 else 0

    return {
        "assumptions": a,
        "pnl": {
            "revenue": revenue,
            "purchase_cogs": purchase,
            "variable_extra": variable_extra,
            "gross_profit": gross_profit,
            "gross_margin": [round(gross_profit[m] / net_revenue[m] * 100, 2) if net_revenue[m] > 0 else 0 for m in range(MONTHS)],
            "fixed_costs": fixed_costs,
            "salary": salary_monthly,
            "payroll_taxes": payroll_taxes_monthly,
            "payroll_total": payroll_monthly,
            "total_fixed": total_fixed,
            "amortization": amortization,
            "ebitda": ebitda,
            "ebitda_margin": ebitda_margin,
            "tax": tax,
            "net_profit": net_profit,
            "cumulative_profit": cumulative,
            "discounts_total": discounts_total if products else [],
            "net_revenue": net_revenue,
            "total_variable": total_var,
        },
        "cashflow": {
            "operating_inflow": op_inflow,
            "operating_outflow": op_outflow,
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
            "receivables": ar,
            "fixed_assets": fixed_assets,
            "total_assets": total_assets,
            "capital": capital,
            "accounts_payable": ap,
            "total_liabilities": total_liabilities,
        },
        "ratios": ratios,
        "break_even": {
            "monthly_fixed": round(avg_fixed, 2),
            "break_even_orders": be_orders,
            "margin_per_unit": round(margin_per_unit, 2),
        },
    }
