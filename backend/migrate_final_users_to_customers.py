"""
Script de migration finale : USERS → CUSTOMERS
Migre tous les utilisateurs de la collection users vers customers
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

async def migrate_users_to_customers():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🔄 MIGRATION FINALE : USERS → CUSTOMERS")
    print("=" * 70)
    
    # 1. Compter les documents
    users_count = await db.users.count_documents({})
    customers_count = await db.customers.count_documents({})
    
    print(f"\n📊 État initial :")
    print(f"   users     : {users_count} documents")
    print(f"   customers : {customers_count} documents")
    
    # 2. Récupérer tous les users
    print(f"\n📥 Récupération des {users_count} users...")
    all_users = await db.users.find({}, {"_id": 0}).to_list(1000)
    
    # 3. Pour chaque user, vérifier s'il existe dans customers
    migrated = 0
    skipped = 0
    updated = 0
    
    print(f"\n🔄 Migration en cours...")
    
    for user in all_users:
        email = user.get('email')
        existing = await db.customers.find_one({"email": email})
        
        if existing:
            # L'utilisateur existe déjà, mettre à jour avec les données de users
            update_data = {**user}
            # Garder les préférences existantes si présentes
            if 'preferences' in existing and 'preferences' not in user:
                update_data['preferences'] = existing['preferences']
            
            await db.customers.update_one(
                {"email": email},
                {"$set": update_data}
            )
            updated += 1
            print(f"   ♻️  Mis à jour : {email}")
        else:
            # Nouvel utilisateur, l'insérer
            # Ajouter les champs commerciaux vides si nécessaire
            if 'address' not in user:
                user['address'] = ""
            if 'city' not in user:
                user['city'] = ""
            if 'postal_code' not in user:
                user['postal_code'] = ""
            if 'country' not in user:
                user['country'] = "France"
            if 'total_orders' not in user:
                user['total_orders'] = 0
            if 'total_spent' not in user:
                user['total_spent'] = 0
            if 'notes' not in user:
                user['notes'] = ""
            
            await db.customers.insert_one(user)
            migrated += 1
            print(f"   ✅ Migré : {email} (role={user.get('role', 'customer')})")
    
    # 4. Vérification finale
    final_customers_count = await db.customers.count_documents({})
    
    print(f"\n" + "=" * 70)
    print(f"📊 Résultat de la migration :")
    print(f"   ✅ Nouveaux migrés  : {migrated}")
    print(f"   ♻️  Mis à jour      : {updated}")
    print(f"   ⏭️  Ignorés (déjà)  : {skipped}")
    print(f"\n   📦 Total customers : {final_customers_count}")
    
    if final_customers_count >= users_count:
        print(f"\n✅ MIGRATION RÉUSSIE !")
        print(f"   La collection 'customers' contient maintenant tous les utilisateurs.")
        print(f"   Vous pouvez maintenant supprimer 'users', 'users_old' et 'customers_old'")
    else:
        print(f"\n⚠️  ATTENTION : customers ({final_customers_count}) < users ({users_count})")
        print(f"   Vérifiez les données avant de supprimer !")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_users_to_customers())
