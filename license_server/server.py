"""
License server — issues and validates licenses for the Best Shop application.

NEW BEHAVIOUR (one-shot activation, usage-based):
  - Each license has a `remaining_uses` counter (default 1)
  - The customer backend calls /api/v1/activate ONCE on its first startup
  - The server checks: license exists, status==active, remaining_uses > 0
    then decrements remaining_uses by 1 atomically and returns a signed JWT
  - There is no domain binding, no heartbeat, no periodic re-check
  - When remaining_uses reaches 0 the license can no longer be activated

Endpoints:
  Public (called by deployed customer instances):
    POST /api/v1/activate    - One-shot activation: decrements remaining_uses
    GET  /api/v1/public-key  - Returns the RSA public key
    GET  /api/v1/health      - Health check
  Admin (vendor management UI):
    POST   /api/v1/admin/login
    GET    /api/v1/admin/licenses
    POST   /api/v1/admin/licenses
    POST   /api/v1/admin/licenses/{license_id}/revoke
    POST   /api/v1/admin/licenses/{license_id}/activate
    POST   /api/v1/admin/licenses/{license_id}/add-uses
    DELETE /api/v1/admin/licenses/{license_id}
"""
import os
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import jwt
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

# === Config ===
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
ADMIN_JWT_SECRET = os.environ["ADMIN_JWT_SECRET"]
PRIVATE_KEY_PATH = os.environ["PRIVATE_KEY_PATH"]
PUBLIC_KEY_PATH = os.environ["PUBLIC_KEY_PATH"]
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
LICENSE_PREFIX = os.environ.get("LICENSE_PREFIX", "BSHP")
LICENSE_TOKEN_TTL = int(os.environ.get("LICENSE_TOKEN_TTL", "315360000"))  # 10 years (effectively perpetual)

PRIVATE_KEY = Path(PRIVATE_KEY_PATH).read_text()
PUBLIC_KEY = Path(PUBLIC_KEY_PATH).read_text()

# === DB ===
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# === App ===
app = FastAPI(title="License Server", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS.split(",")] if CORS_ORIGINS != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Helpers ===
def generate_license_key() -> str:
    """Generate a license key like BSHP-XXXX-XXXX-XXXX-XXXX (no ambiguous chars)."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    parts = []
    for _ in range(4):
        parts.append("".join(secrets.choice(alphabet) for _ in range(4)))
    return f"{LICENSE_PREFIX}-{'-'.join(parts)}"


def sign_license_token(payload: dict) -> str:
    return jwt.encode(payload, PRIVATE_KEY, algorithm="RS256")


def make_admin_token(email: str) -> str:
    payload = {
        "sub": email,
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=12)).timestamp()),
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm="HS256")


async def require_admin(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
        return payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")


def license_to_dict(doc: dict) -> dict:
    if not doc:
        return None
    return {k: v for k, v in doc.items() if k != "_id"}


# === Models ===
class LicenseCreate(BaseModel):
    customer_email: EmailStr
    customer_name: str = Field(min_length=1, max_length=200)
    notes: Optional[str] = None
    expires_at: Optional[str] = None
    remaining_uses: int = Field(default=1, ge=1, le=1000000)


class ActivateRequest(BaseModel):
    license_key: str
    fingerprint: Optional[str] = None  # informational only
    domain: Optional[str] = None        # informational only


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AddUses(BaseModel):
    amount: int = Field(ge=1, le=1000000)


# === Public license endpoints ===
@app.get("/api/v1/health")
async def health():
    return {"ok": True, "service": "license-server", "time": datetime.now(timezone.utc).isoformat()}


@app.get("/api/v1/public-key")
async def get_public_key():
    return {"public_key": PUBLIC_KEY}


@app.post("/api/v1/activate")
async def activate_license(req: ActivateRequest):
    """
    One-shot activation:
      - Verifies the license exists and is active
      - Verifies remaining_uses > 0
      - Atomically decrements remaining_uses by 1
      - Returns a signed JWT proof of activation

    Once remaining_uses reaches 0, the license is automatically marked exhausted
    and further activations will be refused.
    """
    now = datetime.now(timezone.utc)

    # Atomic find-and-decrement: only succeeds if status == active AND remaining_uses > 0
    updated = await db.licenses.find_one_and_update(
        {
            "license_key": req.license_key,
            "status": "active",
            "remaining_uses": {"$gt": 0},
        },
        {
            "$inc": {"remaining_uses": -1, "activation_count": 1},
            "$set": {"last_activated_at": now.isoformat()},
            "$setOnInsert": {},
        },
        return_document=True,  # newer pymongo returns the post-update doc
    )

    if not updated:
        # Find the license to give a precise error
        existing = await db.licenses.find_one({"license_key": req.license_key})
        if not existing:
            raise HTTPException(status_code=404, detail="License key not found")
        if existing["status"] != "active":
            raise HTTPException(status_code=403, detail=f"License is {existing['status']}")
        if existing.get("remaining_uses", 0) <= 0:
            # Auto-mark as exhausted (idempotent)
            await db.licenses.update_one(
                {"license_key": req.license_key, "status": "active"},
                {"$set": {"status": "exhausted"}},
            )
            raise HTTPException(status_code=403, detail="License has no remaining uses")
        raise HTTPException(status_code=500, detail="Activation failed (unknown reason)")

    # If we just brought it to zero, mark exhausted to prevent any race
    if updated.get("remaining_uses", 0) <= 0:
        await db.licenses.update_one(
            {"license_key": req.license_key},
            {"$set": {"status": "exhausted"}},
        )

    # Issue signed proof
    token_payload = {
        "license_id": updated["id"],
        "license_key": req.license_key,
        "customer_email": updated["customer_email"],
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=LICENSE_TOKEN_TTL)).timestamp()),
        "status": "active",
        "remaining_uses_after": updated.get("remaining_uses", 0),
    }
    token = sign_license_token(token_payload)

    return {
        "ok": True,
        "license_token": token,
        "license_id": updated["id"],
        "remaining_uses_after": updated.get("remaining_uses", 0),
    }


# === Admin endpoints ===
@app.post("/api/v1/admin/login")
async def admin_login(payload: AdminLogin):
    if payload.email.lower() != ADMIN_EMAIL.lower():
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"ok": True, "token": make_admin_token(ADMIN_EMAIL), "email": ADMIN_EMAIL}


@app.get("/api/v1/admin/licenses")
async def list_licenses(_admin: str = Depends(require_admin)):
    docs = await db.licenses.find({}).sort("created_at", -1).to_list(1000)
    return [license_to_dict(d) for d in docs]


@app.post("/api/v1/admin/licenses")
async def create_license(payload: LicenseCreate, _admin: str = Depends(require_admin)):
    license_key = generate_license_key()
    while await db.licenses.find_one({"license_key": license_key}):
        license_key = generate_license_key()

    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "license_key": license_key,
        "customer_email": payload.customer_email,
        "customer_name": payload.customer_name,
        "notes": payload.notes or "",
        "status": "active",
        "expires_at": payload.expires_at,
        "remaining_uses": payload.remaining_uses,
        "activation_count": 0,
        "last_activated_at": None,
        "created_at": now.isoformat(),
        "created_by": _admin,
    }
    await db.licenses.insert_one(doc)
    return license_to_dict(doc)


@app.post("/api/v1/admin/licenses/{license_id}/revoke")
async def revoke_license(license_id: str, _admin: str = Depends(require_admin)):
    res = await db.licenses.update_one({"id": license_id}, {"$set": {"status": "revoked"}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="License not found")
    return {"ok": True}


@app.post("/api/v1/admin/licenses/{license_id}/activate")
async def reactivate_license(license_id: str, _admin: str = Depends(require_admin)):
    """Re-activate a revoked/exhausted license.
    Note: if remaining_uses == 0, also call /add-uses to give it more uses."""
    res = await db.licenses.update_one({"id": license_id}, {"$set": {"status": "active"}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="License not found")
    return {"ok": True}


@app.post("/api/v1/admin/licenses/{license_id}/add-uses")
async def add_uses(license_id: str, payload: AddUses, _admin: str = Depends(require_admin)):
    """Top up remaining_uses on an existing license."""
    res = await db.licenses.update_one(
        {"id": license_id},
        {"$inc": {"remaining_uses": payload.amount}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="License not found")
    return {"ok": True}


@app.delete("/api/v1/admin/licenses/{license_id}")
async def delete_license(license_id: str, _admin: str = Depends(require_admin)):
    res = await db.licenses.delete_one({"id": license_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="License not found")
    return {"ok": True}


# === Admin UI (static HTML) ===
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


@app.get("/")
async def root():
    return JSONResponse({"service": "license-server", "admin": "/admin"})


@app.get("/admin")
async def admin_ui():
    return FileResponse(ROOT / "static" / "admin.html")
