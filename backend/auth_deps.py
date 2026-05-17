"""
Authentication & authorization dependencies for FastAPI.

Features:
 - JWT stateless authentication (Authorization: Bearer AND httpOnly cookie)
 - Role-based access control (require_admin, require_super_admin)
 - Privilege-escalation-safe (roles ignored on public registration)
 - CSRF token generation + double-submit cookie pattern
 - Secure cookie settings (httpOnly, secure, samesite=lax)
"""
import os
import secrets
import hmac
import uuid
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Set

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient

# --- Configuration ---------------------------------------------------------
JWT_SECRET = os.environ.get(
    "JWT_SECRET",
    "CHANGE_ME_IN_PRODUCTION_f8e3c2b1a0d9e8c7b6a5d4e3f2c1b0a9",
)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Secure cookies in production (HTTPS). Disable locally for http://localhost.
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() == "true"
COOKIE_NAME_ACCESS = "access_token"
COOKIE_NAME_CSRF = "csrf_token"
COOKIE_SAMESITE = "lax"

ADMIN_ROLES: Set[str] = {"admin", "super_admin"}
SUPER_ADMIN_ROLES: Set[str] = {"super_admin"}

# Methods that require CSRF validation when using cookie-based auth
CSRF_PROTECTED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

bearer_scheme = HTTPBearer(auto_error=False)


# --- MongoDB handle + revocation store -------------------------------------
_mongo_client: Optional[AsyncIOMotorClient] = None

def _get_db():
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return _mongo_client[os.environ["DB_NAME"]]


async def revoke_token(jti: str, expires_at_ts: int) -> None:
    if not jti:
        return
    await _get_db().revoked_tokens.update_one(
        {"jti": jti},
        {"$set": {
            "jti": jti,
            "expires_at": expires_at_ts,
            "revoked_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )


async def is_token_revoked(jti: str) -> bool:
    if not jti:
        return False
    entry = await _get_db().revoked_tokens.find_one({"jti": jti})
    return entry is not None


# --- Token helpers ---------------------------------------------------------
def create_access_token(user_id: str, email: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def set_auth_cookies(response: Response, access_token: str) -> str:
    """Set httpOnly access_token cookie AND readable csrf_token cookie.
    Returns the csrf_token so the backend can include it in JSON response."""
    csrf = generate_csrf_token()
    # httpOnly access token (not readable by JS — XSS protection)
    response.set_cookie(
        key=COOKIE_NAME_ACCESS,
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=JWT_EXPIRE_MINUTES * 60,
        path="/",
    )
    # Non-httpOnly CSRF token (readable by JS to include in X-CSRF-Token header)
    response.set_cookie(
        key=COOKIE_NAME_CSRF,
        value=csrf,
        httponly=False,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=JWT_EXPIRE_MINUTES * 60,
        path="/",
    )
    return csrf


def clear_auth_cookies(response: Response):
    response.delete_cookie(COOKIE_NAME_ACCESS, path="/")
    response.delete_cookie(COOKIE_NAME_CSRF, path="/")


# --- Token extraction ------------------------------------------------------
def _extract_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials],
) -> Optional[str]:
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    return request.cookies.get(COOKIE_NAME_ACCESS)


def _used_cookie(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> bool:
    """True when the caller is authenticated via cookie (needs CSRF check)."""
    if credentials and credentials.scheme.lower() == "bearer":
        return False
    return bool(request.cookies.get(COOKIE_NAME_ACCESS))


def _verify_csrf(request: Request):
    """Double-submit cookie pattern: header X-CSRF-Token must equal csrf_token cookie."""
    header_token = request.headers.get("X-CSRF-Token", "")
    cookie_token = request.cookies.get(COOKIE_NAME_CSRF, "")
    if not header_token or not cookie_token or not hmac.compare_digest(header_token, cookie_token):
        raise HTTPException(status_code=403, detail="CSRF token invalide ou manquant")


# --- Dependencies ----------------------------------------------------------
async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[dict]:
    token = _extract_token(request, credentials)
    if not token:
        return None
    try:
        return _decode_token(token)
    except HTTPException:
        return None


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = _decode_token(token)
    # Blacklist check (session revocation)
    if await is_token_revoked(payload.get("jti", "")):
        raise HTTPException(status_code=401, detail="Session révoquée")
    # CSRF check only for cookie-based auth on mutating methods
    if _used_cookie(request, credentials) and request.method in CSRF_PROTECTED_METHODS:
        _verify_csrf(request)
    return payload


async def require_admin(
    current: dict = Depends(get_current_user),
) -> dict:
    if current.get("role") not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    return current


async def require_super_admin(
    current: dict = Depends(get_current_user),
) -> dict:
    if current.get("role") not in SUPER_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Accès super-administrateur requis")
    return current
