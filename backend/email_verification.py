"""
Signed email verification & password reset tokens (JWT-based, short-lived).
"""
import os
import jwt
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

JWT_SECRET = os.environ.get("JWT_SECRET", "CHANGE_ME")
VERIFY_TTL_HOURS = 24
RESET_TTL_HOURS = 1


def create_verify_token(email: str, user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "purpose": "email_verification",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=VERIFY_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Le lien de vérification a expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Lien invalide")
    if payload.get("purpose") != "email_verification":
        raise HTTPException(status_code=400, detail="Type de token incorrect")
    return payload


def create_reset_token(email: str, user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "purpose": "password_reset",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=RESET_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_reset_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Le lien de réinitialisation a expiré (1h)")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Lien invalide")
    if payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=400, detail="Type de token incorrect")
    return payload
