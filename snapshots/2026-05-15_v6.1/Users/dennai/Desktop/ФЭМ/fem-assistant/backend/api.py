"""FastAPI backend for FEM-assistant deployed on Vercel"""
import json
from typing import Any, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'calculations'))
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
    return {"status": "ok"}
