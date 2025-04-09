#!/bin/bash
set -o allexport; source ../.env; set +o allexport
pip3 install -r requirements.txt

# override this one (outside Docker Compose)
export BACKEND_SERVICE_URL=http://0.0.0.0:5050

echo "🌍: http://localhost:8502/"

python3 -m streamlit run app.py
