"""Google OAuth flow with CSRF protection via signed `state` param."""
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
import httpx
import os
import uuid
import secrets
import hmac
import hashlib
import base64
import json
import time
from urllib.parse import urlencode

from auth_deps import create_access_token, set_auth_cookies, JWT_SECRET

router = APIRouter(prefix="/api/auth", tags=["oauth"])

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "/")

STATE_TTL_SECONDS = 600  # 10 minutes
STATE_COOKIE_NAME = "oauth_state"


def _sign_state(payload: dict) -> str:
    """Create a signed state token: base64(payload).hmac_hex."""
    raw = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    sig = hmac.new(JWT_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def _verify_state(state: str) -> dict:
    try:
        raw, sig = state.rsplit(".", 1)
    except ValueError:
        raise HTTPException(status_code=400, detail="OAuth state invalide")
    expected_sig = hmac.new(JWT_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=400, detail="Signature OAuth state invalide")
    padding = "=" * (-len(raw) % 4)
    payload = json.loads(base64.urlsafe_b64decode(raw + padding).decode())
    if int(time.time()) - int(payload.get("ts", 0)) > STATE_TTL_SECONDS:
        raise HTTPException(status_code=400, detail="OAuth state expiré")
    return payload


@router.get("/google/login")
async def google_login(response: Response):
    """Redirect to Google with a CSRF-protected signed state + nonce cookie."""
    nonce = secrets.token_urlsafe(24)
    state = _sign_state({"nonce": nonce, "ts": int(time.time())})
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    redirect = RedirectResponse(url=url)
    redirect.set_cookie(
        key=STATE_COOKIE_NAME,
        value=nonce,
        httponly=True,
        secure=os.environ.get("COOKIE_SECURE", "true").lower() == "true",
        samesite="lax",
        max_age=STATE_TTL_SECONDS,
        path="/",
    )
    return redirect


@router.get("/google/callback")
async def google_callback(request: Request, code: str = None, state: str = None, error: str = None):
    """Google OAuth callback with state+nonce validation (CSRF-safe)."""
    if error:
        return RedirectResponse(url=f"{FRONTEND_URL}?error=google_auth_denied")
    if not code or not state:
        return RedirectResponse(url=f"{FRONTEND_URL}?error=missing_code_or_state")

    # Verify state signature and freshness
    payload = _verify_state(state)
    # Verify nonce matches the one set during /google/login
    cookie_nonce = request.cookies.get(STATE_COOKIE_NAME, "")
    if not cookie_nonce or not hmac.compare_digest(cookie_nonce, payload.get("nonce", "")):
        raise HTTPException(status_code=400, detail="OAuth nonce invalide (CSRF détecté)")

    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if token_response.status_code != 200:
                return RedirectResponse(url=f"{FRONTEND_URL}?error=token_failed")

            tokens = token_response.json()
            access_token_google = tokens.get("access_token")
            if not access_token_google:
                return RedirectResponse(url=f"{FRONTEND_URL}?error=no_access_token")

            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token_google}"},
            )
            if user_response.status_code != 200:
                return RedirectResponse(url=f"{FRONTEND_URL}?error=user_info_failed")
            user_data = user_response.json()

        # Persist user and issue our JWT
        from mock_auth import save_oauth_user
        user_id = await save_oauth_user(
            email=user_data.get("email", ""),
            name=user_data.get("name", ""),
            picture=user_data.get("picture", ""),
            provider="google",
        )
        our_jwt = create_access_token(user_id=user_id, email=user_data.get("email", ""), role="customer")

        redirect = RedirectResponse(url=f"{FRONTEND_URL}?oauth=success", status_code=302)
        # Clear the oauth_state cookie (no longer needed)
        redirect.delete_cookie(STATE_COOKIE_NAME, path="/")
        # Set our httpOnly access_token + csrf_token cookies
        set_auth_cookies(redirect, our_jwt)
        return redirect

    except httpx.RequestError:
        return RedirectResponse(url=f"{FRONTEND_URL}?error=network")
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Google OAuth error: {exc}")
        return RedirectResponse(url=f"{FRONTEND_URL}?error=oauth_failed")


@router.get("/session")
async def get_session(request: Request):
    """
    Bridge endpoint for SPA: reads the httpOnly access_token cookie set by Google OAuth
    and returns the user object + a bearer JWT that the frontend can store in localStorage.
    Frontend calls this once after the OAuth redirect (`?oauth=success`).
    """
    cookie_token = request.cookies.get("access_token")
    if not cookie_token:
        raise HTTPException(status_code=401, detail="Aucune session OAuth active")
    try:
        from auth_deps import _decode_token
        payload = _decode_token(cookie_token)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Session OAuth invalide")

    # Fetch the user record (created/updated by save_oauth_user) from MongoDB
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    user = await db.customers.find_one({"email": payload.get("email")}, {"_id": 0, "password": 0})
    client.close()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "role": user.get("role", "customer"),
        "picture": user.get("picture", ""),
        "access_token": cookie_token,
    }
