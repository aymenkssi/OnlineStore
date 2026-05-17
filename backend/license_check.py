"""
License client — one-shot activation against a remote license server.

Behaviour (NEW):
  - On startup: read LICENSE_KEY + LICENSE_SERVER_URL from env
  - Look up `license_state` collection in MongoDB
  - If a doc with `activated: true` already exists for this license_key → SKIP all checks
  - Otherwise: POST /api/v1/activate to the license server
      * server checks key exists, status==active, remaining_uses > 0
      * server decrements remaining_uses by 1 atomically
      * server returns a signed JWT
  - On success: store activation flag in MongoDB so subsequent restarts skip check
  - If LICENSE_ENABLED=false → no-op (development mode)

Failure modes (raise LicenseError → backend startup aborts):
  - LICENSE_KEY / LICENSE_SERVER_URL / LICENSE_PUBLIC_KEY missing
  - Key not found, revoked, exhausted, or remaining_uses == 0
  - JWT signature invalid / status != active
  - License server unreachable on the very first activation
"""
import os
import asyncio
from datetime import datetime, timezone
from typing import Optional

import jwt
import httpx
from motor.motor_asyncio import AsyncIOMotorClient


class LicenseError(RuntimeError):
    """Raised when the license is invalid, exhausted or unreachable on first run."""


_LICENSE_STATE_COLLECTION = "license_state"


def _is_enabled() -> bool:
    return os.environ.get("LICENSE_ENABLED", "false").lower() == "true"


def _get_db():
    """Open a fresh connection — license_check runs at startup, before app state is ready."""
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return client[os.environ["DB_NAME"]]


def _verify_token(token: str, public_key: str) -> dict:
    """Verify the JWT signature and return its payload."""
    try:
        payload = jwt.decode(token, public_key, algorithms=["RS256"])
    except jwt.ExpiredSignatureError:
        raise LicenseError("License token expired")
    except jwt.InvalidTokenError as e:
        raise LicenseError(f"Invalid license token signature: {e}")
    if payload.get("status") != "active":
        raise LicenseError(f"License status is {payload.get('status')}")
    return payload


async def _call_activate(license_key: str) -> dict:
    server_url = os.environ.get("LICENSE_SERVER_URL", "").rstrip("/")
    if not server_url:
        raise LicenseError("LICENSE_SERVER_URL is not configured")
    payload = {"license_key": license_key}
    timeout = httpx.Timeout(10.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            r = await client.post(f"{server_url}/api/v1/activate", json=payload)
        except httpx.RequestError as e:
            raise LicenseError(f"License server unreachable on first activation: {e}")
        if r.status_code >= 400:
            try:
                detail = r.json().get("detail", r.text)
            except Exception:
                detail = r.text
            raise LicenseError(f"License server error {r.status_code}: {detail}")
        return r.json()


async def check_license() -> Optional[dict]:
    """
    Verifies the license ONCE — at first backend startup.
    Subsequent startups read the activation flag from MongoDB and return immediately.
    Raises LicenseError if the deployment must be blocked.
    """
    if not _is_enabled():
        print("[license] LICENSE_ENABLED=false — running in development mode (no license check).")
        return None

    license_key = os.environ.get("LICENSE_KEY", "").strip()
    if not license_key:
        raise LicenseError("LICENSE_KEY is missing in environment")

    public_key = os.environ.get("LICENSE_PUBLIC_KEY", "").strip()
    if not public_key:
        raise LicenseError("LICENSE_PUBLIC_KEY is missing in environment")

    db = _get_db()

    # 1) Already activated on this deployment? (one-shot guarantee)
    existing = await db[_LICENSE_STATE_COLLECTION].find_one(
        {"license_key": license_key, "activated": True},
        {"_id": 0},
    )
    if existing:
        print(f"[license] OK — already activated on {existing.get('activated_at')}, skipping remote check.")
        return existing

    # 2) First startup → call the license server (this will decrement remaining_uses)
    print("[license] First startup — contacting license server for activation...")
    result = await _call_activate(license_key)
    token = result.get("license_token")
    if not token:
        raise LicenseError("License server did not return an activation token")

    payload = _verify_token(token, public_key)

    # 3) Persist the activation flag — ensures subsequent restarts skip the remote call
    now_iso = datetime.now(timezone.utc).isoformat()
    state_doc = {
        "license_key": license_key,
        "license_id": payload.get("license_id"),
        "customer_email": payload.get("customer_email"),
        "activated": True,
        "activated_at": now_iso,
        "remaining_uses_after_activation": result.get("remaining_uses_after"),
        "license_token": token,
    }
    await db[_LICENSE_STATE_COLLECTION].update_one(
        {"license_key": license_key},
        {"$set": state_doc},
        upsert=True,
    )
    print(
        f"[license] OK — activated successfully "
        f"(remaining uses on server: {result.get('remaining_uses_after')})"
    )
    return state_doc


async def heartbeat_loop(*_args, **_kwargs):
    """Kept for backward compatibility with server.py; no-op in the new one-shot model."""
    # Intentionally idle forever — heartbeat is no longer required.
    while True:
        await asyncio.sleep(86400)
