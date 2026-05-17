from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
import csv
import io

from auth_deps import require_admin

router = APIRouter(
    prefix="/api/stats",
    tags=["statistics"],
    dependencies=[Depends(require_admin)],
)

db = None

def init_db(database):
    global db
    db = database

# Dashboard Overview Stats
@router.get("/dashboard")
async def get_dashboard_stats():
    """Get comprehensive dashboard statistics"""
    
    # Products stats
    total_products = await db.products.count_documents({})
    
    # Calculate total stock
    pipeline = [
        {"$unwind": "$sizes"},
        {"$group": {"_id": None, "total_stock": {"$sum": "$sizes.stock"}}}
    ]
    stock_result = await db.products.aggregate(pipeline).to_list(1)
    total_stock = stock_result[0]["total_stock"] if stock_result else 0
    
    # Low stock products (less than 5)
    low_stock_pipeline = [
        {"$unwind": "$sizes"},
        {"$match": {"sizes.stock": {"$lt": 5, "$gt": 0}}},
        {"$group": {"_id": "$id", "name": {"$first": "$name"}, "min_stock": {"$min": "$sizes.stock"}}},
        {"$limit": 10}
    ]
    low_stock_products = await db.products.aggregate(low_stock_pipeline).to_list(10)
    
    # Orders stats
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    
    # Revenue
    revenue_pipeline = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Customers stats
    total_customers = await db.customers.count_documents({})
    active_customers = await db.customers.count_documents({"status": "active"})
    
    # Returns stats - comprehensive
    total_returns = await db.returns.count_documents({})
    pending_returns = await db.returns.count_documents({"status": "pending"})
    approved_returns = await db.returns.count_documents({"status": "approved"})
    completed_returns = await db.returns.count_documents({"status": "completed"})
    
    # Total refunded amount (completed returns)
    refunded_pipeline = [
        {"$match": {"refund_status": "refunded"}},
        {"$group": {"_id": None, "total": {"$sum": "$refund_amount"}}}
    ]
    refunded_result = await db.returns.aggregate(refunded_pipeline).to_list(1)
    total_refunded = refunded_result[0]["total"] if refunded_result else 0
    
    # Pending refund amount (approved or pending returns, not yet refunded)
    pending_refund_pipeline = [
        {"$match": {"status": {"$in": ["pending", "approved"]}, "refund_status": {"$ne": "refunded"}}},
        {"$group": {"_id": None, "total": {"$sum": "$refund_amount"}}}
    ]
    pending_refund_result = await db.returns.aggregate(pending_refund_pipeline).to_list(1)
    pending_refund_amount = pending_refund_result[0]["total"] if pending_refund_result else 0
    
    # Net revenue = gross revenue - refunded amounts
    net_revenue = total_revenue - total_refunded
    
    # Categories count
    total_categories = await db.categories.count_documents({})
    
    # Coupons stats
    active_coupons = await db.coupons.count_documents({"active": True})
    
    # Return rate
    return_rate = round((total_returns / total_orders * 100), 1) if total_orders > 0 else 0
    
    return {
        "products": {
            "total": total_products,
            "total_stock": total_stock,
            "low_stock_count": len(low_stock_products),
            "low_stock_items": low_stock_products
        },
        "orders": {
            "total": total_orders,
            "pending": pending_orders,
            "total_revenue": total_revenue,
            "net_revenue": net_revenue
        },
        "customers": {
            "total": total_customers,
            "active": active_customers
        },
        "returns": {
            "total": total_returns,
            "pending": pending_returns,
            "approved": approved_returns,
            "completed": completed_returns,
            "total_refunded": total_refunded,
            "pending_refund_amount": pending_refund_amount,
            "return_rate": return_rate
        },
        "categories": {
            "total": total_categories
        },
        "coupons": {
            "active": active_coupons
        }
    }

# Recalculate all dashboard statistics
@router.post("/dashboard/recalculate")
async def recalculate_dashboard_stats(body: dict = None):
    """Recalculate all dashboard statistics from raw data.
    Requires security code verification (done on frontend).
    Recalculates customer stats based on actual orders."""
    body = body or {}
    
    recalculated = {}
    
    # 1. Recalculate customer stats from orders
    customers = await db.customers.find({}, {"_id": 0, "id": 1, "email": 1}).to_list(10000)
    customer_updates = 0
    
    for customer in customers:
        email = customer.get("email")
        if not email:
            continue
        
        # Count orders and total spent for this customer
        orders = await db.orders.find(
            {"customer_email": email, "status": {"$ne": "cancelled"}},
            {"_id": 0, "total": 1}
        ).to_list(10000)
        
        total_orders = len(orders)
        total_spent = sum(o.get("total", 0) for o in orders)
        
        await db.customers.update_one(
            {"email": email},
            {"$set": {"total_orders": total_orders, "total_spent": round(total_spent, 2)}}
        )
        customer_updates += 1
    
    recalculated["customers_updated"] = customer_updates
    
    # 2. Recalculate return refund statuses
    returns_with_completed = await db.returns.find(
        {"status": "completed", "refund_status": {"$ne": "refunded"}},
        {"_id": 0, "id": 1}
    ).to_list(10000)
    
    for ret in returns_with_completed:
        await db.returns.update_one(
            {"id": ret["id"]},
            {"$set": {"refund_status": "refunded"}}
        )
    recalculated["returns_fixed"] = len(returns_with_completed)
    
    # 3. Get fresh dashboard stats
    fresh_stats = await get_dashboard_stats()
    
    return {
        "message": "Statistiques recalculées avec succès",
        "recalculated": recalculated,
        "stats": fresh_stats
    }


# Sales Statistics
@router.get("/sales")
async def get_sales_stats(
    period: str = "month",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get sales statistics for a given period or custom date range"""
    
    now = datetime.now(timezone.utc)
    
    # Use custom date range if provided
    if start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            period = "custom"
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD)")
    else:
        if period == "week":
            start = now - timedelta(days=7)
        elif period == "month":
            start = now - timedelta(days=30)
        elif period == "quarter":
            start = now - timedelta(days=90)
        elif period == "year":
            start = now - timedelta(days=365)
        else:
            start = now - timedelta(days=30)
        end = now
    
    # Sales by day
    sales_pipeline = [
        {"$match": {
            "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()},
            "status": {"$ne": "cancelled"}
        }},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "orders_count": {"$sum": 1},
            "revenue": {"$sum": "$total"}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily_sales = await db.orders.aggregate(sales_pipeline).to_list(365)
    
    # Total for period
    total_pipeline = [
        {"$match": {
            "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()},
            "status": {"$ne": "cancelled"}
        }},
        {"$group": {
            "_id": None,
            "total_orders": {"$sum": 1},
            "total_revenue": {"$sum": "$total"},
            "average_order": {"$avg": "$total"}
        }}
    ]
    total_result = await db.orders.aggregate(total_pipeline).to_list(1)
    totals = total_result[0] if total_result else {"total_orders": 0, "total_revenue": 0, "average_order": 0}
    
    # Calculate profit (revenue - cost)
    orders_in_period = await db.orders.find(
        {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}, "status": {"$ne": "cancelled"}},
        {"_id": 0, "items": 1}
    ).to_list(10000)
    
    total_cost = 0
    for order in orders_in_period:
        for item in order.get("items", []):
            product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0, "purchasePrice": 1})
            if product and product.get("purchasePrice"):
                total_cost += product["purchasePrice"] * item["quantity"]
    
    profit = totals.get("total_revenue", 0) - total_cost
    
    # Top selling products
    top_products_pipeline = [
        {"$match": {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.product_id",
            "name": {"$first": "$items.name"},
            "quantity_sold": {"$sum": "$items.quantity"},
            "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
        }},
        {"$sort": {"quantity_sold": -1}},
        {"$limit": 10}
    ]
    top_products = await db.orders.aggregate(top_products_pipeline).to_list(10)
    
    # Sales by category
    category_sales_pipeline = [
        {"$match": {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}}},
        {"$unwind": "$items"},
        {"$lookup": {
            "from": "products",
            "localField": "items.product_id",
            "foreignField": "id",
            "as": "product"
        }},
        {"$unwind": {"path": "$product", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": "$product.category",
            "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}},
            "quantity": {"$sum": "$items.quantity"}
        }},
        {"$sort": {"revenue": -1}}
    ]
    category_sales = await db.orders.aggregate(category_sales_pipeline).to_list(20)
    
    # Sales by status
    status_pipeline = [
        {"$match": {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total": {"$sum": "$total"}
        }}
    ]
    sales_by_status = await db.orders.aggregate(status_pipeline).to_list(10)
    
    return {
        "period": period,
        "date_range": {
            "start": start.isoformat(),
            "end": end.isoformat()
        },
        "daily_sales": daily_sales,
        "totals": {
            "orders": totals.get("total_orders", 0),
            "revenue": totals.get("total_revenue", 0),
            "average_order_value": round(totals.get("average_order", 0), 2),
            "profit": round(profit, 2),
            "cost": round(total_cost, 2)
        },
        "top_products": top_products,
        "category_sales": category_sales,
        "sales_by_status": sales_by_status
    }

# Export Sales Data as CSV
@router.get("/sales/export")
async def export_sales_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Export sales data as CSV file"""
    
    now = datetime.now(timezone.utc)
    
    if start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        start = now - timedelta(days=30)
        end = now
    
    # Get orders for the period
    orders = await db.orders.find(
        {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}},
        {"_id": 0}
    ).to_list(10000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID Commande", "Date", "Client", "Email", "Statut", 
        "Sous-total", "Livraison", "Total", "Méthode Paiement"
    ])
    
    # Data rows
    for order in orders:
        writer.writerow([
            order.get("id", ""),
            order.get("created_at", "")[:10] if order.get("created_at") else "",
            f"{order.get('shipping_address', {}).get('firstName', '')} {order.get('shipping_address', {}).get('lastName', '')}",
            order.get("shipping_address", {}).get("email", ""),
            order.get("status", ""),
            order.get("subtotal", 0),
            order.get("shipping", 0),
            order.get("total", 0),
            order.get("payment_method", "")
        ])
    
    output.seek(0)
    
    filename = f"ventes_{start.strftime('%Y%m%d')}_{end.strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Export Products Data as CSV
@router.get("/products/export")
async def export_products_csv():
    """Export products data as CSV file"""
    
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Nom", "Marque", "Catégorie", "Sous-catégorie",
        "Prix", "Prix Original", "Stock Total", "Créé le"
    ])
    
    # Data rows
    for product in products:
        total_stock = sum(s.get("stock", 0) for s in product.get("sizes", []))
        writer.writerow([
            product.get("id", ""),
            product.get("name", ""),
            product.get("brand", ""),
            product.get("category", ""),
            product.get("subcategory", ""),
            product.get("price", 0),
            product.get("originalPrice", ""),
            total_stock,
            product.get("created_at", "")[:10] if product.get("created_at") else ""
        ])
    
    output.seek(0)
    
    filename = f"produits_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Export Customers Data as CSV
@router.get("/customers/export")
async def export_customers_csv():
    """Export customers data as CSV file"""
    
    customers = await db.customers.find({}, {"_id": 0, "password": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Nom", "Prénom", "Email", "Téléphone",
        "Commandes", "Total Dépensé", "Statut", "Inscrit le"
    ])
    
    # Data rows
    for customer in customers:
        writer.writerow([
            customer.get("id", ""),
            customer.get("lastName", ""),
            customer.get("firstName", ""),
            customer.get("email", ""),
            customer.get("phone", ""),
            customer.get("total_orders", 0),
            customer.get("total_spent", 0),
            customer.get("status", ""),
            customer.get("created_at", "")[:10] if customer.get("created_at") else ""
        ])
    
    output.seek(0)
    
    filename = f"clients_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Customer Statistics
@router.get("/customers")
async def get_customer_stats():
    """Get customer statistics"""
    
    total_customers = await db.customers.count_documents({})
    active_customers = await db.customers.count_documents({"status": "active"})
    
    # New customers this month
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = await db.customers.count_documents({
        "created_at": {"$gte": first_of_month.isoformat()}
    })
    
    # Top customers by spending
    top_customers_pipeline = [
        {"$sort": {"total_spent": -1}},
        {"$limit": 10},
        {"$project": {"_id": 0, "password": 0}}
    ]
    top_customers = await db.customers.aggregate(top_customers_pipeline).to_list(10)
    
    # Customers by orders count
    orders_distribution = await db.customers.aggregate([
        {"$bucket": {
            "groupBy": "$total_orders",
            "boundaries": [0, 1, 3, 5, 10, 50],
            "default": "50+",
            "output": {"count": {"$sum": 1}}
        }}
    ]).to_list(10)
    
    return {
        "total": total_customers,
        "active": active_customers,
        "new_this_month": new_this_month,
        "top_customers": top_customers,
        "orders_distribution": orders_distribution
    }

# Inventory Statistics
@router.get("/inventory")
async def get_inventory_stats():
    """Get inventory statistics"""
    
    # Total products and stock
    total_products = await db.products.count_documents({})
    
    stock_pipeline = [
        {"$unwind": "$sizes"},
        {"$group": {
            "_id": None,
            "total_stock": {"$sum": "$sizes.stock"},
            "total_variants": {"$sum": 1}
        }}
    ]
    stock_result = await db.products.aggregate(stock_pipeline).to_list(1)
    stock_data = stock_result[0] if stock_result else {"total_stock": 0, "total_variants": 0}
    
    # Out of stock items
    out_of_stock_pipeline = [
        {"$unwind": "$sizes"},
        {"$match": {"sizes.stock": 0}},
        {"$group": {"_id": "$id", "name": {"$first": "$name"}}},
        {"$count": "count"}
    ]
    out_of_stock_result = await db.products.aggregate(out_of_stock_pipeline).to_list(1)
    out_of_stock_count = out_of_stock_result[0]["count"] if out_of_stock_result else 0
    
    # Low stock items (< 5)
    low_stock_pipeline = [
        {"$unwind": "$sizes"},
        {"$match": {"sizes.stock": {"$lt": 5, "$gt": 0}}},
        {"$group": {
            "_id": "$id",
            "name": {"$first": "$name"},
            "brand": {"$first": "$brand"},
            "min_stock": {"$min": "$sizes.stock"}
        }},
        {"$sort": {"min_stock": 1}},
        {"$limit": 20}
    ]
    low_stock_items = await db.products.aggregate(low_stock_pipeline).to_list(20)
    
    # Stock by category
    category_stock_pipeline = [
        {"$unwind": "$sizes"},
        {"$group": {
            "_id": "$category",
            "total_stock": {"$sum": "$sizes.stock"},
            "product_count": {"$addToSet": "$id"}
        }},
        {"$project": {
            "category": "$_id",
            "total_stock": 1,
            "product_count": {"$size": "$product_count"}
        }}
    ]
    category_stock = await db.products.aggregate(category_stock_pipeline).to_list(20)
    
    # Inventory value
    value_pipeline = [
        {"$unwind": "$sizes"},
        {"$group": {
            "_id": None,
            "total_value": {"$sum": {"$multiply": ["$price", "$sizes.stock"]}}
        }}
    ]
    value_result = await db.products.aggregate(value_pipeline).to_list(1)
    inventory_value = value_result[0]["total_value"] if value_result else 0
    
    return {
        "total_products": total_products,
        "total_stock": stock_data.get("total_stock", 0),
        "total_variants": stock_data.get("total_variants", 0),
        "out_of_stock_count": out_of_stock_count,
        "low_stock_count": len(low_stock_items),
        "low_stock_items": low_stock_items,
        "category_stock": category_stock,
        "inventory_value": inventory_value
    }
