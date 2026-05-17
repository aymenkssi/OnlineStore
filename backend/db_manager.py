"""
Script d'export/import des données MongoDB.
- Export : sauvegarde toutes les collections en fichiers JSON dans /app/backend/seed_data/
- Import : restaure les données depuis les fichiers JSON si les collections sont vides
"""
import os
import json
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

SEED_DIR = os.path.join(os.path.dirname(__file__), "seed_data")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


async def export_all_collections():
    """Exporte toutes les collections MongoDB en fichiers JSON."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    os.makedirs(SEED_DIR, exist_ok=True)

    collections = await db.list_collection_names()
    # Skip system collections
    collections = [c for c in collections if not c.startswith("system.")]
    exported = {}

    for col_name in sorted(collections):
        docs = await db[col_name].find({}).to_list(10000)
        # Remove MongoDB _id for clean export
        for doc in docs:
            if "_id" in doc:
                del doc["_id"]

        filepath = os.path.join(SEED_DIR, f"{col_name}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(docs, f, cls=MongoJSONEncoder, ensure_ascii=False, indent=2)

        exported[col_name] = len(docs)

    client.close()
    return exported


async def import_all_collections():
    """Importe les données depuis les fichiers JSON si les collections sont vides."""
    if not os.path.exists(SEED_DIR):
        return {}

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    imported = {}

    json_files = [f for f in os.listdir(SEED_DIR) if f.endswith(".json")]

    for filename in sorted(json_files):
        col_name = filename.replace(".json", "")
        filepath = os.path.join(SEED_DIR, filename)

        # Only import if collection is empty
        count = await db[col_name].count_documents({})
        if count > 0:
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            docs = json.load(f)

        if docs:
            await db[col_name].insert_many(docs)
            imported[col_name] = len(docs)

    client.close()
    return imported


if __name__ == "__main__":
    import asyncio
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "import":
        result = asyncio.run(import_all_collections())
        if result:
            print("Collections importées:")
            for col, count in result.items():
                print(f"  {col}: {count} documents")
        else:
            print("Rien à importer (collections déjà remplies ou pas de fichiers seed).")
    else:
        result = asyncio.run(export_all_collections())
        print("Collections exportées:")
        for col, count in result.items():
            print(f"  {col}: {count} documents")
