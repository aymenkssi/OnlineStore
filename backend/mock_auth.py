"""
Auth-related persistence for OAuth users and sessions.

Refactored to async-native (Motor) - no more blocking event loops.
All public functions are async coroutines; callers must `await` them.
"""
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient


MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

_client = AsyncIOMotorClient(MONGO_URL)
_db = _client[DB_NAME]


async def save_oauth_user(email: str, name: str, picture: str, provider: str = "google") -> str:
    """Save or update an OAuth user. Returns the user id."""
    existing = await _db.customers.find_one({"email": email})
    if existing:
        await _db.customers.update_one(
            {"email": email},
            {"$set": {
                "name": name or existing.get("name", ""),
                "picture": picture or existing.get("picture"),
                "provider": provider,
                "last_login": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return existing["id"]

    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": email,
        "password": "",  # OAuth users have no password
        "name": name,
        "phone": None,
        "picture": picture,
        "role": "customer",
        "permissions": [],
        "status": "active",
        "last_login": datetime.now(timezone.utc).isoformat(),
        "provider": provider,
        "address": "",
        "city": "",
        "postal_code": "",
        "country": "France",
        "total_orders": 0,
        "total_spent": 0,
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.customers.insert_one(new_user)
    return user_id


async def save_session(user_id: str, session_token: str) -> None:
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.sessions.update_one(
        {"session_token": session_token},
        {"$set": session_doc},
        upsert=True,
    )


async def get_user_by_session(session_token: str) -> Optional[dict]:
    session = await _db.sessions.find_one({"session_token": session_token})
    if not session:
        return None
    expires_at = datetime.fromisoformat(session["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        await _db.sessions.delete_one({"session_token": session_token})
        return None
    return await _db.customers.find_one({"id": session["user_id"]}, {"_id": 0, "password": 0})


async def delete_session(session_token: str) -> None:
    await _db.sessions.delete_one({"session_token": session_token})
