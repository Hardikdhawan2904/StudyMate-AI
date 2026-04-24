import sys
import os

# Add backend root to path so `from main import app` resolves correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app
