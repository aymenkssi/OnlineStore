from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/coupons", tags=["coupons"])

# Will be set from server.py
db = None

def init_db(database):
    global db
    db = database

class CouponCreate(BaseModel):
    code: str
    discount_type: str  # percentage, fixed, free_shipping
    discount_value: float = 0
    min_purchase: float = 0
    max_discount: float = 0
    valid_from: Optional[str] = ""
    valid_until: Optional[str] = ""
    usage_limit: int = 1000
    active: bool = True
    description: str = ""

class CouponUpdate(CouponCreate):
    pass

class CouponValidate(BaseModel):
    code: str

# GET all coupons
@router.get("/")
async def get_coupons():
    coupons = await db.coupons.find({}, {"_id": 0}).to_list(1000)
    return coupons

# POST create coupon
@router.post("/")
async def create_coupon(coupon: CouponCreate):
    # Check duplicate code
    existing = await db.coupons.find_one({"code": coupon.code.upper().strip()})
    if existing:
        raise HTTPException(status_code=400, detail="Ce code promo existe déjà")
    
    doc = {
        "id": str(uuid.uuid4()),
        "code": coupon.code.upper().strip(),
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "min_purchase": coupon.min_purchase,
        "max_discount": coupon.max_discount,
        "valid_from": coupon.valid_from,
        "valid_until": coupon.valid_until,
        "usage_limit": coupon.usage_limit,
        "usage_count": 0,
        "active": coupon.active,
        "description": coupon.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.coupons.insert_one(doc)
    doc.pop("_id", None)
    return doc

# PUT update coupon
@router.put("/{coupon_id}")
async def update_coupon(coupon_id: str, coupon: CouponUpdate):
    existing = await db.coupons.find_one({"id": coupon_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Coupon non trouvé")
    
    # Check duplicate code (excluding current)
    duplicate = await db.coupons.find_one({"code": coupon.code.upper().strip(), "id": {"$ne": coupon_id}})
    if duplicate:
        raise HTTPException(status_code=400, detail="Ce code promo existe déjà")
    
    update_data = {
        "code": coupon.code.upper().strip(),
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "min_purchase": coupon.min_purchase,
        "max_discount": coupon.max_discount,
        "valid_from": coupon.valid_from,
        "valid_until": coupon.valid_until,
        "usage_limit": coupon.usage_limit,
        "active": coupon.active,
        "description": coupon.description,
    }
    await db.coupons.update_one({"id": coupon_id}, {"$set": update_data})
    updated = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    return updated

# DELETE coupon
@router.delete("/{coupon_id}")
async def delete_coupon(coupon_id: str):
    result = await db.coupons.delete_one({"id": coupon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon non trouvé")
    return {"message": "Coupon supprimé"}

# POST toggle active
@router.post("/{coupon_id}/toggle")
async def toggle_coupon(coupon_id: str):
    coupon = await db.coupons.find_one({"id": coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon non trouvé")
    new_status = not coupon.get("active", True)
    await db.coupons.update_one({"id": coupon_id}, {"$set": {"active": new_status}})
    return {"active": new_status}

# POST validate coupon (used by checkout)
@router.post("/validate")
async def validate_coupon(data: CouponValidate):
    code = data.code.upper().strip()
    coupon = await db.coupons.find_one({"code": code, "active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon invalide ou expiré")
    
    # Check expiration
    if coupon.get("valid_until"):
        try:
            expiry_str = coupon["valid_until"]
            if expiry_str:
                expiry = datetime.strptime(expiry_str, "%Y-%m-%d")
                if expiry.date() < datetime.now().date():
                    raise HTTPException(status_code=400, detail="Ce coupon a expiré")
        except (ValueError, TypeError):
            pass
    
    # Check usage limit
    if coupon.get("usage_count", 0) >= coupon.get("usage_limit", 1000):
        raise HTTPException(status_code=400, detail="Ce coupon a atteint sa limite d'utilisation")
    
    return {
        "valid": True,
        "code": coupon["code"],
        "discount_type": coupon["discount_type"],
        "discount_value": coupon["discount_value"],
        "min_purchase": coupon.get("min_purchase", 0)
    }

# Seed default coupons if collection is empty
async def seed_default_coupons():
    count = await db.coupons.count_documents({})
    if count == 0:
        defaults = [
            {
                "id": str(uuid.uuid4()),
                "code": "BIENVENUE10",
                "discount_type": "percentage",
                "discount_value": 10,
                "min_purchase": 50,
                "max_discount": 30,
                "valid_from": "2025-01-01",
                "valid_until": "2026-12-31",
                "usage_limit": 1000,
                "usage_count": 45,
                "active": True,
                "description": "Réduction de bienvenue pour les nouveaux clients",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "code": "SOLDES20",
                "discount_type": "percentage",
                "discount_value": 20,
                "min_purchase": 100,
                "max_discount": 50,
                "valid_from": "2025-06-01",
                "valid_until": "2026-06-30",
                "usage_limit": 500,
                "usage_count": 123,
                "active": True,
                "description": "Soldes d'été - 20% de réduction",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.coupons.insert_many(defaults)
