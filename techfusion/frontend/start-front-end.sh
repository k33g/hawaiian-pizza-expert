#!/bin/sh
pip3 install -r requirements.txt
export BACKEND_SERVICE_URL=http://0.0.0.0:5050
python3 -m streamlit run app.py

