"""ФЭМ-ассистент — Backend API (FastAPI)"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from io import BytesIO

from calculations.models import Assumptions
from calculations.engine import run_calculation
from calculations.excel_export import generate_excel

app = FastAPI(title="ФЭМ-ассистент API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "service": "ФЭМ-ассистент"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.post("/api/calculate")
def calculate(a: Assumptions):
    """Расчёт ФЭМ на основе assumptions"""
    try:
        result = run_calculation(a)
        return {"status": "ok", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/excel")
def export_excel(a: Assumptions):
    """Скачать Excel-файл с формулами"""
    try:
        result = run_calculation(a)
        excel_data = generate_excel(a, result)
        return StreamingResponse(
            BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=fem_model.xlsx"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
