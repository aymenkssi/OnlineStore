from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/returns", tags=["returns"])

db = None

def init_db(database):
    global db
    db = database

# Models
class ReturnItem(BaseModel):
    product_id: str
    name: str
    quantity: int
    price: float
    reason: str

class ReturnCreate(BaseModel):
    order_id: str
    order_number: str
    customer_email: str
    customer_name: str
    items: List[ReturnItem]
    reason: str
    description: Optional[str] = None
    refund_amount: float

class ReturnUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    refund_status: Optional[str] = None

# Routes
@router.get("/")
async def get_returns(status: Optional[str] = None, limit: int = 100, skip: int = 0):
    query = {}
    if status:
        query["status"] = status
    total = await db.returns.count_documents(query)
    returns = await db.returns.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {
        "items": returns,
        "total": total,
        "limit": limit,
        "skip": skip,
        "has_more": skip + len(returns) < total
    }

@router.get("/stats")
async def get_return_stats():
    """Get return statistics"""
    total_returns = await db.returns.count_documents({})
    pending_returns = await db.returns.count_documents({"status": "pending"})
    approved_returns = await db.returns.count_documents({"status": "approved"})
    shipped_returns = await db.returns.count_documents({"status": "shipped"})
    received_returns = await db.returns.count_documents({"status": "received"})
    rejected_returns = await db.returns.count_documents({"status": "rejected"})
    completed_returns = await db.returns.count_documents({"status": "completed"})
    in_progress = approved_returns + shipped_returns + received_returns
    
    # Calculate total refunded amount
    pipeline = [
        {"$match": {"refund_status": "refunded"}},
        {"$group": {"_id": None, "total": {"$sum": "$refund_amount"}}}
    ]
    refund_result = await db.returns.aggregate(pipeline).to_list(1)
    total_refunded = refund_result[0]["total"] if refund_result else 0
    
    return {
        "total_returns": total_returns,
        "pending": pending_returns,
        "approved": approved_returns,
        "shipped": shipped_returns,
        "received": received_returns,
        "rejected": rejected_returns,
        "completed": completed_returns,
        "in_progress": in_progress,
        "total_refunded": total_refunded
    }

@router.get("/{return_id}")
async def get_return(return_id: str):
    return_doc = await db.returns.find_one({"id": return_id}, {"_id": 0})
    if not return_doc:
        raise HTTPException(status_code=404, detail="Retour non trouvé")
    return return_doc

@router.get("/order/{order_id}")
async def get_returns_by_order(order_id: str):
    returns = await db.returns.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    return returns

@router.post("/")
async def create_return(return_req: ReturnCreate):
    return_dict = return_req.model_dump()
    return_dict["id"] = str(uuid.uuid4())
    return_dict["return_number"] = f"RET-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    return_dict["status"] = "pending"
    return_dict["refund_status"] = "pending"
    return_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    return_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Fill missing images, colors, sizes from order or product catalog
    order_id = return_dict.get("order_id")
    if order_id:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0, "items": 1})
        order_items = {i.get("name"): i for i in (order or {}).get("items", [])}
        for item in return_dict.get("items", []):
            oi = order_items.get(item.get("name"), {})
            if not item.get("image"):
                if oi.get("image"):
                    item["image"] = oi["image"]
                else:
                    product = await db.products.find_one({"name": item.get("name")}, {"_id": 0, "images": 1})
                    if product and product.get("images"):
                        item["image"] = product["images"][0]
            if not item.get("color") and oi.get("color"):
                item["color"] = oi["color"]
            if not item.get("size") and oi.get("size"):
                item["size"] = oi["size"]
    
    await db.returns.insert_one(return_dict)
    return_dict.pop("_id", None)
    
    # Create notification for new return
    try:
        from notification_service import notify_new_return
        await notify_new_return(return_dict)
    except Exception:
        pass  # Don't fail return creation if notification fails
    
    return return_dict

@router.put("/{return_id}")
async def update_return(return_id: str, return_update: ReturnUpdate):
    existing = await db.returns.find_one({"id": return_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Retour non trouvé")
    
    update_data = {k: v for k, v in return_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.returns.update_one({"id": return_id}, {"$set": update_data})
    updated = await db.returns.find_one({"id": return_id}, {"_id": 0})
    return updated

@router.put("/{return_id}/approve")
async def approve_return(return_id: str):
    existing = await db.returns.find_one({"id": return_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Retour non trouvé")
    
    await db.returns.update_one(
        {"id": return_id},
        {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Retour approuvé", "status": "approved"}

@router.put("/{return_id}/status")
async def update_return_status(return_id: str, status: str):
    """Update return status - used by client for 'shipped' confirmation"""
    existing = await db.returns.find_one({"id": return_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Retour non trouvé")
    
    valid_statuses = ["pending", "approved", "shipped", "received", "completed", "rejected"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    await db.returns.update_one(
        {"id": return_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Statut mis à jour: {status}", "status": status}

@router.put("/{return_id}/reject")
async def reject_return(return_id: str, reason: Optional[str] = None):
    existing = await db.returns.find_one({"id": return_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Retour non trouvé")
    
    update_data = {
        "status": "rejected",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if reason:
        update_data["admin_notes"] = reason
    
    await db.returns.update_one({"id": return_id}, {"$set": update_data})
    return {"message": "Retour rejeté", "status": "rejected"}

@router.put("/{return_id}/complete")
async def complete_return(return_id: str):
    existing = await db.returns.find_one({"id": return_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Retour non trouvé")
    
    await db.returns.update_one(
        {"id": return_id},
        {"$set": {
            "status": "completed",
            "refund_status": "refunded",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Retour complété et remboursé", "status": "completed"}


@router.put("/{return_id}/restock")
async def restock_return(return_id: str):
    """Réintégrer les articles retournés dans le stock"""
    existing = await db.returns.find_one({"id": return_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Retour non trouvé")
    
    if existing.get("restocked"):
        raise HTTPException(status_code=400, detail="Stock déjà réintégré pour ce retour")
    
    # Get original order to find color/size if missing from return items
    order_id = existing.get("order_id")
    order_items_lookup = {}
    if order_id:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0, "items": 1})
        if order:
            for oi in order.get("items", []):
                order_items_lookup[oi.get("name", "")] = oi
    
    restocked_items = []
    
    for item in existing.get("items", []):
        product_id = item.get("product_id", "")
        qty = item.get("quantity", 0)
        size = item.get("size", "")
        color = item.get("color", "")
        
        # Fallback: get color/size from original order if missing
        if (not size or not color) and item.get("name") in order_items_lookup:
            oi = order_items_lookup[item["name"]]
            if not size:
                size = oi.get("size", "")
            if not color:
                color = oi.get("color", "")
        
        if not product_id or qty <= 0:
            continue
        
        product = await db.products.find_one({"id": product_id})
        if not product:
            # Try by name
            product = await db.products.find_one({"name": item.get("name")})
        
        if not product:
            restocked_items.append({"product_id": product_id, "name": item.get("name"), "status": "product_not_found"})
            continue
        
        updated = False
        
        # Update variant stock if color and size match
        if product.get("variants") and color and size:
            result = await db.products.update_one(
                {"id": product.get("id"), "variants.color": color, "variants.size": size},
                {"$inc": {"variants.$.stock": qty}}
            )
            if result.modified_count > 0:
                updated = True
        
        # Also update sizes stock if size matches
        if product.get("sizes") and size:
            result = await db.products.update_one(
                {"id": product.get("id"), "sizes.size": size},
                {"$inc": {"sizes.$.stock": qty}}
            )
            if result.modified_count > 0:
                updated = True
        
        # Fallback: if no variant/size match, try first variant or general stock
        if not updated and product.get("variants"):
            result = await db.products.update_one(
                {"id": product.get("id"), "variants.0": {"$exists": True}},
                {"$inc": {"variants.0.stock": qty}}
            )
            if result.modified_count > 0:
                updated = True
        
        if not updated and product.get("sizes"):
            result = await db.products.update_one(
                {"id": product.get("id"), "sizes.0": {"$exists": True}},
                {"$inc": {"sizes.0.stock": qty}}
            )
            if result.modified_count > 0:
                updated = True
        
        # Update the return item with color/size for future inventory calculations
        if color or size:
            await db.returns.update_one(
                {"id": return_id, "items.name": item.get("name")},
                {"$set": {"items.$.color": color, "items.$.size": size}}
            )
        
        restocked_items.append({
            "product_id": product_id,
            "name": item.get("name"),
            "quantity": qty,
            "color": color,
            "size": size,
            "status": "restocked" if updated else "no_match"
        })
    
    # Mark return as restocked
    await db.returns.update_one(
        {"id": return_id},
        {"$set": {
            "restocked": True,
            "restocked_at": datetime.now(timezone.utc).isoformat(),
            "restocked_items": restocked_items,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Stock réintégré avec succès",
        "restocked_items": restocked_items
    }

@router.delete("/{return_id}")
async def delete_return(return_id: str):
    result = await db.returns.delete_one({"id": return_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Retour non trouvé")
    return {"message": "Retour supprimé"}

# Seed sample returns
async def seed_sample_returns():
    count = await db.returns.count_documents({})
    if count == 0:
        sample_returns = [
            {
                "id": str(uuid.uuid4()),
                "return_number": "RET-20260102-X1Y2Z3W4",
                "order_id": "sample-order-1",
                "order_number": "ORD-20260101-A1B2C3D4",
                "customer_email": "client.test@email.com",
                "customer_name": "Client Test",
                "items": [
                    {"product_id": "3", "name": "Baskets Designer", "quantity": 1, "price": 650, "reason": "Mauvaise taille"}
                ],
                "reason": "Mauvaise taille",
                "description": "Les chaussures sont trop petites, je souhaite échanger pour une taille supérieure.",
                "refund_amount": 650,
                "status": "pending",
                "refund_status": "pending",
                "created_at": "2026-01-02T11:00:00Z",
                "updated_at": "2026-01-02T11:00:00Z"
            },
            {
                "id": str(uuid.uuid4()),
                "return_number": "RET-20260103-A5B6C7D8",
                "order_id": "sample-order-2",
                "order_number": "ORD-20251228-E5F6G7H8",
                "customer_email": "autre.client@email.com",
                "customer_name": "Autre Client",
                "items": [
                    {"product_id": "6", "name": "Pull en Cachemire", "quantity": 1, "price": 340, "reason": "Défaut de fabrication"}
                ],
                "reason": "Défaut de fabrication",
                "description": "Le pull présente un trou au niveau de la couture.",
                "refund_amount": 340,
                "status": "approved",
                "refund_status": "pending",
                "admin_notes": "Défaut confirmé, remboursement autorisé",
                "created_at": "2026-01-03T14:30:00Z",
                "updated_at": "2026-01-03T16:00:00Z"
            }
        ]
        await db.returns.insert_many(sample_returns)
