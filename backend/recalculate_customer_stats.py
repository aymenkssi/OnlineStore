"""
Script de recalcul des statistiques clients depuis les commandes réelles
Met à jour total_orders et total_spent pour chaque client
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

async def recalculate_customer_stats():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("📊 RECALCUL DES STATISTIQUES CLIENTS")
    print("=" * 70)
    
    # 1. Récupérer tous les clients
    customers = await db.customers.find({}, {"_id": 0, "email": 1}).to_list(1000)
    print(f"\n📦 {len(customers)} clients trouvés")
    
    # 2. Pour chaque client, calculer depuis les commandes
    updated_count = 0
    
    for customer in customers:
        email = customer['email']
        
        # Récupérer toutes les commandes de ce client
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
                "total_spent": round(total_spent, 2)
            }}
        )
        
        if total_orders > 0:
            print(f"   ✅ {email:<35} → {total_orders} commandes, {total_spent:.2f}€")
            updated_count += 1
        else:
            print(f"   ⚪ {email:<35} → Aucune commande")
    
    # 3. Calculer les nouvelles statistiques globales
    print(f"\n" + "=" * 70)
    print("📈 STATISTIQUES GLOBALES RECALCULÉES :\n")
    
    # Total revenue
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$total_spent"}}}
    ]
    spent_result = await db.customers.aggregate(pipeline).to_list(1)
    total_revenue = spent_result[0]["total"] if spent_result else 0
    
    # Average basket
    customers_with_orders = await db.customers.count_documents({"total_orders": {"$gt": 0}})
    total_orders_count = await db.orders.count_documents({"status": {"$ne": "cancelled"}})
    avg_basket = total_revenue / total_orders_count if total_orders_count > 0 else 0
    
    print(f"   💰 CA Total           : {total_revenue:.2f}€")
    print(f"   🛒 Panier moyen       : {avg_basket:.2f}€")
    print(f"   📦 Total commandes    : {total_orders_count}")
    print(f"   👥 Clients actifs     : {customers_with_orders}/{len(customers)}")
    print(f"   ✅ Clients mis à jour : {updated_count}")
    
    print(f"\n" + "=" * 70)
    print("✅ RECALCUL TERMINÉ !")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(recalculate_customer_stats())
