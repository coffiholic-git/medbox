<<<<<<< HEAD
# MedBox — run locally

MedBox consists of three connected layers:

- **Frontend:** React + Vite in `medbox-frontendv1/medbox-frontendv1/frontend`
- **Backend:** FastAPI + SQLite in `medbox-backendv1-connected/medbox-backendv1`
- **AI recognition:** the backend's internal OCR pipeline in `backend/perception`; the scanner uses it automatically.

## Prerequisites

- Node.js 20 or newer
- Python **3.11 or 3.12** (the installed Python 3.14 is too new for the pinned AI/OCR packages)
- Tesseract OCR installed and available on `PATH` for real local OCR. Without it, the API remains usable and deliberately uses its labelled demo-recognition fallback.

## First-time setup

Open two PowerShell terminals.

### Terminal 1 — backend and AI service

```powershell
cd C:\Users\Vanshika\OneDrive\Desktop\medboxx\medbox-backendv1-connected\medbox-backendv1
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

The API should report `MedBox backend started`. Open `http://127.0.0.1:8000/docs` to inspect and try its endpoints.

### Terminal 2 — frontend

```powershell
cd C:\Users\Vanshika\OneDrive\Desktop\medboxx\medbox-frontendv1\medbox-frontendv1\frontend
npm install
npm run dev
```

Open the URL Vite prints, normally `http://localhost:5173`.

Vite forwards all `/api/*` calls to FastAPI on port 8000. No frontend environment variable is needed for local development.

## Try the full flow

1. Register an account using the email/password form (it creates a backend JWT session).
2. Go to **AI Scan**, upload a medicine-label image, then select **Run Vision Scan**.
3. Confirm the recognized result. It is persisted once to SQLite with the selected initial stock, then the medicine library refreshes from the backend.

For a production Firebase sign-in, create `frontend/.env.local` with the `VITE_FIREBASE_*` values used in `frontend/src/config/firebase.js`. The backend email/password authentication works without Firebase.
=======
# medbox
1. added frontend
2. added backend
>>>>>>> ffef9b73cfef2c202835281639a3d1bcb74d927d
