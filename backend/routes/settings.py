from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import bcrypt
import uuid

from auth_deps import require_admin

router = APIRouter(prefix="/api/settings", tags=["settings"])

db = None

def init_db(database):
    global db
    db = database

# Models
class PaymentSettings(BaseModel):
    currency: str = "EUR"
    currency_symbol: str = "€"
    payment_methods: List[str] = ["card", "paypal"]
    stripe_enabled: bool = False
    paypal_enabled: bool = False
    cash_on_delivery: bool = True
    min_order_amount: float = 0
    free_shipping_threshold: float = 400
    shipping_cost: float = 9.90

class StyleSettings(BaseModel):
    primary_color: str = "#000000"
    secondary_color: str = "#DC2626"
    background_color: str = "#FFFFFF"
    text_color: str = "#000000"
    accent_color: str = "#3B82F6"
    font_family: str = "Inter, sans-serif"
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    header_style: str = "default"
    footer_style: str = "default"
    button_style: str = "rounded"  # rounded, square, pill
    # Promotion zone settings
    promotion_bg_color: str = "#DC2626"
    promotion_bg_color_end: str = "#EF4444"
    promotion_image_size: str = "large"  # small, medium, large, xlarge
    # New arrivals zone settings
    newarrivals_bg_color: str = "#1E40AF"
    newarrivals_bg_color_end: str = "#3B82F6"
    newarrivals_image_size: str = "large"  # small, medium, large, xlarge
    # Recommendations zone settings
    recommendations_enabled: bool = True
    recommendations_bg_color: str = "#7C3AED"
    recommendations_bg_color_end: str = "#6366F1"
    recommendations_image_size: str = "medium"  # small, medium, large, xlarge
    recommendations_display_type: str = "carousel"  # carousel, grid
    recommendations_title: str = "Recommandations pour vous"
    recommendations_subtitle: str = "Basé sur votre historique de navigation"
    recommendations_limit: int = 8
    # Recently viewed zone settings
    recently_viewed_enabled: bool = True
    recently_viewed_bg_color: str = "#374151"
    recently_viewed_bg_color_end: str = "#1F2937"
    recently_viewed_title: str = "Vus récemment"
    recently_viewed_limit: int = 6
    # Top Banner settings
    banner_enabled: bool = True
    banner_text: str = "Livraison gratuite à partir de 400€ d'achat"
    banner_bg_color: str = "#F3F4F6"
    banner_text_color: str = "#1F2937"
    banner_animation: str = "none"  # none, scroll-left, scroll-right, fade
    banner_animation_speed: int = 30  # seconds for one full scroll
    banner_font_size: int = 14  # px
    # Image upload settings
    max_image_size_mb: float = 5.0

class SiteSettings(BaseModel):
    site_name: str = "BEST SHOP"
    site_description: str = "Mode & Accessoires de Luxe"
    contact_email: str = "contact@bestshop.com"
    contact_phone: str = "+33 1 23 45 67 89"
    address: str = "123 Avenue de la Mode, 75008 Paris, France"
    social_facebook: Optional[str] = None
    social_instagram: Optional[str] = None
    social_twitter: Optional[str] = None
    social_linkedin: Optional[str] = None
    meta_title: str = "BEST SHOP - Mode & Accessoires de Luxe"
    meta_description: str = "Découvrez notre collection de mode et accessoires de luxe"
    google_analytics_id: Optional[str] = None
    maintenance_mode: bool = False
    # Categories display settings
    categories_per_row: int = 3  # Number of categories per row (2, 3, 4, or 6)
    categories_title: str = "Choisissez un rayon"


class SecuritySettings(BaseModel):
    deletion_code: str = "0000"  # Code par défaut
    require_code_for_deletion: bool = True
    code_description: str = "Code de confirmation pour les suppressions"

class AdminUser(BaseModel):
    email: str
    name: str
    password: Optional[str] = None
    role: str = "admin"
    permissions: List[str] = []

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    active: Optional[bool] = None

# Payment Settings Routes
@router.get("/payment")
async def get_payment_settings():
    settings = await db.settings.find_one({"type": "payment"}, {"_id": 0})
    if not settings:
        return PaymentSettings().model_dump()
    return settings.get("data", PaymentSettings().model_dump())

@router.put("/payment")
async def update_payment_settings(settings: PaymentSettings, _admin: dict = Depends(require_admin)):
    await db.settings.update_one(
        {"type": "payment"},
        {"$set": {"type": "payment", "data": settings.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return settings

# Style Settings Routes
@router.get("/style")
async def get_style_settings():
    settings = await db.settings.find_one({"type": "style"}, {"_id": 0})
    if not settings:
        return StyleSettings().model_dump()
    return settings.get("data", StyleSettings().model_dump())

@router.put("/style")
async def update_style_settings(settings: StyleSettings, _admin: dict = Depends(require_admin)):
    await db.settings.update_one(
        {"type": "style"},
        {"$set": {"type": "style", "data": settings.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return settings

# Site Settings Routes
@router.get("/site")
async def get_site_settings():
    settings = await db.settings.find_one({"type": "site"}, {"_id": 0})
    if not settings:
        return SiteSettings().model_dump()
    return settings.get("data", SiteSettings().model_dump())

@router.put("/site")
async def update_site_settings(settings: SiteSettings, _admin: dict = Depends(require_admin)):
    await db.settings.update_one(
        {"type": "site"},
        {"$set": {"type": "site", "data": settings.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return settings

# Site Texts Routes (for frontend labels/content)
@router.get("/texts")
async def get_site_texts():
    settings = await db.settings.find_one({"type": "texts"}, {"_id": 0})
    if not settings:
        return {}
    return settings.get("data", {})

@router.put("/texts")
async def update_site_texts(texts: Dict[str, Any], _admin: dict = Depends(require_admin)):
    await db.settings.update_one(
        {"type": "texts"},
        {"$set": {"type": "texts", "data": texts, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return texts

# Admin Users Routes
@router.get("/admins")
async def get_admin_users(_admin: dict = Depends(require_admin)):
    admins = await db.admin_users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return admins

@router.get("/admins/{admin_id}")
async def get_admin_user(admin_id: str, _admin: dict = Depends(require_admin)):
    admin = await db.admin_users.find_one({"id": admin_id}, {"_id": 0, "password": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Administrateur non trouvé")
    return admin

@router.post("/admins")
async def create_admin_user(admin: AdminUser, _admin: dict = Depends(require_admin)):
    # Check if email already exists
    existing = await db.admin_users.find_one({"email": admin.email})
    if existing:
        raise HTTPException(status_code=400, detail="Un administrateur avec cet email existe déjà")
    
    admin_dict = admin.model_dump()
    admin_dict["id"] = str(uuid.uuid4())
    admin_dict["active"] = True
    admin_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    admin_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Hash the password with bcrypt before storage
    if admin_dict.get("password"):
        raw_pwd = admin_dict.pop("password")
        admin_dict["password_hash"] = bcrypt.hashpw(raw_pwd.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.admin_users.insert_one(admin_dict)
    admin_dict.pop("_id", None)
    admin_dict.pop("password_hash", None)
    return admin_dict

@router.put("/admins/{admin_id}")
async def update_admin_user(admin_id: str, admin_update: AdminUserUpdate, _admin: dict = Depends(require_admin)):
    existing = await db.admin_users.find_one({"id": admin_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Administrateur non trouvé")
    
    update_data = {k: v for k, v in admin_update.model_dump().items() if v is not None}
    # Hash password on update if provided
    if "password" in update_data:
        raw_pwd = update_data.pop("password")
        update_data["password_hash"] = bcrypt.hashpw(raw_pwd.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.admin_users.update_one({"id": admin_id}, {"$set": update_data})
    updated = await db.admin_users.find_one({"id": admin_id}, {"_id": 0, "password": 0, "password_hash": 0})
    return updated

@router.delete("/admins/{admin_id}")
async def delete_admin_user(admin_id: str, _admin: dict = Depends(require_admin)):
    # Don't allow deleting the last admin
    count = await db.admin_users.count_documents({"active": True})
    if count <= 1:
        raise HTTPException(status_code=400, detail="Impossible de supprimer le dernier administrateur")
    
    result = await db.admin_users.delete_one({"id": admin_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Administrateur non trouvé")
    return {"message": "Administrateur supprimé"}

# Seed default settings and admin
async def seed_default_settings():
    # Seed payment settings
    payment_exists = await db.settings.find_one({"type": "payment"})
    if not payment_exists:
        await db.settings.insert_one({
            "type": "payment",
            "data": PaymentSettings().model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Seed style settings
    style_exists = await db.settings.find_one({"type": "style"})
    if not style_exists:
        await db.settings.insert_one({
            "type": "style",
            "data": StyleSettings().model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Seed site settings
    site_exists = await db.settings.find_one({"type": "site"})
    if not site_exists:
        await db.settings.insert_one({
            "type": "site",
            "data": SiteSettings().model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Seed default admin user
    admin_count = await db.admin_users.count_documents({})
    if admin_count == 0:
        default_admins = [
            {
                "id": str(uuid.uuid4()),
                "email": "admin@bestshop.com",
                "name": "Super Admin",
                "role": "super_admin",
                "permissions": ["all"],
                "password_hash": "admin123",  # In production, hash this
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "email": "manager@bestshop.com",
                "name": "Store Manager",
                "role": "manager",
                "permissions": ["orders", "products", "customers"],
                "password_hash": "manager123",
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.admin_users.insert_many(default_admins)



# Security Settings Routes
@router.get("/security")
async def get_security_settings():
    """Get security settings"""
    settings_doc = await db.settings.find_one({"type": "security"})
    if not settings_doc:
        # Return default settings
        return {
            "deletion_code": "0000",
            "require_code_for_deletion": True,
            "code_description": "Code de confirmation pour les suppressions"
        }
    return settings_doc.get("data", {})

@router.put("/security")
async def update_security_settings(settings: SecuritySettings, _admin: dict = Depends(require_admin)):
    """Update security settings"""
    await db.settings.update_one(
        {"type": "security"},
        {
            "$set": {
                "type": "security",
                "data": settings.dict(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    return {"message": "Security settings updated successfully", "data": settings.dict()}

@router.post("/verify-deletion-code")
async def verify_deletion_code(code: dict):
    """Verify deletion code"""
    settings_doc = await db.settings.find_one({"type": "security"})
    if not settings_doc:
        # Default code is "0000"
        stored_code = "0000"
    else:
        stored_code = settings_doc.get("data", {}).get("deletion_code", "0000")
    
    provided_code = code.get("code", "")
    
    if provided_code == stored_code:
        return {"valid": True, "message": "Code correct"}
    else:
        return {"valid": False, "message": "Code incorrect"}
