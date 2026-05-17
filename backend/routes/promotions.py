import os
import sys
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _parent not in sys.path:
    sys.path.insert(0, _parent)
from auth_deps import require_admin

router = APIRouter(prefix="/api/promotions", tags=["promotions"])

db = None

def init_db(database):
    global db
    db = database

# Models
class PromotionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    discount_type: str  # percentage, fixed, buy_x_get_y
    discount_value: float
    conditions: Optional[dict] = None  # min_purchase, specific_categories, specific_products
    start_date: str
    end_date: str
    active: bool = True
    banner_image: Optional[str] = None
    applicable_to: str = "all"  # all, categories, products
    applicable_items: List[str] = []  # category slugs or product ids

class PromotionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    conditions: Optional[dict] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    active: Optional[bool] = None
    banner_image: Optional[str] = None
    applicable_to: Optional[str] = None
    applicable_items: Optional[List[str]] = None

# Routes
@router.get("/")
async def get_promotions(active_only: bool = False):
    query = {}
    if active_only:
        query["active"] = True
    promotions = await db.promotions.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return promotions

@router.get("/active")
async def get_active_promotions():
    """Get currently active promotions"""
    now = datetime.now(timezone.utc).isoformat()
    query = {
        "active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }
    promotions = await db.promotions.find(query, {"_id": 0}).to_list(100)
    return promotions

@router.get("/{promotion_id}")
async def get_promotion(promotion_id: str):
    promotion = await db.promotions.find_one({"id": promotion_id}, {"_id": 0})
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion non trouvée")
    return promotion

@router.post("/")
async def create_promotion(promotion: PromotionCreate, _admin: dict = Depends(require_admin)):
    promotion_dict = promotion.model_dump()
    promotion_dict["id"] = str(uuid.uuid4())
    promotion_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    promotion_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.promotions.insert_one(promotion_dict)
    promotion_dict.pop("_id", None)
    return promotion_dict

@router.put("/{promotion_id}")
async def update_promotion(promotion_id: str, promotion_update: PromotionUpdate, _admin: dict = Depends(require_admin)):
    existing = await db.promotions.find_one({"id": promotion_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Promotion non trouvée")
    
    update_data = {k: v for k, v in promotion_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.promotions.update_one({"id": promotion_id}, {"$set": update_data})
    updated = await db.promotions.find_one({"id": promotion_id}, {"_id": 0})
    return updated

@router.post("/{promotion_id}/toggle")
async def toggle_promotion(promotion_id: str, _admin: dict = Depends(require_admin)):
    promotion = await db.promotions.find_one({"id": promotion_id})
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion non trouvée")
    
    new_status = not promotion.get("active", True)
    await db.promotions.update_one(
        {"id": promotion_id},
        {"$set": {"active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"active": new_status}

@router.delete("/{promotion_id}")
async def delete_promotion(promotion_id: str, _admin: dict = Depends(require_admin)):
    result = await db.promotions.delete_one({"id": promotion_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promotion non trouvée")
    return {"message": "Promotion supprimée"}

# Seed sample promotions
async def seed_sample_promotions():
    count = await db.promotions.count_documents({})
    if count == 0:
        sample_promotions = [
            {
                "id": str(uuid.uuid4()),
                "name": "Soldes d'Hiver",
                "description": "Profitez de -30% sur toute la collection hiver",
                "discount_type": "percentage",
                "discount_value": 30,
                "conditions": {"min_purchase": 100},
                "start_date": "2026-01-01T00:00:00Z",
                "end_date": "2026-02-28T23:59:59Z",
                "active": True,
                "banner_image": "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&q=80",
                "applicable_to": "all",
                "applicable_items": [],
                "created_at": "2025-12-15T10:00:00Z",
                "updated_at": "2025-12-15T10:00:00Z"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Offre Spéciale Sacs",
                "description": "20% de réduction sur tous les sacs",
                "discount_type": "percentage",
                "discount_value": 20,
                "conditions": None,
                "start_date": "2026-01-15T00:00:00Z",
                "end_date": "2026-01-31T23:59:59Z",
                "active": True,
                "banner_image": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&q=80",
                "applicable_to": "categories",
                "applicable_items": ["sacs"],
                "created_at": "2026-01-10T14:00:00Z",
                "updated_at": "2026-01-10T14:00:00Z"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Livraison Gratuite",
                "description": "Livraison offerte dès 150€ d'achat",
                "discount_type": "free_shipping",
                "discount_value": 0,
                "conditions": {"min_purchase": 150},
                "start_date": "2026-01-01T00:00:00Z",
                "end_date": "2026-12-31T23:59:59Z",
                "active": True,
                "banner_image": None,
                "applicable_to": "all",
                "applicable_items": [],
                "created_at": "2025-12-01T09:00:00Z",
                "updated_at": "2025-12-01T09:00:00Z"
            }
        ]
        await db.promotions.insert_many(sample_promotions)
