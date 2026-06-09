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
        # Products array — quantity-driven
        # quantity уже приходит как штук в месяц (фронтенд умножает на 30 если в день)
        total_monthly_qty = sum(p.get('quantity', 0) for p in products) or 1

        О = []
        for m in range(MONTHS):
            coeff = RAMP_COEFFS[m] if m < 8 else 1.0
            season = 1.0
            month_orders = round((T * coeff + (1 - coeff) * S) * season) if (T > 0 or S > 0) else 0
            if month_orders == 0:
                # Quantity-driven: quantity уже месячная
                month_orders = total_monthly_qty
            О.append(month_orders)

        # Revenue per product with discounts
        revenue = [0.0] * MONTHS
        purchase = [0.0] * MONTHS
        delivery_cogs = [0.0] * MONTHS
        acquiring = [0.0] * MONTHS
        discounts_total = [0.0] * MONTHS

        for prod in products:
            p_qty = float(prod.get('quantity', 0))
            if p_qty == 0:
                continue
            rrp = float(prod.get('retailPrice', prod.get('salePrice', 0)))
            cogs_unit = float(prod.get('cogs', 0))
            disc_type = prod.get('discountType', 'pct')
            disc_val = float(prod.get('discountValue', 0))
            disc_scope = prod.get('discountScope', 'product')

            # Calculate effective price after discount
            if disc_type == 'pct' and disc_val > 0:
                effective_price = rrp * (1 - disc_val / 100)
                disc_rub = rrp * disc_val / 100
            elif disc_type == 'rub' and disc_val > 0:
                effective_price = rrp - disc_val
                disc_rub = disc_val
            else:
                effective_price = rrp
                disc_rub = 0

            # Scale: share of this product in total qty
            share = p_qty / total_monthly_qty

            for m in range(MONTHS):
                monthly_qty = О[m] * share
                if m == 0:
                    print(f"DEBUG prod={prod.get('name','?')} rrp={rrp} eff={effective_price:.0f} disc={disc_rub:.0f} qty={p_qty} share={share:.2f}")
                revenue[m] += round(monthly_qty * effective_price, 2)
                purchase[m] += round(monthly_qty * cogs_unit * (1+INF)**m, 2)
                discounts_total[m] += round(monthly_qty * disc_rub, 2)

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
    if var_expenses and isinstance(var_expenses, list):
        for e in var_expenses:
            if not isinstance(e, dict):
                continue
            unit = e.get('unit', 'pct')
            val = float(e.get('value', e.get('amount', 0)) or 0)
            if val == 0:
                continue
            if unit == 'pct':
                apply_to = e.get('applyTo', 'all_revenue')
                for m in range(MONTHS):
                    base = revenue[m]
                    variable_extra[m] += round(base * val / 100, 2)
            else:
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

    payroll_tax_rate = 0.15  # 15% для МСП (сверх МРОТ) или 30% для общих
    insurance_fixed = float(a.get('ip_fixed_contrib', a.get('insurance_fixed', 59700)))
    insurance_1pct = float(a.get('ip_extra_contrib', a.get('ipExtraContrib', a.get('insurance_1pct', 0))))

    # Payroll total = ФОТ + налоги с ФОТ (15%) + страховые взносы ИП (годовые/12)
    payroll_monthly = [round(staff_total * (1 + payroll_tax_rate) * (1+INF)**m + insurance_fixed/12 + insurance_1pct/12, 2) for m in range(MONTHS)]

    # Total fixed = fixed_costs (без ФОТ) + payroll (с налогами)
    total_fixed = [round(fixed_costs[m] + payroll_monthly[m], 2) for m in range(MONTHS)]

    # EBITDA
    ebitda = [round(gross_profit[m] - total_fixed[m], 2) for m in range(MONTHS)]

    # Tax
    tax_system = a.get('taxSystem', a.get('tax_system', 'usn'))
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
    net_profit = [round(ebitda[m] - tax[m], 2) for m in range(MONTHS)]
    cumulative = []
    running = 0.0
    for p in net_profit:
        running += p
        cumulative.append(round(running, 2))

    ebitda_margin = [round(ebitda[m] / revenue[m] * 100, 2) if revenue[m] > 0 else 0 for m in range(MONTHS)]

    # === Cash Flow ===
    investments = float(a.get('investments', sum(
        float(a.get(k, 0)) for k in ['reg_ip', 'equipment', 'website', 'reserve_fund']
    )))

    op_inflow = revenue
    op_outflow = [round(purchase[m] + variable_extra[m] + fixed_costs[m] + tax[m], 2) for m in range(MONTHS)]
    net_op = [round(op_inflow[m] - op_outflow[m], 2) for m in range(MONTHS)]

    investing = [0.0] * MONTHS
    cust_investments = a.get('customInvestments', a.get('investments_list', []))
    if isinstance(cust_investments, list):
        for inv in cust_investments:
            if isinstance(inv, dict):
                inv_amount = float(inv.get('value', inv.get('amount', 0)) or 0)
                if inv_amount > 0:
                    inv_month = int(inv.get('month', 1)) - 1
                    if 0 <= inv_month < MONTHS:
                        investing[inv_month] -= inv_amount

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

    fixed_assets = []
    total_inv = abs(sum(investing)) + investments
    for m in range(MONTHS):
        if m == 0:
            fa = total_inv
        else:
            amort = round(fixed_assets[m - 1] * 0.02, 2)
            fa = round(max(fixed_assets[m - 1] - amort, 0), 2)
        fixed_assets.append(fa)

    total_assets = [round(cash_end[m] + inventory[m] + fixed_assets[m] + ar[m], 2) for m in range(MONTHS)]
    capital = [round(total_inv + cumulative[m], 2) for m in range(MONTHS)]
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
    margin_per_unit = sum(revenue[m] - purchase[m] - variable_extra[m] for m in range(MONTHS)) / max(sum(v for v in О), 1) if sum(v for v in О) > 0 else 0
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
            "payroll_total": payroll_monthly,
            "total_fixed": total_fixed,
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

def run_from_graph(graph: Dict) -> Dict[str, Any]:
    """
    Новая entry point: принимает граф блоков, собирает assumptions, считает.
    
    graph = {
        "blocks": [
            {"id": "b1", "type": "product", "props": {...}, "children": ["b2"], "parent": None},
            {"id": "b2", "type": "discount", "props": {...}, "children": [], "parent": "b1"},
            {"id": "b3", "type": "staff", "props": {...}, "children": [], "parent": None},
            {"id": "b4", "type": "expense_fixed", "props": {...}, "children": [], "parent": None},
            {"id": "b5", "type": "expense_var", "props": {...}, "children": [], "parent": None},
            {"id": "b6", "type": "investment", "props": {...}, "children": [], "parent": None},
            {"id": "b7", "type": "seasonality", "props": {...}, "children": [], "parent": None},
            {"id": "b8", "type": "tax", "props": {...}, "children": [], "parent": None},
            {"id": "b9", "type": "credit", "props": {...}, "children": [], "parent": None},
            {"id": "b10", "type": "ar_ap", "props": {...}, "children": [], "parent": None},
            {"id": "b11", "type": "settings", "props": {...}, "children": [], "parent": None},
        ],
        "settings": {"months": 12, ...}  # Можно ещё отдельно
    }
    """
    blocks = graph.get('blocks', [])
    settings = graph.get('settings', {})
    
    a = {}
    a['months'] = int(settings.get('months', graph.get('months', 12)))
    a['monthly_inflation'] = float(settings.get('monthly_inflation', 0))
    
    products = []
    staff_list = []
    fixed_expenses = []
    var_expenses = []
    investments = []
    
    ar_days = 0
    ap_days = 0
    inv_days = 0
    seasonality = []
    usn_type = 'income_minus_expenses'
    tax_system = 'usn'
    credit_data = {}
    
    for block in blocks:
        blk_type = block.get('type', '')
        props = block.get('props', {})
        children = block.get('children', [])
        
        if blk_type == 'product':
            prod = {
                'name': props.get('name', ''),
                'retailPrice': float(props.get('retailPrice', 0)),
                'salePrice': float(props.get('salePrice', 0)),
                'quantity': float(props.get('quantity', 0)),
                'cogs': float(props.get('unitCost', 0)),
                'qtyUnit': props.get('qtyUnit', 'month'),
            }
            # Если qtyUnit = 'day', quantity уже умножен на 30 на фронтенде
            prod['quantity'] = float(props.get('quantity', 0))
            
            # Ищем дочерние блоки: скидка, рампап
            for child_id in children:
                child = next((b for b in blocks if b['id'] == child_id), None)
                if child:
                    ctype = child.get('type', '')
                    cprops = child.get('props', {})
                    if ctype == 'discount':
                        prod['discountType'] = cprops.get('discountType', 'pct')
                        prod['discountValue'] = float(cprops.get('discountValue', 0))
                        prod['discountScope'] = cprops.get('discountScope', 'product')
                    elif ctype == 'rampup':
                        prod['rampupMonths'] = int(cprops.get('months', 3))
                        prod['rampupStart'] = int(cprops.get('startMonth', 1))
            
            products.append(prod)
        
        elif blk_type == 'staff':
            staff_list.append({
                'name': props.get('name', ''),
                'salary': float(props.get('salary', 0)),
                'count': float(props.get('count', 1)),
                'bonusType': props.get('bonusType', ''),
                'bonusValue': float(props.get('bonusValue', 0)),
            })
        
        elif blk_type == 'expense_fixed':
            fixed_expenses.append({
                'name': props.get('name', ''),
                'value': float(props.get('value', 0)),
            })
        
        elif blk_type == 'expense_var':
            var_expenses.append({
                'name': props.get('name', ''),
                'type': props.get('type', 'revenue_pct'),
                'value': float(props.get('value', 0)),
            })
        
        elif blk_type == 'investment':
            investments.append({
                'name': props.get('name', ''),
                'amount': float(props.get('amount', 0)),
                'month': int(props.get('month', 1)),
                'depreciation': int(props.get('depreciation', 0)),
            })
        
        elif blk_type == 'seasonality':
            seasonality = props.get('monthPcts', [])
            if not seasonality:
                raw = props.get('seasonality', [])
                if isinstance(raw, list):
                    seasonality = raw
        
        elif blk_type == 'tax':
            tax_system = props.get('taxSystem', 'usn')
            usn_type = props.get('usnType', 'income_minus_expenses')
        
        elif blk_type == 'ar_ap':
            ar_days = int(props.get('arDays', 0))
            ap_days = int(props.get('apDays', 0))
            inv_days = int(props.get('invDays', 0))
        
        elif blk_type == 'credit':
            credit_data = {
                'amount': float(props.get('amount', 0)),
                'rate': float(props.get('rate', 0)),
                'term': int(props.get('term', 12)),
                'month': int(props.get('month', 1)),
            }
        
        elif blk_type == 'settings':
            a['months'] = int(props.get('months', a['months']))
            a['monthly_inflation'] = float(props.get('inflation', a['monthly_inflation']))
    
    # Собираем a
    if products:
        a['products'] = products
    if staff_list:
        a['staff'] = staff_list
    if fixed_expenses:
        a['fixedExpenses'] = fixed_expenses
    if var_expenses:
        a['varExpenses'] = var_expenses
    if investments:
        a['investments'] = investments
    if seasonality:
        a['seasonality'] = seasonality
    
    a['taxSystem'] = tax_system
    a['usnType'] = usn_type
    
    # Оборачиваемость
    if ar_days > 0:
        a['ar_days'] = ar_days
    if ap_days > 0:
        a['ap_days'] = ap_days
    if inv_days > 0:
        a['inv_days'] = inv_days
    
    # Кредит
    if credit_data.get('amount', 0) > 0:
        a['credit'] = credit_data
    
    # Страховые (ИП)
    a['ip_fixed_contrib'] = float(settings.get('ipFixedContrib', settings.get('ip_fixed_contrib', 59700)))
    a['ip_extra_contrib'] = float(settings.get('ipExtraContrib', settings.get('ip_extra_contrib', 0)))
    
    # Стартовые данные (если есть в настройках)
    a['start_orders'] = 0
    a['target_orders'] = 0
    
    # Запускаем старый добрый engine с собранными assumptions
    return run_calculation_dict(a)
