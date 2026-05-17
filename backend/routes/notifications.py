"""
Notification settings API routes.
"""
import sys
import os
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, Dict
from motor.motor_asyncio import AsyncIOMotorClient
from notification_service import (
    get_notification_settings,
    save_notification_settings,
    send_telegram,
    send_whatsapp,
    store_in_app_notification,
)

# Ensure parent dir is on path so auth_deps can be imported
_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _parent not in sys.path:
    sys.path.insert(0, _parent)
from auth_deps import require_admin

_mongo_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
_db = _mongo_client[os.environ.get("DB_NAME", "test_database")]

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationSettings(BaseModel):
    telegram_enabled: bool = False
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    whatsapp_enabled: bool = False
    whatsapp_phone: str = ""
    whatsapp_api_key: str = ""
    events: Dict[str, bool] = {
        "new_order": True,
        "new_return": True,
        "new_customer": True,
        "low_stock": True,
    }


# ---------- In-app notifications (admin bell) ----------

@router.get("/")
async def list_notifications(unread_only: bool = Query(False), _admin: dict = Depends(require_admin)):
    """List admin notifications (most recent first)."""
    query = {"read": False} if unread_only else {}
    cursor = _db.admin_notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(50)
    return await cursor.to_list(length=50)


@router.put("/read-all")
async def mark_all_read(_admin: dict = Depends(require_admin)):
    """Mark all admin notifications as read."""
    result = await _db.admin_notifications.update_many({"read": False}, {"$set": {"read": True}})
    return {"message": "Toutes les notifications marquées comme lues", "count": result.modified_count}


@router.put("/{notif_id}/read")
async def mark_read(notif_id: str, _admin: dict = Depends(require_admin)):
    """Mark a specific notification as read."""
    result = await _db.admin_notifications.update_one({"id": notif_id}, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    return {"message": "Notification marquée comme lue"}


@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, _admin: dict = Depends(require_admin)):
    """Delete a notification."""
    result = await _db.admin_notifications.delete_one({"id": notif_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    return {"message": "Notification supprimée"}


# ---------- Notification settings (Telegram/WhatsApp) ----------

@router.get("/settings")
async def get_settings(_admin: dict = Depends(require_admin)):
    """Get current notification settings."""
    settings = await get_notification_settings()
    masked = {**settings}
    if masked.get("telegram_bot_token"):
        token = masked["telegram_bot_token"]
        masked["telegram_bot_token_masked"] = token[:8] + "..." + token[-4:] if len(token) > 12 else "***"
    if masked.get("whatsapp_api_key"):
        key = masked["whatsapp_api_key"]
        masked["whatsapp_api_key_masked"] = key[:4] + "..." if len(key) > 4 else "***"
    return masked


@router.put("/settings")
async def update_settings(settings: NotificationSettings, _admin: dict = Depends(require_admin)):
    """Update notification settings."""
    data = settings.model_dump()
    await save_notification_settings(data)
    return {"message": "Paramètres de notification mis à jour", "settings": data}


class TestMessage(BaseModel):
    channel: str
    message: Optional[str] = None


@router.post("/test")
async def test_notification(body: TestMessage, _admin: dict = Depends(require_admin)):
    """Send a test notification to verify configuration."""
    settings = await get_notification_settings()
    test_msg = body.message or "Test de notification Best Shop - Configuration réussie !"

    # For the in-app channel, simply create a test notification
    if body.channel == "in_app":
        await store_in_app_notification(
            "test", "Notification de test", test_msg, priority="normal"
        )
        return {"message": "Notification de test créée (visible dans la cloche)"}
    
    if body.channel == "telegram":
        if not settings.get("telegram_bot_token") or not settings.get("telegram_chat_id"):
            raise HTTPException(status_code=400, detail="Token Telegram ou Chat ID manquant")
        success = await send_telegram(
            f"<b>Test Best Shop</b>\n{test_msg}",
            settings["telegram_bot_token"],
            settings["telegram_chat_id"]
        )
        if success:
            return {"message": "Message Telegram envoyé avec succès"}
        raise HTTPException(status_code=400, detail="Échec d'envoi Telegram. Vérifiez le token et le chat ID.")
    
    elif body.channel == "whatsapp":
        if not settings.get("whatsapp_phone") or not settings.get("whatsapp_api_key"):
            raise HTTPException(status_code=400, detail="Numéro WhatsApp ou clé API manquante")
        success = await send_whatsapp(
            test_msg,
            settings["whatsapp_phone"],
            settings["whatsapp_api_key"]
        )
        if success:
            return {"message": "Message WhatsApp envoyé avec succès"}
        raise HTTPException(status_code=400, detail="Échec d'envoi WhatsApp. Vérifiez le numéro et la clé API.")
    
    raise HTTPException(status_code=400, detail="Canal invalide. Utilisez 'telegram', 'whatsapp' ou 'in_app'.")
