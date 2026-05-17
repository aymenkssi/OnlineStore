"""
WebAuthn / FIDO2 support (YubiKey, Touch ID, Windows Hello, security keys).

Uses the py_webauthn library for ceremony helpers.
Flow:
 1. /webauthn/register/begin   → generate_registration_options, stash challenge
 2. /webauthn/register/complete → verify_registration_response, store credential
 3. /webauthn/login/begin       → generate_authentication_options
 4. /webauthn/login/complete    → verify_authentication_response
"""
import os
import base64
import json
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from webauthn import (
    generate_registration_options,
    generate_authentication_options,
    verify_registration_response,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
    AuthenticatorTransport,
)

from auth_deps import (
    get_current_user,
    create_access_token,
    set_auth_cookies,
)

router = APIRouter(prefix="/api/users/webauthn", tags=["webauthn"])

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _client[os.environ["DB_NAME"]]

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
RP_ID = FRONTEND_URL.split("://", 1)[1].split("/", 1)[0].split(":", 1)[0]
RP_NAME = os.environ.get("SITE_NAME", "Best Shop")
ORIGIN = FRONTEND_URL.rstrip("/")


def _b64url_decode(data: str) -> bytes:
    """Decode base64url (may be missing padding)."""
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


class LoginBeginPayload(BaseModel):
    email: str


class CompletePayload(BaseModel):
    credential: dict  # raw PublicKeyCredential JSON from navigator
    email: str | None = None


@router.post("/register/begin")
async def webauthn_register_begin(current: dict = Depends(get_current_user)):
    user_id = current["sub"]
    email = current["email"]
    name = current.get("email", "user")

    # Exclude already-registered credentials
    existing = await _db.webauthn_credentials.find({"user_id": user_id}).to_list(20)
    exclude = [
        PublicKeyCredentialDescriptor(
            id=_b64url_decode(c["credential_id"]),
            transports=[AuthenticatorTransport(t) for t in c.get("transports", []) if t],
        )
        for c in existing
    ]

    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=user_id.encode("utf-8"),
        user_name=email,
        user_display_name=name,
        exclude_credentials=exclude,
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )

    # Store challenge (base64url) for the completion step
    await _db.webauthn_challenges.update_one(
        {"user_id": user_id, "kind": "register"},
        {"$set": {
            "user_id": user_id,
            "kind": "register",
            "challenge": _b64url_encode(options.challenge),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return json.loads(options_to_json(options))


@router.post("/register/complete")
async def webauthn_register_complete(payload: CompletePayload, current: dict = Depends(get_current_user)):
    user_id = current["sub"]
    stored = await _db.webauthn_challenges.find_one({"user_id": user_id, "kind": "register"})
    if not stored:
        raise HTTPException(status_code=400, detail="Aucun challenge en cours")

    try:
        verification = verify_registration_response(
            credential=payload.credential,
            expected_challenge=_b64url_decode(stored["challenge"]),
            expected_rp_id=RP_ID,
            expected_origin=ORIGIN,
            require_user_verification=False,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Vérification échouée : {e}") from e

    cred_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "credential_id": _b64url_encode(verification.credential_id),
        "public_key": _b64url_encode(verification.credential_public_key),
        "sign_count": verification.sign_count,
        "transports": (payload.credential.get("response", {}) or {}).get("transports", []) or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used_at": None,
        "nickname": "Security key",
    }
    await _db.webauthn_credentials.insert_one(cred_doc)
    await _db.webauthn_challenges.delete_one({"_id": stored["_id"]})
    return {"message": "Clé de sécurité enregistrée", "credential_id": cred_doc["id"]}


@router.get("/credentials")
async def list_credentials(current: dict = Depends(get_current_user)):
    user_id = current["sub"]
    creds = await _db.webauthn_credentials.find(
        {"user_id": user_id},
        {"_id": 0, "public_key": 0, "credential_id": 0},
    ).to_list(50)
    return creds


@router.delete("/credentials/{credential_id}")
async def delete_credential(credential_id: str, current: dict = Depends(get_current_user)):
    result = await _db.webauthn_credentials.delete_one({"id": credential_id, "user_id": current["sub"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Clé non trouvée")
    return {"message": "Clé supprimée"}


@router.post("/login/begin")
async def webauthn_login_begin(payload: LoginBeginPayload):
    user = await _db.customers.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="Aucun utilisateur")
    creds = await _db.webauthn_credentials.find({"user_id": user["id"]}).to_list(20)
    if not creds:
        raise HTTPException(status_code=400, detail="Aucune clé de sécurité enregistrée")

    allow = [
        PublicKeyCredentialDescriptor(
            id=_b64url_decode(c["credential_id"]),
            transports=[AuthenticatorTransport(t) for t in c.get("transports", []) if t],
        )
        for c in creds
    ]
    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow,
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    await _db.webauthn_challenges.update_one(
        {"user_id": user["id"], "kind": "login"},
        {"$set": {
            "user_id": user["id"],
            "kind": "login",
            "challenge": _b64url_encode(options.challenge),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return json.loads(options_to_json(options))


@router.post("/login/complete")
async def webauthn_login_complete(payload: CompletePayload, response: Response):
    if not payload.email:
        raise HTTPException(status_code=400, detail="Email requis")
    user = await _db.customers.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    stored = await _db.webauthn_challenges.find_one({"user_id": user["id"], "kind": "login"})
    if not stored:
        raise HTTPException(status_code=400, detail="Aucun challenge en cours")

    cred_id_raw = payload.credential.get("id", "")
    cred = await _db.webauthn_credentials.find_one({"user_id": user["id"], "credential_id": cred_id_raw})
    if not cred:
        raise HTTPException(status_code=400, detail="Clé non reconnue")

    try:
        verification = verify_authentication_response(
            credential=payload.credential,
            expected_challenge=_b64url_decode(stored["challenge"]),
            expected_rp_id=RP_ID,
            expected_origin=ORIGIN,
            credential_public_key=_b64url_decode(cred["public_key"]),
            credential_current_sign_count=cred.get("sign_count", 0),
            require_user_verification=False,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentification échouée : {e}") from e

    # Update sign count + last use
    await _db.webauthn_credentials.update_one(
        {"_id": cred["_id"]},
        {"$set": {
            "sign_count": verification.new_sign_count,
            "last_used_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    await _db.webauthn_challenges.delete_one({"_id": stored["_id"]})
    # Reset lockout counters
    await _db.customers.update_one(
        {"id": user["id"]},
        {"$set": {"failed_login_attempts": 0, "locked_until": None, "last_login": datetime.now(timezone.utc).isoformat()}},
    )

    access_token = create_access_token(user["id"], user["email"], user.get("role", "customer"))
    csrf_token = set_auth_cookies(response, access_token)
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "customer"),
        "access_token": access_token,
        "token_type": "bearer",
        "csrf_token": csrf_token,
        "message": "Authentification WebAuthn réussie",
    }
