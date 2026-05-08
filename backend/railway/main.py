"""ФЭМ-ассистент FastAPI backend — standalone для Railway"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, Optional
import uvicorn

from engine import run_calculation
from models import Assumptions

app = FastAPI(title="ФЭМ-ассистент API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CalculateRequest(BaseModel):
    assumptions: Dict[str, Any]

@app.post("/api/calculate")
def calculate(req: CalculateRequest):
    try:
        a = Assumptions(**req.assumptions)
        result = run_calculation(a)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/health")
def health():
    return {"status": "healthy"}

@app.get("/api/ping")
def ping():
    return {"status": "ok", "revenue_test": run_calculation(Assumptions(target_revenue_per_day=50000))["pnl"]["revenue"][0]}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
