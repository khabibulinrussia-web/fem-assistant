import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'calculations'))
from mangum import Mangum
from fastapi import FastAPI
from models import Assumptions
from engine import run_calculation

app = FastAPI()

@app.get("/debug")
def debug():
    # Test creating model with 50000
    a = Assumptions(target_revenue_per_day=50000, avg_check=1500)
    return {
        "target_revenue_per_day": a.target_revenue_per_day,
        "file_path": __file__,
        "models_file": os.path.join(os.path.dirname(__file__), 'calculations', 'models.py'),
        "models_exists": os.path.exists(os.path.join(os.path.dirname(__file__), 'calculations', 'models.py')),
    }

handler = Mangum(app, lifespan="off")
