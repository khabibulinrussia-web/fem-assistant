"""ФЭМ-ассистент — Vercel Serverless API (mangum + FastAPI)"""

import json
import sys
import os

# Добавляем api/ в путь, чтобы calculations импортировались
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from io import BytesIO
from mangum import Mangum

from calculations.engine import run_calculation_dict
from calculations.engine_v2 import run_from_graph
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
async def calculate(request: Request):
    """Расчёт ФЭМ на основе assumptions."""
    try:
        body = await request.json()
        a = body.get('assumptions', body)
        if isinstance(a, dict):
            result = run_calculation_dict(a)
        else:
            result = run_calculation_dict(dict(a))
        return {"status": "ok", "data": result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v2/calculate")
async def calculate_v2(request: Request):
    """Новый API: принимает граф блоков."""
    try:
        body = await request.json()
        graph = body.get('graph', body)
        result = run_from_graph(graph)
        return {"status": "ok", "data": result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/excel")
async def export_excel(request: Request):
    """Скачать Excel-файл с формулами."""
    try:
        body = await request.json()
        a = body.get('assumptions', body)
        if isinstance(a, dict):
            result = run_calculation_dict(a)
        else:
            result = run_calculation_dict(dict(a))
        excel_data = generate_excel(a, result)
        return StreamingResponse(
            BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=fem_model.xlsx"},
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))


# Handler for Vercel
handler = Mangum(app, lifespan="off")
