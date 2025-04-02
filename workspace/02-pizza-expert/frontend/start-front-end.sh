#!/bin/sh
pip3 install -r requirements.txt
export BACKEND_SERVICE_URL=http://0.0.0.0:5050

# Frontend settings
export PAGE_TITLE="🍍 The Hawaiian Pizza Guru 🍕"
export PAGE_HEADER="Made with 💖 and probably too much caffeine"
export PAGE_ICON="🤖"

python3 -m streamlit run app.py
