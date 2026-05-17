from fastapi import FastAPI, APIRouter, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

from rate_limit import limiter


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(redirect_slashes=False)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Endpoints pour exporter les données DB
from db_manager import export_all_collections, import_all_collections
from auth_deps import require_admin

@api_router.post("/db/export")
async def export_database(_admin: dict = Depends(require_admin)):
    """Exporte toutes les collections MongoDB (ADMIN ONLY)"""
    result = await export_all_collections()
    return {"message": "Export réussi", "collections": result}

@api_router.get("/db/export")
async def export_database_get(_admin: dict = Depends(require_admin)):
    """Exporte toutes les collections MongoDB (ADMIN ONLY)"""
    result = await export_all_collections()
    return {"message": "Export réussi", "collections": result}

# Include the router in the main app
app.include_router(api_router)

# Include auth router (already has /api prefix in it)
from routes.auth import router as auth_router
app.include_router(auth_router)

# Include OAuth router for Google
from routes.oauth import router as oauth_router
app.include_router(oauth_router)

# Auto-translation (MyMemory free API)
from routes.translate import router as translate_router
app.include_router(translate_router)

# WebAuthn / FIDO2 router (loaded lazily to avoid blocking startup on import errors)
try:
    from routes.webauthn_routes import router as webauthn_router
    app.include_router(webauthn_router)
except Exception as _webauthn_err:  # noqa: BLE001
    print(f"[webauthn] router not loaded: {_webauthn_err}")

# Include Coupons router
from routes.coupons import router as coupons_router, init_db as init_coupons_db, seed_default_coupons
init_coupons_db(db)
app.include_router(coupons_router)

# Include Products router
from routes.products import router as products_router, init_db as init_products_db
init_products_db(db)
app.include_router(products_router)

# Include Categories router
from routes.categories import router as categories_router, init_db as init_categories_db
init_categories_db(db)
app.include_router(categories_router)

# Include Attributes router
from routes.attributes import router as attributes_router, init_db as init_attributes_db
init_attributes_db(db)
app.include_router(attributes_router)

# Include Migration router
from routes.migrate import router as migrate_router, init_db as init_migrate_db
init_migrate_db(db)
app.include_router(migrate_router)

# Include Orders router
from routes.orders import router as orders_router, init_db as init_orders_db, seed_sample_orders
init_orders_db(db)
app.include_router(orders_router)

# Include Customers router
from routes.customers import router as customers_router, init_db as init_customers_db, seed_sample_customers
init_customers_db(db)
app.include_router(customers_router)

# Include Returns router
from routes.returns import router as returns_router, init_db as init_returns_db, seed_sample_returns
init_returns_db(db)
app.include_router(returns_router)

# Include Promotions router
from routes.promotions import router as promotions_router, init_db as init_promotions_db, seed_sample_promotions
init_promotions_db(db)
app.include_router(promotions_router)

# Include Settings router (Payment, Style, Site, Admins)
from routes.settings import router as settings_router, init_db as init_settings_db, seed_default_settings
init_settings_db(db)
app.include_router(settings_router)

# Include Statistics router
from routes.stats import router as stats_router, init_db as init_stats_db
init_stats_db(db)
app.include_router(stats_router)

# Include Notifications router
from routes.notifications import router as notifications_router
app.include_router(notifications_router)

# Include Newsletter router
from routes.newsletter import router as newsletter_router
app.include_router(newsletter_router, prefix="/api/newsletter", tags=["newsletter"])

# Include Recommendations router
from routes.recommendations import router as recommendations_router, init_db as init_recommendations_db
init_recommendations_db(db)
app.include_router(recommendations_router)

# Include Upload router
from routes.upload import router as upload_router
app.include_router(upload_router)

# Include Users router
from routes.users import router as users_router, init_db as init_users_db, seed_admin_user
init_users_db(db)
app.include_router(users_router)

# Pages routes
from routes.pages import router as pages_router
app.include_router(pages_router, prefix="/api/pages", tags=["pages"])

# Stripe Payments router
from routes.payments import router as payments_router, init_db as init_payments_db
init_payments_db(db)
app.include_router(payments_router)

# Stripe webhook (also at /api/webhook/stripe for direct access)
from routes.payments import stripe_webhook as _stripe_webhook_handler
@api_router.post("/webhook/stripe")
async def stripe_webhook_alias(request: Request):
    return await _stripe_webhook_handler(request)


@app.on_event("startup")
async def startup_event():
    # === License check (one-shot at first startup, must succeed before any data is loaded) ===
    from license_check import check_license, LicenseError
    try:
        await check_license()
    except LicenseError as e:
        print(f"[license] FATAL: {e}")
        # Hard-fail: refuse to start. Supervisor/Kubernetes will restart and fail again
        # until a valid license is provided.
        import sys
        sys.exit(1)
    # NOTE: heartbeat loop has been removed — license is verified ONCE on first startup.

    # D'abord, restaurer les données depuis les fichiers seed si les collections sont vides
    imported = await import_all_collections()
    if imported:
        print(f"Données restaurées depuis seed_data: {imported}")
    
    # Seed all default data (ne crée que si collections vides)
    await seed_default_coupons()
    await seed_sample_orders()
    await seed_sample_customers()
    await seed_sample_returns()
    await seed_sample_promotions()
    await seed_default_settings()
    await seed_admin_user()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    # CORS_ORIGINS env var must be explicitly set; no wildcard fallback to prevent accidental opening in production
    allow_origins=[o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',') if o.strip()],
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Requested-With"],
)

# Security headers middleware (OWASP recommended)
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains"
        )
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        # Content-Security-Policy — hardened XSS defense-in-depth.
        # unsafe-inline kept for script (PostHog + emergent inline bootstraps) and style (Tailwind).
        # Specific external CDNs whitelisted. Upgrade-insecure-requests forces HTTPS.
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; "
            "img-src 'self' data: blob: https:; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "script-src 'self' 'unsafe-inline' https://assets.emergent.sh https://*.posthog.com; "
            "connect-src 'self' https: wss:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "object-src 'none'; "
            "upgrade-insecure-requests"
        )
        # Also add Cross-Origin policies for additional isolation
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    # Auto-export des données avant l'arrêt
    try:
        result = await export_all_collections()
        print(f"Données exportées automatiquement: {result}")
    except Exception as e:
        print(f"Erreur export auto: {e}")
    client.close()