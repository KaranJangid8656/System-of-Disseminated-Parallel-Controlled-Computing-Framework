@echo off
echo [DPCC] Initializing Python Research Environment...
cd python_engine
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
echo [DPCC] Research Engine Starting on port 8000...
python main.py
