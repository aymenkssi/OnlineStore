from fastapi import APIRouter, HTTPException, BackgroundTasks, Response, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from auth_deps import require_admin

router = APIRouter(prefix="/api/products", tags=["products"])

# Database reference (will be set from server.py)
db = None

def init_db(database):
    global db
    db = database

# Models
class ColorImage(BaseModel):
    name: str
    hex: str
    available: bool = True
    images: List[str] = []

class SizeStock(BaseModel):
    size: str
    stock: int = 0

class Variant(BaseModel):
    color: str
    size: str
    stock: int = 0
    sku: str = ""

class ProductBase(BaseModel):
    name: str
    brand: str
    price: float
    purchasePrice: Optional[float] = None
    originalPrice: Optional[float] = None
    promotionStartDate: Optional[str] = None
    promotionEndDate: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    subSubcategory: Optional[str] = None
    description: Optional[str] = ""
    images: List[str] = []
    colors: List[ColorImage] = []
    sizes: List[SizeStock] = []
    variants: List[Variant] = []
    details: List[str] = []
    newArrival: bool = False
    featured: bool = False
    lowStockThreshold: Optional[int] = 10  # Default threshold for low stock alerts
    translations: Optional[dict] = None  # {fr: {name, description}, en: {...}, ar: {...}}

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: str
    created_at: Optional[str] = None
    updatedAt: Optional[str] = None

PRODUCT_LANGS = ("fr", "en", "ar")

def _ensure_product_translations(p: dict) -> dict:
    """Make sure every product has a `translations` dict with FR fallback to top-level name/description."""
    if not isinstance(p, dict):
        return p
    t = p.get("translations") or {}
    if not t.get("fr") or not (t["fr"].get("name") or t["fr"].get("description")):
        t["fr"] = {"name": p.get("name", ""), "description": p.get("description", "")}
    for lang in PRODUCT_LANGS:
        t.setdefault(lang, {"name": "", "description": ""})
    p["translations"] = t
    return p

# Routes
@router.get("/", response_model=List[ProductResponse])
async def get_products(response: Response, category: Optional[str] = None, subcategory: Optional[str] = None):
    # Prevent browser caching to ensure new products appear immediately
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    query = {}
    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return [_ensure_product_translations(p) for p in products]

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, response: Response):
    # Prevent browser caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _ensure_product_translations(product)

@router.post("/", response_model=ProductResponse)
async def create_product(product: ProductCreate, background_tasks: BackgroundTasks, _admin: dict = Depends(require_admin)):
    product_dict = product.model_dump()
    product_dict["id"] = str(uuid.uuid4())
    product_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.products.insert_one(product_dict)
    if "_id" in product_dict:
        del product_dict["_id"]
    
    # Send newsletter notification for new product
    try:
        from routes.newsletter import notify_new_product
        background_tasks.add_task(notify_new_product, product_dict)
    except Exception:
        pass  # Don't fail product creation if newsletter fails
    
    return product_dict

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product: ProductUpdate, background_tasks: BackgroundTasks, _admin: dict = Depends(require_admin)):
    # Get existing product to check if promotion is being added
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    product_dict = product.model_dump()
    product_dict["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": product_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    # Check if a new promotion was added (product now has originalPrice > price, but didn't before)
    had_promotion = existing and existing.get('originalPrice') and existing.get('originalPrice') > existing.get('price', 0)
    has_promotion = updated.get('originalPrice') and updated.get('originalPrice') > updated.get('price', 0)
    
    if has_promotion and not had_promotion:
        # Send newsletter notification for new promotion
        try:
            from routes.newsletter import notify_new_promotion
            background_tasks.add_task(notify_new_promotion, updated)
        except Exception:
            pass  # Don't fail product update if newsletter fails
    
    return updated

# Delete product (admin only, requires security code)
class DeleteProductRequest(BaseModel):
    code: str

@router.delete("/{product_id}")
async def delete_product(product_id: str, request: DeleteProductRequest, _admin: dict = Depends(require_admin)):
    # Verify security code
    settings = await db.settings.find_one({"type": "site_settings"}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=500, detail="Configuration non trouvée")
    
    require_code = settings.get("require_code_for_deletion", True)
    if require_code:
        stored_code = settings.get("deletion_code")
        if not stored_code or request.code != stored_code:
            raise HTTPException(status_code=403, detail="Code de sécurité incorrect")
    
    # Delete product
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}


@router.get("/stats/inventory")
async def get_inventory_stats():
    """Calculate inventory value based on purchase prices and stock"""
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    
    total_value = 0
    total_items = 0
    
    for product in products:
        purchase_price = product.get("purchasePrice", 0) or 0
        
        # Use variants first (color × size), fallback to sizes
        if product.get("variants") and len(product["variants"]) > 0:
            # Calculate from variants
            stock = sum(variant.get("stock", 0) for variant in product["variants"])
        elif product.get("sizes"):
            # Fallback to sizes
            stock = sum(size.get("stock", 0) for size in product["sizes"])
        else:
            stock = product.get("stock", 0)
        
        total_items += stock
        total_value += purchase_price * stock
    
    return {
        "inventory_value": round(total_value, 2),
        "total_items": total_items
    }


@router.get("/stats/inventory-detail")
async def get_inventory_detail():
    """Get detailed inventory with initial stock, sold quantities, and current stock per product/variant"""
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    
    # Aggregate sold quantities from delivered/completed orders (not cancelled)
    sold_pipeline = [
        {"$match": {"status": {"$in": ["delivered", "completed", "processing", "shipped", "received"]}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": {
                "product_id": "$items.product_id",
                "size": "$items.size",
                "color": "$items.color"
            },
            "total_sold": {"$sum": "$items.quantity"}
        }}
    ]
    sold_data = await db.orders.aggregate(sold_pipeline).to_list(10000)
    
    # Aggregate restocked quantities from completed returns
    restocked_pipeline = [
        {"$match": {"restocked": True}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": {
                "product_id": "$items.product_id",
                "size": "$items.size",
                "color": "$items.color"
            },
            "total_restocked": {"$sum": "$items.quantity"}
        }}
    ]
    restocked_data = await db.returns.aggregate(restocked_pipeline).to_list(10000)
    
    # Build sold lookup: (product_id, size, color) -> total_sold
    sold_map = {}
    for entry in sold_data:
        key = (
            entry["_id"].get("product_id", ""),
            entry["_id"].get("size", ""),
            entry["_id"].get("color", "")
        )
        sold_map[key] = entry["total_sold"]
    
    # Build restocked lookup
    restocked_map = {}
    for entry in restocked_data:
        key = (
            entry["_id"].get("product_id", ""),
            entry["_id"].get("size", ""),
            entry["_id"].get("color", "")
        )
        restocked_map[key] = entry["total_restocked"]
    
    # Also aggregate by product_id + size only (for size-only products)
    sold_by_size = {}
    restocked_by_size = {}
    for entry in sold_data:
        pid = entry["_id"].get("product_id", "")
        size = entry["_id"].get("size", "")
        key = (pid, size)
        sold_by_size[key] = sold_by_size.get(key, 0) + entry["total_sold"]
    for entry in restocked_data:
        pid = entry["_id"].get("product_id", "")
        size = entry["_id"].get("size", "")
        key = (pid, size)
        restocked_by_size[key] = restocked_by_size.get(key, 0) + entry["total_restocked"]
    
    # Also aggregate total sold/restocked per product
    sold_by_product = {}
    restocked_by_product = {}
    for entry in sold_data:
        pid = entry["_id"].get("product_id", "")
        sold_by_product[pid] = sold_by_product.get(pid, 0) + entry["total_sold"]
    for entry in restocked_data:
        pid = entry["_id"].get("product_id", "")
        restocked_by_product[pid] = restocked_by_product.get(pid, 0) + entry["total_restocked"]
    
    result = []
    total_initial = 0
    total_sold = 0
    total_current = 0
    
    for product in products:
        pid = product.get("id", "")
        product_variants = []
        
        if product.get("variants") and len(product["variants"]) > 0:
            for variant in product["variants"]:
                color = variant.get("color", "")
                size = variant.get("size", "")
                current_stock = variant.get("stock", 0)
                sold = sold_map.get((pid, size, color), 0)
                restocked = restocked_map.get((pid, size, color), 0)
                # effective_sold = what was actually sold and not returned
                effective_sold = max(0, sold - restocked)
                initial_stock = current_stock + effective_sold
                
                product_variants.append({
                    "label": f"{color} - {size}" if color and size else color or size,
                    "sku": variant.get("sku", ""),
                    "initial_stock": initial_stock,
                    "sold": effective_sold,
                    "current_stock": current_stock
                })
                total_initial += initial_stock
                total_sold += effective_sold
                total_current += current_stock
        elif product.get("sizes"):
            for s in product["sizes"]:
                size_name = s.get("size", "")
                current_stock = s.get("stock", 0)
                sold = sold_by_size.get((pid, size_name), 0)
                restocked = restocked_by_size.get((pid, size_name), 0)
                effective_sold = max(0, sold - restocked)
                initial_stock = current_stock + effective_sold
                
                product_variants.append({
                    "label": size_name,
                    "sku": f"{pid}-{size_name}",
                    "initial_stock": initial_stock,
                    "sold": effective_sold,
                    "current_stock": current_stock
                })
                total_initial += initial_stock
                total_sold += effective_sold
                total_current += current_stock
        
        p_current = sum(v["current_stock"] for v in product_variants)
        p_sold = sum(v["sold"] for v in product_variants)
        p_initial = sum(v["initial_stock"] for v in product_variants)
        
        result.append({
            "id": pid,
            "name": product.get("name", ""),
            "brand": product.get("brand", ""),
            "category": product.get("category", ""),
            "subcategory": product.get("subcategory", ""),
            "subSubcategory": product.get("subSubcategory", ""),
            "image": (product.get("images") or [None])[0],
            "purchasePrice": product.get("purchasePrice", 0),
            "lowStockThreshold": product.get("lowStockThreshold", 10),
            "initial_stock": p_initial,
            "total_sold": p_sold,
            "current_stock": p_current,
            "variants": product_variants
        })
    
    return {
        "products": result,
        "totals": {
            "initial_stock": total_initial,
            "total_sold": total_sold,
            "current_stock": total_current
        }
    }


@router.get("/stats/low-stock")
async def get_low_stock_products():
    """Get all products with variants below their low stock threshold"""
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    
    low_stock_items = []
    
    for product in products:
        threshold = product.get("lowStockThreshold", 10)
        
        # Check variants (color × size)
        if product.get("variants") and len(product["variants"]) > 0:
            for variant in product["variants"]:
                stock = variant.get("stock", 0)
                if stock <= threshold and stock >= 0:  # Include zero stock
                    low_stock_items.append({
                        "product_id": product["id"],
                        "product_name": product["name"],
                        "brand": product.get("brand", ""),
                        "variant": f"{variant.get('color', '')} - {variant.get('size', '')}",
                        "sku": variant.get("sku", ""),
                        "current_stock": stock,
                        "threshold": threshold,
                        "is_critical": stock == 0
                    })
        # Fallback to sizes
        elif product.get("sizes"):
            for size in product["sizes"]:
                stock = size.get("stock", 0)
                if stock <= threshold and stock >= 0:
                    low_stock_items.append({
                        "product_id": product["id"],
                        "product_name": product["name"],
                        "brand": product.get("brand", ""),
                        "variant": size.get("size", ""),
                        "sku": f"{product['id']}-{size.get('size', '')}",
                        "current_stock": stock,
                        "threshold": threshold,
                        "is_critical": stock == 0
                    })
    
    # Sort by stock level (critical first)
    low_stock_items.sort(key=lambda x: (not x["is_critical"], x["current_stock"]))
    
    return {
        "low_stock_count": len(low_stock_items),
        "critical_count": sum(1 for item in low_stock_items if item["is_critical"]),
        "items": low_stock_items
    }


# Update product low stock threshold
class ThresholdUpdate(BaseModel):
    lowStockThreshold: int

@router.patch("/{product_id}/threshold")
async def update_product_threshold(product_id: str, threshold_data: ThresholdUpdate, _admin: dict = Depends(require_admin)):
    """Update only the low stock threshold for a product"""
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"lowStockThreshold": threshold_data.lowStockThreshold}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Threshold updated successfully", "threshold": threshold_data.lowStockThreshold}

