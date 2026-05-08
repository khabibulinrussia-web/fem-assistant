"""Vercel Python Serverless function entry point"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from api import app

# Vercel ASGI handler
from mangum import Mangum
handler = Mangum(app)
