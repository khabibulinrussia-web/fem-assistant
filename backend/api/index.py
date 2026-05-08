"""Self-contained Vercel Python Serverless — no external files needed"""
from mangum import Mangum
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict

app = FastAPI(title="ФЭМ API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

MONTHS = 36

class RequestBody(BaseModel):
    assumptions: Dict[str, Any]

@app.post("/api/calculate")
def calculate(req: RequestBody):
    try:
        a = req.assumptions
        return run(a)
    except Exception as e:
        raise HTTPException(400, detail=str(e))

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "self-contained-2"}

def run(a: Dict) -> Dict:
    def ramp(m: int) -> float:
        if m < 1: return 0.0
        return float(a.get('ramp_month_1', 0.85)) if m == 1 else float(a.get('ramp_month_2', 0.90)) if m == 2 else float(a.get('ramp_month_3', 1.0))

    tgt = float(a.get('target_revenue_per_day', 0))
    avg_check = float(a.get('avg_check', 0))
    orders_pd = float(a.get('orders_per_day', 0))
    cost_po = float(a.get('cost_per_order', 0))
    acq_pct = float(a.get('acquiring_pct', 1.5))
    pa = float(a.get('payroll', 0))
    ma = float(a.get('marketing', 0))
    re = float(a.get('rent', 0))
    lo = float(a.get('logistics_per_order', 0))
    oe = float(a.get('other_expenses', 0))
    reg = float(a.get('reg_ip', 0))
    eq = float(a.get('equipment', 0))
    tr = float(a.get('tax_rate', 0.15))
    ts = str(a.get('tax_system', 'USN_15'))

    daily_rev = [tgt * ramp(m) for m in range(1, MONTHS + 1)]
    orders_d = [orders_pd * 30 * ramp(m) for m in range(1, MONTHS + 1)]
    revenue = [round(d * 30, 2) for d in daily_rev]
    acq = [round(rv * acq_pct / 100, 2) for rv in revenue]
    net_rev = [round(revenue[i] - acq[i], 2) for i in range(MONTHS)]
    cogs = [round(orders_d[i] * cost_po, 2) for i in range(MONTHS)]
    pay = [pa] * MONTHS
    logi = [round(orders_d[i] * lo, 2) for i in range(MONTHS)]
    mkt = [ma] * MONTHS
    rnt = [re] * MONTHS
    oth = [oe] * MONTHS
    total_exp = [round(cogs[i] + pay[i] + logi[i] + mkt[i] + rnt[i] + oth[i], 2) for i in range(MONTHS)]
    pbt = [round(net_rev[i] - total_exp[i], 2) for i in range(MONTHS)]

    if ts == 'USN_6':
        tax = [round(max(revenue[i] * 0.06, 0), 2) for i in range(MONTHS)]
    elif ts == 'USN_15':
        tax = [round(max(pbt[i] * tr, 0), 2) for i in range(MONTHS)]
    else:
        tax = [round(max(pbt[i] * 0.20, 0), 2) for i in range(MONTHS)]

    np = [round(pbt[i] - tax[i], 2) for i in range(MONTHS)]
    cum = [0.0] * MONTHS
    s = 0.0
    for i in range(MONTHS):
        s += np[i]
        cum[i] = round(s, 2)

    inv = reg + eq
    op_in = revenue
    op_out = [round(cogs[i] + acq[i] + pay[i] + logi[i] + mkt[i] + rnt[i] + oth[i] + tax[i], 2) for i in range(MONTHS)]
    net_op = [round(op_in[i] - op_out[i], 2) for i in range(MONTHS)]
    investing = [-inv] + [0.0] * (MONTHS - 1)
    financing = [0.0] * MONTHS
    cash_start = [0.0] * MONTHS
    cash_end = [0.0] * MONTHS
    net_cf = [0.0] * MONTHS

    first_gap = net_op[0] + investing[0]
    if first_gap < 0:
        financing[0] = -first_gap
    net_cf[0] = net_op[0] + investing[0] + financing[0]
    cash_end[0] = net_cf[0]
    for i in range(1, MONTHS):
        cash_start[i] = cash_end[i-1]
        net_cf[i] = net_op[i] + investing[i] + financing[i]
        cash_end[i] = cash_start[i] + net_cf[i]

    depr = round(eq / 60 if eq > 0 else 0, 2)
    fa = [eq]
    for i in range(1, MONTHS):
        fa.append(round(fa[-1] - depr, 2))

    bs_cap = [cum[i] + inv for i in range(MONTHS)]
    bs_ta = [round(cash_end[i] + 0 + fa[i], 2) for i in range(MONTHS)]
    bs_tl = [round(bs_cap[i] + 0, 2) for i in range(MONTHS)]

    y1_rev = sum(revenue[:12])
    y1_np = sum(np[:12])
    y1_cogs = sum(cogs[:12])
    y1_op = sum(net_op[:12])
    avg_equity = (bs_cap[0] + bs_cap[11]) / 2 if bs_cap[0] != 0 else bs_cap[11]

    return {
        "assumptions": a,
        "pnl": {
            "revenue": revenue, "acquiring": acq, "net_revenue": net_rev,
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
            "cash": cash_end, "inventory": [0.0] * MONTHS, "fixed_assets": fa,
            "total_assets": bs_ta, "capital": bs_cap,
            "accounts_payable": [0.0] * MONTHS, "total_liabilities": bs_tl
        },
        "ratios": {
            "ROE": round(y1_np / avg_equity * 100, 2) if avg_equity else 0,
            "GPM": round((y1_rev - y1_cogs) / y1_rev * 100, 2) if y1_rev else 0,
            "OPM": round(y1_op / y1_rev * 100, 2) if y1_rev else 0,
            "Y1_Revenue": y1_rev,
            "Y1_NetProfit": y1_np,
        }
    }

handler = Mangum(app, lifespan="off")
