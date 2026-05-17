from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

# Database reference
db = None

def init_db(database):
    global db
    db = database

logger = logging.getLogger(__name__)

# Models
class ViewEvent(BaseModel):
    product_id: str
    category: Optional[str] = None
    subcategory: Optional[str] = None

class BrowsingHistory(BaseModel):
    visitor_id: str
    product_id: str
    category: str
    subcategory: Optional[str] = None
    viewed_at: str
    view_count: int = 1

class RecommendationResponse(BaseModel):
    id: str
    name: str
    brand: str
    price: float
    originalPrice: Optional[float] = None
    category: str
    images: List[str] = []
    reason: str  # Why this product is recommended


# Track product view
@router.post("/track-view")
async def track_product_view(event: ViewEvent, request: Request):
    """Track when a user views a product"""
    # Get or create visitor ID from cookie or generate new one
    visitor_id = request.cookies.get("visitor_id") or str(uuid.uuid4())
    
    try:
        # Check if already viewed recently (within 1 hour)
        existing = await db.browsing_history.find_one({
            "visitor_id": visitor_id,
            "product_id": event.product_id,
            "viewed_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}
        })
        
        if existing:
            # Update view count
            await db.browsing_history.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {"viewed_at": datetime.now(timezone.utc).isoformat()},
                    "$inc": {"view_count": 1}
                }
            )
        else:
            # Create new browsing record
            history_record = {
                "id": str(uuid.uuid4()),
                "visitor_id": visitor_id,
                "product_id": event.product_id,
                "category": event.category or "",
                "subcategory": event.subcategory,
                "viewed_at": datetime.now(timezone.utc).isoformat(),
                "view_count": 1
            }
            await db.browsing_history.insert_one(history_record)
        
        return {"status": "tracked", "visitor_id": visitor_id}
    except Exception as e:
        logger.error(f"Error tracking view: {str(e)}")
        return {"status": "error", "message": str(e)}


# Get personalized recommendations
@router.get("/personalized", response_model=List[RecommendationResponse])
async def get_personalized_recommendations(request: Request, limit: int = 8):
    """Get personalized product recommendations based on browsing history"""
    visitor_id = request.cookies.get("visitor_id")
    
    recommendations = []
    viewed_product_ids = set()
    
    if visitor_id:
        # Get browsing history (last 30 days)
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        history = await db.browsing_history.find(
            {"visitor_id": visitor_id, "viewed_at": {"$gte": cutoff_date}},
            {"_id": 0}
        ).sort("viewed_at", -1).to_list(50)
        
        if history:
            # Extract viewed product IDs and categories
            viewed_product_ids = {h["product_id"] for h in history}
            
            # Count category preferences
            category_counts = {}
            for h in history:
                cat = h.get("category", "")
                if cat:
                    category_counts[cat] = category_counts.get(cat, 0) + h.get("view_count", 1)
            
            # Sort categories by preference
            preferred_categories = sorted(category_counts.items(), key=lambda x: -x[1])
            
            # 1. Similar products from preferred categories (not viewed)
            for cat, _ in preferred_categories[:3]:
                similar = await db.products.find(
                    {"category": cat, "id": {"$nin": list(viewed_product_ids)}},
                    {"_id": 0}
                ).limit(4).to_list(4)
                
                for product in similar:
                    if len(recommendations) >= limit:
                        break
                    recommendations.append({
                        **product,
                        "reason": f"Basé sur vos visites dans {cat.capitalize()}"
                    })
            
            # 2. Products on promotion in preferred categories
            if len(recommendations) < limit:
                for cat, _ in preferred_categories[:2]:
                    promos = await db.products.find(
                        {
                            "category": cat,
                            "id": {"$nin": list(viewed_product_ids)},
                            "originalPrice": {"$exists": True, "$ne": None}
                        },
                        {"_id": 0}
                    ).limit(3).to_list(3)
                    
                    for product in promos:
                        if product.get("originalPrice") and product.get("originalPrice") > product.get("price", 0):
                            if len(recommendations) >= limit:
                                break
                            if product["id"] not in [r["id"] for r in recommendations]:
                                recommendations.append({
                                    **product,
                                    "reason": "En promotion - vous pourriez aimer"
                                })
    
    # 3. Fallback: Popular and new products
    if len(recommendations) < limit:
        # Get popular products (most viewed globally)
        popular_pipeline = [
            {"$group": {"_id": "$product_id", "views": {"$sum": "$view_count"}}},
            {"$sort": {"views": -1}},
            {"$limit": 10}
        ]
        popular_ids = await db.browsing_history.aggregate(popular_pipeline).to_list(10)
        popular_product_ids = [p["_id"] for p in popular_ids]
        
        if popular_product_ids:
            popular_products = await db.products.find(
                {"id": {"$in": popular_product_ids, "$nin": list(viewed_product_ids)}},
                {"_id": 0}
            ).to_list(limit - len(recommendations))
            
            for product in popular_products:
                if len(recommendations) >= limit:
                    break
                if product["id"] not in [r["id"] for r in recommendations]:
                    recommendations.append({
                        **product,
                        "reason": "Populaire en ce moment"
                    })
    
    # 4. Fill with new arrivals
    if len(recommendations) < limit:
        new_arrivals = await db.products.find(
            {"id": {"$nin": list(viewed_product_ids)}},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit - len(recommendations)).to_list(limit - len(recommendations))
        
        for product in new_arrivals:
            if len(recommendations) >= limit:
                break
            if product["id"] not in [r["id"] for r in recommendations]:
                recommendations.append({
                    **product,
                    "reason": "Nouveauté"
                })
    
    return recommendations[:limit]


# Get "You may also like" recommendations for a specific product
@router.get("/similar/{product_id}", response_model=List[RecommendationResponse])
async def get_similar_products(product_id: str, limit: int = 4):
    """Get similar products based on current product"""
    # Get the current product
    current_product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    if not current_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    recommendations = []
    
    # 1. Same category products
    same_category = await db.products.find(
        {"category": current_product["category"], "id": {"$ne": product_id}},
        {"_id": 0}
    ).limit(limit * 2).to_list(limit * 2)
    
    for product in same_category:
        if len(recommendations) >= limit:
            break
        recommendations.append({
            **product,
            "reason": f"Même catégorie: {current_product['category'].capitalize()}"
        })
    
    # 2. Same price range (±30%)
    if len(recommendations) < limit:
        price = current_product.get("price", 0)
        min_price = price * 0.7
        max_price = price * 1.3
        
        price_similar = await db.products.find(
            {
                "id": {"$ne": product_id, "$nin": [r["id"] for r in recommendations]},
                "price": {"$gte": min_price, "$lte": max_price}
            },
            {"_id": 0}
        ).limit(limit - len(recommendations)).to_list(limit - len(recommendations))
        
        for product in price_similar:
            if len(recommendations) >= limit:
                break
            recommendations.append({
                **product,
                "reason": "Gamme de prix similaire"
            })
    
    return recommendations[:limit]


# Get recently viewed products
@router.get("/recently-viewed", response_model=List[RecommendationResponse])
async def get_recently_viewed(request: Request, limit: int = 6):
    """Get products the user has recently viewed"""
    visitor_id = request.cookies.get("visitor_id")
    
    if not visitor_id:
        return []
    
    # Get recent history
    history = await db.browsing_history.find(
        {"visitor_id": visitor_id},
        {"_id": 0}
    ).sort("viewed_at", -1).to_list(limit * 2)
    
    if not history:
        return []
    
    # Get unique product IDs (maintaining order)
    seen = set()
    product_ids = []
    for h in history:
        if h["product_id"] not in seen:
            seen.add(h["product_id"])
            product_ids.append(h["product_id"])
    
    product_ids = product_ids[:limit]
    
    # Fetch products
    products = await db.products.find(
        {"id": {"$in": product_ids}},
        {"_id": 0}
    ).to_list(limit)
    
    # Maintain the viewing order and add reason
    product_map = {p["id"]: p for p in products}
    recommendations = []
    
    for pid in product_ids:
        if pid in product_map:
            recommendations.append({
                **product_map[pid],
                "reason": "Vu récemment"
            })
    
    return recommendations


# Get stats for admin
@router.get("/stats")
async def get_recommendation_stats():
    """Get recommendation system statistics (admin)"""
    total_views = await db.browsing_history.count_documents({})
    unique_visitors = len(await db.browsing_history.distinct("visitor_id"))
    
    # Most viewed products
    popular_pipeline = [
        {"$group": {"_id": "$product_id", "views": {"$sum": "$view_count"}}},
        {"$sort": {"views": -1}},
        {"$limit": 10}
    ]
    popular = await db.browsing_history.aggregate(popular_pipeline).to_list(10)
    
    # Category distribution
    category_pipeline = [
        {"$group": {"_id": "$category", "views": {"$sum": "$view_count"}}},
        {"$sort": {"views": -1}}
    ]
    categories = await db.browsing_history.aggregate(category_pipeline).to_list(10)
    
    return {
        "total_views": total_views,
        "unique_visitors": unique_visitors,
        "popular_products": popular,
        "category_distribution": categories
    }
