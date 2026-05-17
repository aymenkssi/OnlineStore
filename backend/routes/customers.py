from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from auth_deps import require_admin

router = APIRouter(prefix="/api/customers", tags=["customers"])

db = None

def init_db(database):
    global db
    db = database

# Models
class CustomerCreate(BaseModel):
    email: str
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "France"
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# Routes
@router.get("/")
async def get_customers(limit: int = 100, skip: int = 0, status: Optional[str] = None, _admin: dict = Depends(require_admin)):
    query = {}
    if status:
        query["status"] = status
    total = await db.customers.count_documents(query)
    customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {
        "items": customers,
        "total": total,
        "limit": limit,
        "skip": skip,
        "has_more": skip + len(customers) < total
    }

@router.get("/stats")
async def get_customer_stats(_admin: dict = Depends(require_admin)):
    """Get customer statistics calculated from real orders"""
    # Count customers in database
    total_customers = await db.customers.count_documents({})
    active_customers = await db.customers.count_documents({"status": "active"})
    
    # New customers this month
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = await db.customers.count_documents({
        "created_at": {"$gte": first_of_month.isoformat()}
    })
    
    # Calculate REAL statistics from orders collection
    # Total revenue from ALL orders (not cancelled)
    revenue_pipeline = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Count total orders
    total_orders = await db.orders.count_documents({"status": {"$ne": "cancelled"}})
    
    # Average basket value
    avg_basket = total_revenue / total_orders if total_orders > 0 else 0
    
    return {
        "total_customers": total_customers,
        "active_customers": active_customers,
        "new_this_month": new_this_month,
        "total_revenue_from_customers": round(total_revenue, 2),
        "total_orders": total_orders,
        "average_basket": round(avg_basket, 2)
    }

@router.get("/{customer_id}")
async def get_customer(customer_id: str, _admin: dict = Depends(require_admin)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return customer

@router.get("/email/{email}")
async def get_customer_by_email(email: str, _admin: dict = Depends(require_admin)):
    customer = await db.customers.find_one({"email": email}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return customer

@router.post("/")
async def create_customer(customer: CustomerCreate, _admin: dict = Depends(require_admin)):
    # Check if email already exists
    existing = await db.customers.find_one({"email": customer.email})
    if existing:
        raise HTTPException(status_code=400, detail="Un client avec cet email existe déjà")
    
    customer_dict = customer.model_dump()
    customer_dict["id"] = str(uuid.uuid4())
    customer_dict["status"] = "active"
    customer_dict["total_orders"] = 0
    customer_dict["total_spent"] = 0
    customer_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    customer_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.customers.insert_one(customer_dict)
    customer_dict.pop("_id", None)
    return customer_dict

@router.put("/{customer_id}")
async def update_customer(customer_id: str, customer_update: CustomerUpdate, _admin: dict = Depends(require_admin)):
    existing = await db.customers.find_one({"id": customer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    update_data = {k: v for k, v in customer_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.customers.update_one({"id": customer_id}, {"$set": update_data})
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return updated

class DeleteWithCodeRequest(BaseModel):
    code: str

@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, request: DeleteWithCodeRequest, _admin: dict = Depends(require_admin)):
    # Verify security code
    settings_doc = await db.settings.find_one({"type": "security"})
    if settings_doc:
        data = settings_doc.get("data", {})
        require_code = data.get("require_code_for_deletion", True)
        stored_code = data.get("deletion_code", "0000")
    else:
        require_code = True
        stored_code = "0000"

    if require_code:
        if not request.code or request.code != stored_code:
            raise HTTPException(status_code=403, detail="Code de sécurité incorrect")

    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return {"message": "Client supprimé"}

@router.post("/{customer_id}/add-order")
async def add_order_to_customer(customer_id: str, order_total: float, _admin: dict = Depends(require_admin)):
    """Update customer stats after an order"""
    result = await db.customers.update_one(
        {"id": customer_id},
        {
            "$inc": {"total_orders": 1, "total_spent": order_total},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return {"message": "Statistiques client mises à jour"}

# Seed sample customers
async def seed_sample_customers():
    count = await db.customers.count_documents({})
    if count == 0:
        sample_customers = [
            {
                "id": str(uuid.uuid4()),
                "email": "marie.dupont@email.com",
                "name": "Marie Dupont",
                "phone": "+33612345678",
                "address": "15 Rue de la Paix",
                "city": "Paris",
                "postal_code": "75001",
                "country": "France",
                "status": "active",
                "total_orders": 5,
                "total_spent": 2450,
                "created_at": "2025-06-15T10:00:00Z",
                "updated_at": "2026-01-01T10:30:00Z"
            },
            {
                "id": str(uuid.uuid4()),
                "email": "jean.martin@email.com",
                "name": "Jean Martin",
                "phone": "+33687654321",
                "address": "42 Avenue des Champs-Élysées",
                "city": "Paris",
                "postal_code": "75008",
                "country": "France",
                "status": "active",
                "total_orders": 3,
                "total_spent": 1850,
                "created_at": "2025-08-20T14:30:00Z",
                "updated_at": "2026-01-02T14:15:00Z"
            },
            {
                "id": str(uuid.uuid4()),
                "email": "sophie.bernard@email.com",
                "name": "Sophie Bernard",
                "phone": "+33698765432",
                "address": "8 Place Vendôme",
                "city": "Paris",
                "postal_code": "75001",
                "country": "France",
                "status": "active",
                "total_orders": 1,
                "total_spent": 890,
                "created_at": "2025-12-10T09:00:00Z",
                "updated_at": "2026-01-03T09:45:00Z"
            },
            {
                "id": str(uuid.uuid4()),
                "email": "pierre.dubois@email.com",
                "name": "Pierre Dubois",
                "phone": "+33654321098",
                "address": "25 Boulevard Haussmann",
                "city": "Paris",
                "postal_code": "75009",
                "country": "France",
                "status": "inactive",
                "total_orders": 0,
                "total_spent": 0,
                "notes": "Client inscrit mais n'a jamais commandé",
                "created_at": "2025-11-01T16:00:00Z",
                "updated_at": "2025-11-01T16:00:00Z"
            }
        ]
        await db.customers.insert_many(sample_customers)



@router.post("/recalculate-stats")
async def recalculate_customer_statistics(_admin: dict = Depends(require_admin)):
    """
    Recalcule les statistiques de tous les clients depuis les commandes réelles
    Utile pour synchroniser après import de données ou corrections
    """
    try:
        # Récupérer tous les clients
        customers = await db.customers.find({}, {"_id": 0, "email": 1}).to_list(1000)
        
        updated_count = 0
        total_revenue = 0
        
        # Pour chaque client, calculer depuis les commandes
        for customer in customers:
            email = customer['email']
            
            # Récupérer toutes les commandes non annulées de ce client
            orders = await db.orders.find(
                {"customer_email": email, "status": {"$ne": "cancelled"}},
                {"_id": 0, "total": 1}
            ).to_list(1000)
            
            total_orders = len(orders)
            total_spent = sum(order.get('total', 0) for order in orders)
            
            # Mettre à jour le client
            await db.customers.update_one(
                {"email": email},
                {"$set": {
                    "total_orders": total_orders,
                    "total_spent": round(total_spent, 2),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            if total_orders > 0:
                updated_count += 1
                total_revenue += total_spent
        
        # Calculer les nouvelles stats globales
        total_orders_count = await db.orders.count_documents({"status": {"$ne": "cancelled"}})
        avg_basket = total_revenue / total_orders_count if total_orders_count > 0 else 0
        
        return {
            "success": True,
            "message": "Statistiques recalculées avec succès",
            "stats": {
                "customers_updated": updated_count,
                "total_customers": len(customers),
                "total_revenue": round(total_revenue, 2),
                "total_orders": total_orders_count,
                "average_basket": round(avg_basket, 2)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du recalcul: {str(e)}")
