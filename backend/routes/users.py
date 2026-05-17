from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import uuid
import bcrypt

from auth_deps import (
    create_access_token,
    get_current_user,
    require_admin,
    set_auth_cookies,
    clear_auth_cookies,
    revoke_token,
    JWT_EXPIRE_MINUTES,
)
from rate_limit import limiter
import totp as totp_utils
import auth_email
import email_verification

router = APIRouter(prefix="/api/users", tags=["users"])

# Database reference
db = None

def init_db(database):
    global db
    db = database

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    subscribe_newsletter: Optional[bool] = False

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None
    permissions: Optional[List[str]] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

class UserPreferences(BaseModel):
    customersItemsPerPage: Optional[int] = 25
    # Add more preferences here in the future

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None
    recovery_code: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class TotpVerify(BaseModel):
    code: str

class TotpDisable(BaseModel):
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    status: str
    created_at: str
    last_login: Optional[str] = None

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

@router.get("/")
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    role: Optional[str] = None,
    _admin: dict = Depends(require_admin),
):
    """Get all users with optional filtering (ADMIN ONLY)"""
    query = {}
    if status:
        query["status"] = status
    if role:
        # 'admin' filter returns both admin and super_admin roles
        if role == 'admin':
            query["role"] = {"$in": ["admin", "super_admin"]}
        else:
            query["role"] = role
    
    users = await db.customers.find(query, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.customers.count_documents(query)
    
    return {
        "items": users,
        "total": total,
        "limit": limit,
        "skip": skip,
        "has_more": skip + len(users) < total
    }

@router.get("/stats")
async def get_user_stats(_admin: dict = Depends(require_admin)):
    """Get user statistics (ADMIN ONLY)"""
    total = await db.customers.count_documents({})
    active = await db.customers.count_documents({"status": "active"})
    inactive = await db.customers.count_documents({"status": "inactive"})
    admins = await db.customers.count_documents({"role": "admin"})
    customers = await db.customers.count_documents({"role": "customer"})
    
    return {
        "total": total,
        "active": active,
        "inactive": inactive,
        "admins": admins,
        "customers": customers
    }

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    permissions: Optional[List[str]] = None

@router.post("/create-admin")
async def create_admin_user(payload: AdminCreate, current: dict = Depends(require_admin)):
    """Create a new admin account (ADMIN ONLY). Bypasses email verification."""
    existing = await db.customers.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 8 caractères")

    new_admin = {
        "id": str(uuid.uuid4()),
        "email": payload.email,
        "password": hash_password(payload.password),
        "password_history": [],
        "name": payload.name,
        "phone": payload.phone,
        "role": "admin",
        "permissions": payload.permissions or [],
        "status": "active",
        "email_verified": True,
        "failed_login_attempts": 0,
        "locked_until": None,
        "last_login": None,
        "address": "",
        "city": "",
        "postal_code": "",
        "country": "France",
        "total_orders": 0,
        "total_spent": 0,
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(new_admin)
    return {
        "id": new_admin["id"],
        "email": new_admin["email"],
        "name": new_admin["name"],
        "role": "admin",
        "permissions": new_admin["permissions"],
        "status": "active",
        "created_at": new_admin["created_at"],
        "message": "Compte administrateur créé avec succès"
    }

@router.post("/register")
@limiter.limit("5/minute")
async def register_user(request: Request, user: UserCreate):
    """Register a new PUBLIC user. Role is always 'customer' (privilege escalation protection)."""
    # Check if email already exists
    existing = await db.customers.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # SECURITY: public registration ALWAYS creates a customer, never an admin.
    # Ignore any role/permissions value coming from the client payload.
    new_user = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": hash_password(user.password),
        "password_history": [],  # Last 5 password hashes
        "name": user.name,
        "phone": user.phone,
        "role": "customer",
        "permissions": [],
        "status": "active",
        "email_verified": False,  # Must click link in email
        "failed_login_attempts": 0,
        "locked_until": None,
        "last_login": None,
        # Commercial data (empty initially, filled when user makes orders)
        "address": "",
        "city": "",
        "postal_code": "",
        "country": "France",
        "total_orders": 0,
        "total_spent": 0,
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.customers.insert_one(new_user)
    
    # Send verification email (best-effort)
    try:
        verify_token = email_verification.create_verify_token(user.email, new_user["id"])
        frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
        verify_url = f"{frontend_url}/verify-email?token={verify_token}"
        auth_email.send_verification(user.email, user.name, verify_url)
    except Exception as e:  # noqa: BLE001
        print(f"[auth_email] verification send failed: {e}")
    
    # Subscribe to newsletter if requested
    if user.subscribe_newsletter:
        try:
            # Check if already subscribed
            existing_subscriber = await db.newsletter_subscribers.find_one({"email": user.email})
            if not existing_subscriber:
                subscriber = {
                    "id": str(uuid.uuid4()),
                    "email": user.email,
                    "name": user.name,
                    "active": True,  # Use 'active' field to match newsletter.py schema
                    "subscribed_at": datetime.now(timezone.utc).isoformat(),
                    "unsubscribe_token": str(uuid.uuid4()),
                    "source": "registration"
                }
                await db.newsletter_subscribers.insert_one(subscriber)
        except Exception:
            # Don't fail registration if newsletter subscription fails
            pass
    
    # Return without password and _id
    return {
        "id": new_user["id"],
        "email": new_user["email"],
        "name": new_user["name"],
        "phone": new_user.get("phone"),
        "role": new_user["role"],
        "status": new_user["status"],
        "created_at": new_user["created_at"],
        "message": "Inscription réussie"
    }

@router.post("/login")
@limiter.limit("10/minute")
async def login_user(request: Request, response: Response, credentials: UserLogin):
    """Login user. Rate-limit 10/min/IP, account lockout after 5 fails (15min), 2FA + email verification + password check."""
    user = await db.customers.find_one({"email": credentials.email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # Account lockout check
    locked_until = user.get("locked_until")
    if locked_until:
        try:
            lock_dt = datetime.fromisoformat(locked_until.replace("Z", "+00:00"))
            if lock_dt.tzinfo is None:
                lock_dt = lock_dt.replace(tzinfo=timezone.utc)
            if lock_dt > datetime.now(timezone.utc):
                remaining = int((lock_dt - datetime.now(timezone.utc)).total_seconds() / 60) + 1
                raise HTTPException(
                    status_code=423,
                    detail={"code": "account_locked", "message": f"Compte verrouillé. Réessayez dans {remaining} minute(s).", "locked_until": locked_until},
                )
        except HTTPException:
            raise
        except Exception:
            pass
    
    if not verify_password(credentials.password, user["password"]):
        attempts = (user.get("failed_login_attempts") or 0) + 1
        update = {"failed_login_attempts": attempts}
        lock_minutes = int(os.environ.get("ACCOUNT_LOCKOUT_MINUTES", "15"))
        max_attempts = int(os.environ.get("ACCOUNT_LOCKOUT_THRESHOLD", "5"))
        if attempts >= max_attempts:
            lock_until = datetime.now(timezone.utc) + timedelta(minutes=lock_minutes)
            update["locked_until"] = lock_until.isoformat()
            update["failed_login_attempts"] = 0
            await db.customers.update_one({"id": user["id"]}, {"$set": update})
            try:
                ip = request.client.host if request.client else None
                auth_email.send_account_locked(user["email"], user.get("name", ""), lock_minutes, ip=ip)
            except Exception as e:
                print(f"[auth_email] lock send failed: {e}")
            raise HTTPException(
                status_code=423,
                detail={"code": "account_locked", "message": f"5 tentatives incorrectes : compte verrouillé {lock_minutes} minutes."},
            )
        await db.customers.update_one({"id": user["id"]}, {"$set": update})
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Compte désactivé")
    
    # Email verification gate (optional)
    require_verif = os.environ.get("REQUIRE_EMAIL_VERIFICATION", "false").lower() == "true"
    if require_verif and user.get("email_verified") is False and user.get("role") == "customer":
        raise HTTPException(
            status_code=403,
            detail={"code": "email_not_verified", "message": "Veuillez vérifier votre email avant de vous connecter."},
        )
    
    # 2FA check
    if user.get("totp_enabled"):
        totp_secret = user.get("totp_secret")
        code = credentials.totp_code
        recovery = credentials.recovery_code
        ok = False
        if code:
            ok = totp_utils.verify_code(totp_secret, code)
        elif recovery:
            ok, new_hashes = totp_utils.verify_recovery_code(user.get("recovery_codes", []), recovery)
            if ok:
                await db.customers.update_one(
                    {"id": user["id"]},
                    {"$set": {"recovery_codes": new_hashes}},
                )
        if not ok:
            raise HTTPException(
                status_code=401,
                detail={"code": "totp_required", "message": "Code 2FA requis ou invalide"},
            )
    
    # Success — reset counters + update last_login
    await db.customers.update_one(
        {"id": user["id"]},
        {"$set": {
            "last_login": datetime.now(timezone.utc).isoformat(),
            "failed_login_attempts": 0,
            "locked_until": None,
        }}
    )
    
    access_token = create_access_token(
        user_id=user["id"], email=user["email"], role=user.get("role", "customer")
    )
    csrf_token = set_auth_cookies(response, access_token)
    must_change_password = bool(user.get("must_change_password", False))
    
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "phone": user.get("phone"),
        "role": user["role"],
        "status": user["status"],
        "access_token": access_token,
        "token_type": "bearer",
        "csrf_token": csrf_token,
        "must_change_password": must_change_password,
        "totp_enabled": bool(user.get("totp_enabled", False)),
        "email_verified": bool(user.get("email_verified", True)),
        "message": "Connexion réussie"
    }

@router.post("/logout")
async def logout_user(response: Response, request: Request):
    """Clear authentication cookies AND blacklist current JWT (session revocation)."""
    # Try to extract & revoke the bearer/cookie token
    try:
        from auth_deps import bearer_scheme, COOKIE_NAME_ACCESS
        import jwt as _jwt
        from auth_deps import JWT_SECRET, JWT_ALGORITHM
        auth_header = request.headers.get("Authorization", "")
        token = None
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1]
        else:
            token = request.cookies.get(COOKIE_NAME_ACCESS)
        if token:
            payload = _jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"verify_exp": False})
            jti = payload.get("jti")
            exp = payload.get("exp", 0)
            if jti:
                await revoke_token(jti, int(exp))
    except Exception:
        pass
    clear_auth_cookies(response)
    return {"message": "Déconnexion réussie"}

@router.post("/revoke-all-sessions")
async def revoke_all_sessions(request: Request, current: dict = Depends(get_current_user)):
    """Revoke all previously issued tokens for the current user.
    Implementation: bumps a user-level token_version; tokens with older version are rejected."""
    from auth_deps import revoke_token as _revoke
    # Mark the current token as revoked too — user will be forced to re-login
    jti = current.get("jti")
    exp = current.get("exp", 0)
    if jti:
        await _revoke(jti, int(exp))
    # Bump token_version: a background job could compare older JWT's iat with this to reject.
    await db.customers.update_one(
        {"id": current.get("sub")},
        {"$inc": {"token_version": 1}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "Toutes les sessions ont été révoquées"}

@router.post("/verify-email")
async def verify_email(token: str):
    """Mark the email of the user associated with the signed token as verified."""
    payload = email_verification.decode_verify_token(token)
    user_id = payload.get("sub")
    user = await db.customers.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.get("email_verified"):
        return {"message": "Email déjà vérifié", "already_verified": True}
    await db.customers.update_one(
        {"id": user_id},
        {"$set": {"email_verified": True, "email_verified_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "Email vérifié avec succès"}

@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request, payload: dict):
    """Resend email verification link (rate-limited 3/min)."""
    email = (payload or {}).get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email requis")
    user = await db.customers.find_one({"email": email})
    # Always return 200 (do not leak whether account exists)
    if user and not user.get("email_verified"):
        try:
            verify_token = email_verification.create_verify_token(email, user["id"])
            frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
            verify_url = f"{frontend_url}/verify-email?token={verify_token}"
            auth_email.send_verification(email, user.get("name", ""), verify_url)
        except Exception as e:
            print(f"[auth_email] resend failed: {e}")
    return {"message": "Si un compte existe, un email de vérification a été envoyé."}

@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, payload: ForgotPasswordRequest):
    """Send password reset email. Always returns 200 to not leak account existence."""
    user = await db.customers.find_one({"email": payload.email})
    if user and user.get("status") == "active":
        try:
            reset_token = email_verification.create_reset_token(payload.email, user["id"])
            frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
            reset_url = f"{frontend_url}/reset-password?token={reset_token}"
            # Fetch configured sender email from newsletter settings (admin configurable)
            settings_doc = await db.settings.find_one({"type": "newsletter"}, {"_id": 0}) or {}
            configured_sender = settings_doc.get("password_reset_sender_email") or settings_doc.get("sender_email")
            auth_email.send_password_reset(
                payload.email,
                user.get("name", ""),
                reset_url,
                sender=configured_sender,
            )
        except Exception as e:
            print(f"[auth_email] password reset send failed: {e}")
    return {"message": "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."}

@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, payload: ResetPasswordRequest):
    """Reset password using a signed token from the email link."""
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 8 caractères")
    
    token_data = email_verification.decode_reset_token(payload.token)
    user_id = token_data.get("sub")
    user = await db.customers.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Password history check (last 5)
    history = user.get("password_history", []) or []
    full_history = [user["password"]] + history
    for old_hash in full_history[:5]:
        try:
            if verify_password(payload.new_password, old_hash):
                raise HTTPException(
                    status_code=400,
                    detail="Ce mot de passe a déjà été utilisé récemment. Choisissez-en un différent.",
                )
        except HTTPException:
            raise
        except Exception:
            continue
    
    new_history = ([user["password"]] + history)[:5]
    new_hash = hash_password(payload.new_password)
    await db.customers.update_one(
        {"id": user["id"]},
        {"$set": {
            "password": new_hash,
            "password_history": new_history,
            "must_change_password": False,
            "password_changed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "failed_login_attempts": 0,
            "locked_until": None,
        }}
    )
    try:
        client_ip = request.client.host if request.client else None
        auth_email.send_password_changed(user["email"], user.get("name", ""), ip=client_ip)
    except Exception as e:
        print(f"[auth_email] password_changed send failed: {e}")
    return {"message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."}

@router.post("/change-password")
async def change_password(payload: PasswordChange, request: Request, current: dict = Depends(get_current_user)):
    """Change own password with:
    - current password verification
    - min length 8
    - password history (cannot reuse last 5)
    - email notification on success"""
    user = await db.customers.find_one({"id": current.get("sub")})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if not verify_password(payload.current_password, user["password"]):
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit faire au moins 8 caractères")
    # Password history check (last 5)
    history = user.get("password_history", []) or []
    # Include current password in the comparison
    full_history = [user["password"]] + history
    for old_hash in full_history[:5]:
        try:
            if verify_password(payload.new_password, old_hash):
                raise HTTPException(
                    status_code=400,
                    detail="Mot de passe déjà utilisé récemment. Choisissez-en un différent des 5 derniers.",
                )
        except HTTPException:
            raise
        except Exception:
            continue
    # Update, prepend old hash to history (keep last 5)
    new_history = ([user["password"]] + history)[:5]
    new_hash = hash_password(payload.new_password)
    await db.customers.update_one(
        {"id": user["id"]},
        {"$set": {
            "password": new_hash,
            "password_history": new_history,
            "must_change_password": False,
            "password_changed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    try:
        client_ip = request.client.host if request.client else None
        auth_email.send_password_changed(user["email"], user.get("name", ""), ip=client_ip)
    except Exception as e:
        print(f"[auth_email] password_changed send failed: {e}")
    return {"message": "Mot de passe mis à jour avec succès"}


# ---------------------------------------------------------------------------
# Two-factor authentication (TOTP) endpoints
# ---------------------------------------------------------------------------

@router.post("/2fa/setup")
async def totp_setup(current: dict = Depends(get_current_user)):
    """Start 2FA enrollment: generate a fresh pending secret + QR code.
    Secret is stored in totp_pending_secret and becomes active only after /2fa/verify."""
    user = await db.customers.find_one({"id": current.get("sub")})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="La 2FA est déjà activée")
    
    secret = totp_utils.generate_secret()
    uri = totp_utils.build_provisioning_uri(secret, user["email"])
    qr = totp_utils.build_qr_code_data_url(uri)
    
    await db.customers.update_one(
        {"id": user["id"]},
        {"$set": {"totp_pending_secret": secret}},
    )
    return {
        "secret": secret,
        "qr_code": qr,
        "provisioning_uri": uri,
    }

@router.post("/2fa/verify")
async def totp_verify(payload: TotpVerify, request: Request, current: dict = Depends(get_current_user)):
    """Complete 2FA enrollment by verifying the first code.
    Returns recovery codes (shown ONCE)."""
    user = await db.customers.find_one({"id": current.get("sub")})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    pending = user.get("totp_pending_secret")
    if not pending:
        raise HTTPException(status_code=400, detail="Aucun enrôlement 2FA en cours. Démarrez via /2fa/setup")
    if not totp_utils.verify_code(pending, payload.code):
        raise HTTPException(status_code=400, detail="Code invalide")
    
    plain_recovery, hashed_recovery = totp_utils.generate_recovery_codes()
    await db.customers.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "totp_secret": pending,
                "totp_enabled": True,
                "totp_enrolled_at": datetime.now(timezone.utc).isoformat(),
                "recovery_codes": hashed_recovery,
            },
            "$unset": {"totp_pending_secret": ""}
        },
    )
    try:
        client_ip = request.client.host if request.client else None
        auth_email.send_2fa_enabled(user["email"], user.get("name", ""), ip=client_ip)
    except Exception as e:  # noqa: BLE001
        print(f"[auth_email] 2fa_enabled send failed: {e}")
    return {
        "message": "2FA activée avec succès",
        "recovery_codes": plain_recovery,
    }

@router.post("/2fa/disable")
async def totp_disable(payload: TotpDisable, request: Request, current: dict = Depends(get_current_user)):
    """Disable 2FA. Requires re-entering the account password."""
    user = await db.customers.find_one({"id": current.get("sub")})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    if not user.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="La 2FA n'est pas activée")
    await db.customers.update_one(
        {"id": user["id"]},
        {"$set": {"totp_enabled": False}, "$unset": {"totp_secret": "", "recovery_codes": "", "totp_pending_secret": ""}},
    )
    try:
        client_ip = request.client.host if request.client else None
        auth_email.send_2fa_disabled(user["email"], user.get("name", ""), ip=client_ip)
    except Exception as e:  # noqa: BLE001
        print(f"[auth_email] 2fa_disabled send failed: {e}")
    return {"message": "2FA désactivée"}

@router.get("/2fa/status")
async def totp_status(current: dict = Depends(get_current_user)):
    """Return the current 2FA status for the authenticated user."""
    user = await db.customers.find_one({"id": current.get("sub")})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {
        "totp_enabled": bool(user.get("totp_enabled", False)),
        "recovery_codes_remaining": len(user.get("recovery_codes", [])),
        "enrolled_at": user.get("totp_enrolled_at"),
    }

@router.get("/profile/{email}")
async def get_profile(email: str):
    """Get user profile by email"""
    user = await db.customers.find_one({"email": email}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Return profile (now everything is in one collection)
    profile = {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "phone": user.get("phone"),
        "address": user.get("address", ""),
        "city": user.get("city", ""),
        "postal_code": user.get("postal_code", ""),
        "country": user.get("country", "France"),
        "role": user.get("role", "customer"),
        "status": user.get("status", "active"),
        "created_at": user.get("created_at", ""),
    }
    return profile

@router.put("/profile/{email}")
async def update_profile(email: str, profile: ProfileUpdate):
    """Update user profile"""
    user = await db.customers.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    update_data = {k: v for k, v in profile.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update customer record (all in one collection now)
    await db.customers.update_one({"email": email}, {"$set": update_data})
    
    updated = await db.customers.find_one({"email": email}, {"_id": 0, "password": 0})
    return updated

@router.get("/{user_id}")
async def get_user(user_id: str):
    """Get user by ID"""
    user = await db.customers.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user

@router.put("/{user_id}")
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current: dict = Depends(get_current_user),
):
    """Update user. Admins can update anyone; users can only update themselves and cannot change role/permissions/status."""
    existing = await db.customers.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    is_admin = current.get("role") in ("admin", "super_admin")
    is_self = current.get("sub") == user_id
    if not (is_admin or is_self):
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    # Non-admins cannot elevate privileges or change sensitive fields
    if not is_admin:
        for forbidden in ("role", "permissions", "status"):
            update_data.pop(forbidden, None)
    else:
        # Even admins: only super_admin may grant super_admin role
        if update_data.get("role") == "super_admin" and current.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Seul un super_admin peut promouvoir en super_admin")
    
    # Hash password if being updated
    if "password" in update_data:
        update_data["password"] = hash_password(update_data["password"])
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.customers.update_one({"id": user_id}, {"$set": update_data})
    updated = await db.customers.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return updated

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    _admin: dict = Depends(require_admin),
):
    """Delete user permanently (ADMIN ONLY)"""
    existing = await db.customers.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    await db.customers.delete_one({"id": user_id})
    return {"message": "Utilisateur supprimé"}

# Seed admin user if not exists
async def seed_admin_user():
    """Create admin user if not exists. Forces password change on first login when enabled via env."""
    admin = await db.customers.find_one({"email": "admin@bestshop.com"})
    if not admin:
        # Force password change on first login if FORCE_ADMIN_PASSWORD_CHANGE=true (production default)
        force_change = os.environ.get("FORCE_ADMIN_PASSWORD_CHANGE", "true").lower() == "true"
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@bestshop.com",
            "password": hash_password("admin123"),
            "must_change_password": force_change,
            "name": "Administrateur",
            "phone": None,
            "role": "admin",
            "permissions": [],
            "status": "active",
            "email_verified": True,
            # Commercial data (empty for admins)
            "address": "",
            "city": "",
            "postal_code": "",
            "country": "France",
            "total_orders": 0,
            "total_spent": 0,
            "notes": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        }
        await db.customers.insert_one(admin_user)
        print(f"Admin user created: admin@bestshop.com / admin123 (must_change_password={force_change})")



@router.get("/preferences/{email}")
async def get_user_preferences(email: str):
    """Get user preferences"""
    user = await db.customers.find_one({"email": email}, {"_id": 0, "preferences": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Return preferences or default values
    preferences = user.get("preferences", {})
    return {
        "customersItemsPerPage": preferences.get("customersItemsPerPage", 25)
    }

@router.put("/preferences/{email}")
async def update_user_preferences(email: str, preferences: UserPreferences):
    """Update user preferences"""
    user = await db.customers.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Update preferences in database
    update_data = {
        "preferences": preferences.dict(exclude_unset=True),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.customers.update_one({"email": email}, {"$set": update_data})
    
    return {
        "message": "Préférences mises à jour",
        "preferences": preferences.dict()
    }
