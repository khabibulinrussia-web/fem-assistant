"""Self-contained Vercel Python API for FEM calculation"""
import json
from mangum import Mangum
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List

app = FastAPI(title="ФЭМ API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

MONTHS = 36

class InData(BaseModel):
    assumptions: Dict[str, Any]

@app.post("/api/calculate")
def calculate(req: InData):
    try:
        a = req.assumptions
        result = run_calc(a)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/health")
def health():
    return {"status": "ok"}

def run_calc(a: Dict) -> Dict:
    def r(m):
        if m < 1: return 0.0
        return float(a.get('ramp_month_1', 0.85)) if m == 1 else float(a.get('ramp_month_2', 0.90)) if m == 2 else float(a.get('ramp_month_3', 1.0))

    tgt = float(a.get('target_revenue_per_day', 0))
    avg_check = float(a.get('avg_check', 0))
    orders_per_day = float(a.get('orders_per_day', 0))
    cost_per_order = float(a.get('cost_per_order', 0))
    acquiring_pct = float(a.get('acquiring_pct', 1.5))
    payroll = float(a.get('payroll', 0))
    marketing = float(a.get('marketing', 0))
    rent = float(a.get('rent', 0))
    logistics_per_order = float(a.get('logistics_per_order', 0))
    other_expenses = float(a.get('other_expenses', 0))
    reg_ip = float(a.get('reg_ip', 0))
    equipment = float(a.get('equipment', 0))
    tax_rate = float(a.get('tax_rate', 0.15))
    tax_system = str(a.get('tax_system', 'USN_15'))

    daily_revenue = [tgt * r(m) for m in range(1, MONTHS + 1)]
    orders = [orders_per_day * 30 * r(m) for m in range(1, MONTHS + 1)]
    revenue = [round(d * 30, 2) for d in daily_revenue]
    acquiring = [round(rv * acquiring_pct / 100, 2) for rv in revenue]
    net_revenue = [round(revenue[i] - acquiring[i], 2) for i in range(MONTHS)]
    cogs = [round(orders[i] * cost_per_order, 2) for i in range(MONTHS)]
    pay = [payroll] * MONTHS
    logi = [round(orders[i] * logistics_per_order, 2) for i in range(MONTHS)]
    mkt = [marketing] * MONTHS
    rnt = [rent] * MONTHS
    oth = [other_expenses] * MONTHS
    total_exp = [round(cogs[i] + pay[i] + logi[i] + mkt[i] + rnt[i] + oth[i], 2) for i in range(MONTHS)]
    pbt = [round(net_revenue[i] - total_exp[i], 2) for i in range(MONTHS)]

    if tax_system == 'USN_6':
        tax = [round(max(revenue[i] * 0.06, 0), 2) for i in range(MONTHS)]
    elif tax_system == 'USN_15':
        tax = [round(max(pbt[i] * tax_rate, 0), 2) for i in range(MONTHS)]
    else:
        tax = [round(max(pbt[i] * 0.20, 0), 2) for i in range(MONTHS)]

    np = [round(pbt[i] - tax[i], 2) for i in range(MONTHS)]
    cum = []
    s = 0.0
    for p in np:
        s += p
        cum.append(round(s, 2))

    inv = reg_ip + equipment
    op_in = revenue
    op_out = [round(cogs[i] + acquiring[i] + pay[i] + logi[i] + mkt[i] + rnt[i] + oth[i] + tax[i], 2) for i in range(MONTHS)]
    net_op = [round(op_in[i] - op_out[i], 2) for i in range(MONTHS)]
    
    # Cash flow
    cash_start = [0.0] * MONTHS
    cash_end = [0.0] * MONTHS
    net_cf = [0.0] * MONTHS
    investing = [-inv] + [0.0] * (MONTHS - 1)
    financing = [0.0] * MONTHS
    
    # First month: financing covers gap
    first_gap = net_op[0] + investing[0]
    if first_gap < 0:
        financing[0] = -first_gap
    net_cf[0] = net_op[0] + investing[0] + financing[0]
    cash_end[0] = net_cf[0]
    
    for i in range(1, MONTHS):
        cash_start[i] = cash_end[i-1]
        net_cf[i] = net_op[i] + investing[i] + financing[i]
        cash_end[i] = cash_start[i] + net_cf[i]

    # Depreciation
    depr = round(equipment / 60, 2) if equipment > 0 else 0
    fa = [equipment]
    for i in range(1, MONTHS):
        fa.append(round(fa[-1] - depr, 2))

    bs_cash = cash_end
    bs_inv = [0.0] * MONTHS
    bs_fa = fa
    bs_ta = [round(bs_cash[i] + bs_inv[i] + bs_fa[i], 2) for i in range(MONTHS)]
    bs_cap = [cum[i] + inv for i in range(MONTHS)]
    bs_ap = [0.0] * MONTHS
    bs_tl = [round(bs_cap[i] + bs_ap[i], 2) for i in range(MONTHS)]

    # Ratios
    y1_rev = sum(revenue[:12])
    y1_np = sum(np[:12])
    y1_cogs = sum(cogs[:12])
    y1_op = sum(net_op[:12])
    avg_equity = (bs_cap[0] + bs_cap[11]) / 2 if bs_cap[0] != 0 else bs_cap[11]
    
    return {
        "assumptions": a,
        "pnl": {
            "revenue": revenue, "acquiring": acquiring, "net_revenue": net_revenue,
            "cost_of_goods": cogs, "payroll": pay, "logistics": logi,
            "marketing": mkt, "rent": rnt, "other": oth,
            "total_expenses": total_exp, "profit_before_tax": pbt,
            "tax": tax, "net_profit": np, "cumulative_profit": cum
        },
        "cashflow": {
            "operating_inflow": op_in, "operating_outflow": op_out,
            "net_operating": net_op, "investing": investing,
            "financing": financing, "cash_start": cash_start,
            "cash_end": cash_end, "net_cashflow": net_cf
        },
        "balance_sheet": {
            "cash": bs_cash, "inventory": bs_inv, "fixed_assets": bs_fa,
            "total_assets": bs_ta, "capital": bs_cap,
            "accounts_payable": bs_ap, "total_liabilities": bs_tl
        },
        "ratios": {
            "ROE": round(y1_np / avg_equity * 100, 2) if avg_equity else 0,
            "GPM": round((y1_rev - y1_cogs) / y1_rev * 100, 2) if y1_rev else 0,
            "OPM": round(y1_op / y1_rev * 100, 2) if y1_rev else 0,
        }
    }

handler = Mangum(app, lifespan="off")
