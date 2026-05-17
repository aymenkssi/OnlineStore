from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from auth_deps import require_admin, get_current_user, get_optional_user

router = APIRouter(prefix="/api/orders", tags=["orders"])

db = None

def init_db(database):
    global db
    db = database

# Models
class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    color: Optional[str] = None
    size: Optional[str] = None
    image: Optional[str] = None

class ShippingAddress(BaseModel):
    firstName: str
    lastName: str
    address: str
    city: str
    postalCode: str
    country: str = "France"
    phone: Optional[str] = None

class OrderCreate(BaseModel):
    items: List[OrderItem]
    shipping_address: ShippingAddress
    subtotal: float
    shipping_cost: float = 0
    discount: float = 0
    total: float
    coupon_code: Optional[str] = None
    payment_method: str = "card"
    customer_email: str
    customer_name: str

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    tracking_number: Optional[str] = None
    notes: Optional[str] = None

# Routes
@router.get("/")
async def get_orders(status: Optional[str] = None, limit: int = 100, skip: int = 0):
    query = {}
    if status:
        query["status"] = status
    total = await db.orders.count_documents(query)
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {
        "items": orders,
        "total": total,
        "limit": limit,
        "skip": skip,
        "has_more": skip + len(orders) < total
    }

@router.get("/stats")
async def get_order_stats():
    """Get order statistics for dashboard"""
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    processing_orders = await db.orders.count_documents({"status": "processing"})
    confirmed_orders = await db.orders.count_documents({"status": "confirmed"})
    shipped_orders = await db.orders.count_documents({"status": "shipped"})
    delivered_orders = await db.orders.count_documents({"status": "delivered"})
    received_orders = await db.orders.count_documents({"status": "received"})
    cancelled_orders = await db.orders.count_documents({"status": "cancelled"})
    
    # Calculate total revenue
    pipeline = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Calculate total cost (purchase prices of sold items)
    orders = await db.orders.find({"status": {"$ne": "cancelled"}}, {"_id": 0}).to_list(10000)
    total_cost = 0
    
    for order in orders:
        for item in order.get("items", []):
            # Get product purchase price
            product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0, "purchasePrice": 1})
            if product and product.get("purchasePrice"):
                total_cost += product["purchasePrice"] * item["quantity"]
    
    profit = total_revenue - total_cost
    
    return {
        "total": total_orders,
        "total_orders": total_orders,
        "pending": pending_orders,
        "processing": processing_orders,
        "confirmed": confirmed_orders,
        "shipped": shipped_orders,
        "delivered": delivered_orders,
        "received": received_orders,
        "cancelled": cancelled_orders,
        "total_revenue": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "profit": round(profit, 2)
    }

@router.get("/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    return order

@router.get("/customer/{email}")
async def get_customer_orders(email: str, current: dict = Depends(get_current_user)):
    # Users can only see their own orders unless they are admin
    if current.get("email") != email and current.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Accès refusé")
    orders = await db.orders.find({"customer_email": email}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@router.post("/")
async def create_order(order: OrderCreate):
    order_dict = order.model_dump()
    order_dict["id"] = str(uuid.uuid4())
    order_dict["order_number"] = f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    order_dict["status"] = "pending"
    order_dict["payment_status"] = "pending"
    order_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    order_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.orders.insert_one(order_dict)
    order_dict.pop("_id", None)
    
    # Create notification for new order
    try:
        from notification_service import notify_new_order
        await notify_new_order(order_dict)
    except Exception:
        pass  # Don't fail order creation if notification fails
    
    # Send order confirmation email for non-card payments (card payments send email after Stripe confirms)
    if order_dict.get("payment_method") != "card":
        try:
            import auth_email
            auth_email.send_order_confirmation(
                email=order_dict.get("customer_email", ""),
                name=order_dict.get("customer_name", ""),
                order_number=order_dict.get("order_number", ""),
                total=order_dict.get("total", 0),
                items=order_dict.get("items", []),
            )
        except Exception as e:
            print(f"[auth_email] order confirmation send failed: {e}")
    
    return order_dict

@router.put("/{order_id}")
async def update_order(order_id: str, order_update: OrderUpdate, _admin: dict = Depends(require_admin)):
    existing = await db.orders.find_one({"id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    update_data = {k: v for k, v in order_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return updated

@router.put("/{order_id}/status")
async def update_order_status(order_id: str, status: str, _admin: dict = Depends(require_admin)):
    existing = await db.orders.find_one({"id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    valid_statuses = ["pending", "processing", "confirmed", "shipped", "delivered", "received", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Statut mis à jour", "status": status}

@router.delete("/{order_id}")
async def delete_order(order_id: str, _admin: dict = Depends(require_admin)):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    return {"message": "Commande supprimée"}

# Seed sample orders
async def seed_sample_orders():
    count = await db.orders.count_documents({})
    if count == 0:
        sample_orders = [
            {
                "id": str(uuid.uuid4()),
                "order_number": "ORD-20260101-A1B2C3D4",
                "customer_email": "marie.dupont@email.com",
                "customer_name": "Marie Dupont",
                "items": [
                    {"product_id": "1", "name": "Robe en Soie Élégante", "price": 450, "quantity": 1, "color": "Noir", "size": "M"}
                ],
                "shipping_address": {
                    "firstName": "Marie",
                    "lastName": "Dupont",
                    "address": "15 Rue de la Paix",
                    "city": "Paris",
                    "postalCode": "75001",
                    "country": "France",
                    "phone": "+33612345678"
                },
                "subtotal": 450,
                "shipping_cost": 0,
                "discount": 0,
                "total": 450,
                "status": "delivered",
                "payment_status": "paid",
                "payment_method": "card",
                "created_at": "2026-01-01T10:30:00Z",
                "updated_at": "2026-01-03T15:00:00Z"
            },
            {
                "id": str(uuid.uuid4()),
                "order_number": "ORD-20260102-E5F6G7H8",
                "customer_email": "jean.martin@email.com",
                "customer_name": "Jean Martin",
                "items": [
                    {"product_id": "4", "name": "Blazer en Laine", "price": 780, "quantity": 1, "color": "Marine", "size": "L"},
                    {"product_id": "5", "name": "Chaussures Oxford en Cuir", "price": 420, "quantity": 1, "color": "Noir", "size": "43"}
                ],
                "shipping_address": {
                    "firstName": "Jean",
                    "lastName": "Martin",
                    "address": "42 Avenue des Champs-Élysées",
                    "city": "Paris",
                    "postalCode": "75008",
                    "country": "France",
                    "phone": "+33687654321"
                },
                "subtotal": 1200,
                "shipping_cost": 0,
                "discount": 120,
                "total": 1080,
                "coupon_code": "BIENVENUE10",
                "status": "processing",
                "payment_status": "paid",
                "payment_method": "card",
                "created_at": "2026-01-02T14:15:00Z",
                "updated_at": "2026-01-02T14:15:00Z"
            },
            {
                "id": str(uuid.uuid4()),
                "order_number": "ORD-20260103-I9J0K1L2",
                "customer_email": "sophie.bernard@email.com",
                "customer_name": "Sophie Bernard",
                "items": [
                    {"product_id": "2", "name": "Sac à Main en Cuir", "price": 890, "quantity": 1, "color": "Tan", "size": "Taille Unique"}
                ],
                "shipping_address": {
                    "firstName": "Sophie",
                    "lastName": "Bernard",
                    "address": "8 Place Vendôme",
                    "city": "Paris",
                    "postalCode": "75001",
                    "country": "France",
                    "phone": "+33698765432"
                },
                "subtotal": 890,
                "shipping_cost": 0,
                "discount": 0,
                "total": 890,
                "status": "pending",
                "payment_status": "pending",
                "payment_method": "card",
                "created_at": "2026-01-03T09:45:00Z",
                "updated_at": "2026-01-03T09:45:00Z"
            }
        ]
        await db.orders.insert_many(sample_orders)
