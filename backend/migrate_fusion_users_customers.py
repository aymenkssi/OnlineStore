"""
Script de migration : Fusion de USERS et CUSTOMERS en une seule collection CUSTOMERS
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

async def migrate_fusion():
    """Fusionner users et customers en une seule collection customers"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🔄 DÉBUT DE LA MIGRATION : Fusion USERS + CUSTOMERS → CUSTOMERS")
    print("=" * 70)
    
    # 1. Backup des collections existantes
    print("\n📦 Étape 1 : Backup des données existantes...")
    users_backup = await db.users.find({}, {"_id": 0}).to_list(1000)
    customers_backup = await db.customers.find({}, {"_id": 0}).to_list(1000)
    print(f"   ✅ {len(users_backup)} users sauvegardés")
    print(f"   ✅ {len(customers_backup)} customers sauvegardés")
    
    # 2. Créer la nouvelle collection customers_new avec fusion
    print("\n🔀 Étape 2 : Fusion des données...")
    new_customers = []
    
    for user in users_backup:
        # Chercher le customer correspondant (même email)
        customer_data = next((c for c in customers_backup if c.get('email') == user.get('email')), None)
        
        # Créer l'enregistrement fusionné
        merged = {
            "id": user.get("id"),
            "email": user.get("email"),
            "password": user.get("password"),  # Hash bcrypt
            "name": user.get("name", ""),
            "phone": user.get("phone"),
            
            # Données d'authentification
            "role": user.get("role", "customer"),
            "permissions": user.get("permissions", []),
            "status": user.get("status", "active"),
            "last_login": user.get("last_login"),
            
            # Données commerciales (depuis customer si existe, sinon vides)
            "address": customer_data.get("address", "") if customer_data else "",
            "city": customer_data.get("city", "") if customer_data else "",
            "postal_code": customer_data.get("postal_code", "") if customer_data else "",
            "country": customer_data.get("country", "France") if customer_data else "France",
            "total_orders": customer_data.get("total_orders", 0) if customer_data else 0,
            "total_spent": customer_data.get("total_spent", 0) if customer_data else 0,
            "notes": customer_data.get("notes", "") if customer_data else "",
            
            # Timestamps
            "created_at": user.get("created_at", datetime.now(timezone.utc).isoformat()),
            "updated_at": user.get("updated_at", datetime.now(timezone.utc).isoformat())
        }
        
        new_customers.append(merged)
        
        role_emoji = "🔑" if merged["role"] in ["admin", "super_admin"] else "🛒"
        print(f"   {role_emoji} Fusionné : {merged['email']} (role={merged['role']})")
    
    print(f"\n   ✅ {len(new_customers)} enregistrements fusionnés")
    
    # 3. Renommer l'ancienne collection customers en customers_old
    print("\n🗄️  Étape 3 : Sauvegarde de l'ancienne collection customers...")
    try:
        await db.customers.rename("customers_old")
        print("   ✅ customers → customers_old")
    except Exception as e:
        print(f"   ⚠️  Collection customers n'existe pas ou déjà renommée: {e}")
    
    # 4. Créer la nouvelle collection customers avec les données fusionnées
    print("\n💾 Étape 4 : Création de la nouvelle collection CUSTOMERS unifiée...")
    if new_customers:
        await db.customers.insert_many(new_customers)
        print(f"   ✅ {len(new_customers)} enregistrements insérés dans CUSTOMERS")
    
    # 5. Renommer users en users_old (backup)
    print("\n🗄️  Étape 5 : Archivage de l'ancienne collection users...")
    try:
        await db.users.rename("users_old")
        print("   ✅ users → users_old")
    except Exception as e:
        print(f"   ⚠️  Erreur lors du renommage: {e}")
    
    # 6. Vérification
    print("\n✅ Étape 6 : Vérification...")
    final_count = await db.customers.count_documents({})
    admin_count = await db.customers.count_documents({"role": {"$in": ["admin", "super_admin"]}})
    customer_count = await db.customers.count_documents({"role": "customer"})
    
    print(f"   📊 Collection CUSTOMERS finale : {final_count} total")
    print(f"      🔑 Admins : {admin_count}")
    print(f"      🛒 Clients : {customer_count}")
    
    # 7. Afficher quelques exemples
    print("\n📋 Exemples d'enregistrements fusionnés :")
    
    admin_example = await db.customers.find_one({"role": "admin"}, {"_id": 0, "password": 0})
    if admin_example:
        print(f"\n   🔑 ADMIN : {admin_example.get('email')}")
        print(f"      Role: {admin_example.get('role')}")
        print(f"      Address: '{admin_example.get('address')}' (vide comme prévu)")
        print(f"      Total orders: {admin_example.get('total_orders')}")
    
    customer_example = await db.customers.find_one({"role": "customer"}, {"_id": 0, "password": 0})
    if customer_example:
        print(f"\n   🛒 CLIENT : {customer_example.get('email')}")
        print(f"      Role: {customer_example.get('role')}")
        print(f"      Address: '{customer_example.get('address')}'")
        print(f"      Total orders: {customer_example.get('total_orders')}")
        print(f"      Total spent: {customer_example.get('total_spent')}€")
    
    print("\n" + "=" * 70)
    print("✅ MIGRATION TERMINÉE AVEC SUCCÈS !")
    print("\n📝 Collections de backup créées (peuvent être supprimées plus tard) :")
    print("   - users_old")
    print("   - customers_old")
    print("\n🚀 Vous pouvez maintenant redémarrer le backend.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_fusion())
