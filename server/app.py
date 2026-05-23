from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from utils.db import db
from utils.auth_utils import hash_password

from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.leads import router as leads_router
from routes.branches import router as branches_router
from routes.cases import router as cases_router
from routes.activities import router as activities_router
from routes.documents import router as documents_router
from routes.finance import router as finance_router
from routes.hr import router as hr_router
from routes.tasks import router as tasks_router
from routes.agreements import router as agreements_router
from routes.dashboard import router as dashboard_router
from routes.immigration import router as immigration_router
from routes.appointments import router as appointments_router

load_dotenv()

app = FastAPI(title="Pangaea Pathways CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(leads_router)
app.include_router(branches_router)
app.include_router(cases_router)
app.include_router(activities_router)
app.include_router(documents_router)
app.include_router(finance_router)
app.include_router(hr_router)
app.include_router(tasks_router)
app.include_router(agreements_router)
app.include_router(dashboard_router)
app.include_router(immigration_router)
app.include_router(appointments_router)


@app.on_event("startup")
def seed_database():
    """Seed branches (with country) and the initial CEO account."""

    # ─── Seed Branches ───────────────────────────────────────────────────────
    branches = [
        {"name": "Australia HQ", "city": "Sydney",     "country": "Australia"},
        {"name": "Melbourne",    "city": "Melbourne",   "country": "Australia"},
        {"name": "Surat",        "city": "Surat",       "country": "India"},
        {"name": "Ahmedabad",    "city": "Ahmedabad",   "country": "India"},
    ]
    for b in branches:
        if not db.branches.find_one({"name": b["name"]}):
            db.branches.insert_one(b)
            print(f"[SUCCESS] Seeded branch: {b['name']} ({b['country']})")
        else:
            # Ensure existing branches have a country field
            db.branches.update_one(
                {"name": b["name"], "country": {"$exists": False}},
                {"$set": {"country": b["country"]}}
            )

    # ─── Seed CEO Account ────────────────────────────────────────────────────
    ceo_email = os.environ.get("CEO_EMAIL", "ceo@pangaea.com")
    ceo_password = os.environ.get("CEO_PASSWORD", "ceo@pangaea123")

    if not db.users.find_one({"role": "CEO"}):
        from datetime import datetime, timezone
        db.users.insert_one({
            "email": ceo_email,
            "name": "Pangaea CEO",
            "passwordHash": hash_password(ceo_password),
            "googleId": None,
            "role": "CEO",
            "country": None,   # CEO has global access, no country restriction
            "branchId": None,
            "createdBy": None,
            "isActive": True,
            "emailVerifiedAt": datetime.now(timezone.utc),
            "totpEnabled": False,
            "totpSecret": None,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        })
        print(f"[SUCCESS] Seeded CEO account: {ceo_email} / {ceo_password}")
    else:
        print("[INFO] CEO account already exists")


@app.get("/")
def read_root():
    return {"message": "Welcome to Pangaea Pathways CRM API — RBAC v2.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
