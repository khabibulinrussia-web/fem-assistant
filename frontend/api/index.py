"""Vercel Python Serverless function entry point"""
import sys
import os

# Add the calculations directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'calculations'))

from engine import run_calculation
from models import Assumptions

from mangum import Mangum
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict

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

@app.post("/")
def calculate(req: CalculateRequest):
    try:
        a = Assumptions(**req.assumptions)
        result = run_calculation(a)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok"}

handler = Mangum(app, lifespan="off")
