"""
Notification service for Telegram and WhatsApp (CallMeBot).
Sends admin notifications for new orders, returns, etc.
Also persists notifications to MongoDB for the in-app admin bell.
"""
import httpx
import urllib.parse
import uuid
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


async def store_in_app_notification(event_type: str, title: str, message: str, priority: str = "normal"):
    """Store notification in DB so it shows in the admin notification bell."""
    doc = {
        "id": str(uuid.uuid4()),
        "type": event_type,
        "title": title,
        "message": message,
        "priority": priority,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_notifications.insert_one(doc)
    return doc


async def get_notification_settings():
    """Get notification settings from DB."""
    doc = await db.settings.find_one({"type": "notifications"}, {"_id": 0})
    if not doc:
        return {
            "telegram_enabled": False,
            "telegram_bot_token": "",
            "telegram_chat_id": "",
            "whatsapp_enabled": False,
            "whatsapp_phone": "",
            "whatsapp_api_key": "",
            "events": {
                "new_order": True,
                "new_return": True,
                "new_customer": True,
                "low_stock": True,
            }
        }
    return doc.get("data", {})


async def save_notification_settings(settings: dict):
    """Save notification settings to DB."""
    await db.settings.update_one(
        {"type": "notifications"},
        {"$set": {"type": "notifications", "data": settings}},
        upsert=True
    )


async def send_telegram(message: str, bot_token: str, chat_id: str) -> bool:
    """Send a message via Telegram Bot API."""
    if not bot_token or not chat_id:
        return False
    
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                return True
            else:
                print(f"Telegram error: {resp.status_code} - {resp.text}")
                return False
    except Exception as e:
        print(f"Telegram send error: {e}")
        return False


async def send_whatsapp(message: str, phone: str, api_key: str) -> bool:
    """Send a message via CallMeBot WhatsApp API (free)."""
    if not phone or not api_key:
        return False
    
    encoded_msg = urllib.parse.quote(message)
    url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={encoded_msg}&apikey={api_key}"
    
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return True
            else:
                print(f"WhatsApp error: {resp.status_code} - {resp.text}")
                return False
    except Exception as e:
        print(f"WhatsApp send error: {e}")
        return False


async def send_notification(event_type: str, message: str, html_message: Optional[str] = None,
                             title: Optional[str] = None, priority: str = "normal"):
    """Send notification to all enabled channels for a given event type.
    Also persists to DB for the in-app notification bell (regardless of channel enablement)."""
    settings = await get_notification_settings()

    # Always persist to DB so the in-app bell works even without Telegram/WhatsApp configured
    in_app_title = title or {
        "new_order": "Nouvelle commande",
        "new_return": "Nouvelle demande de retour",
        "new_customer": "Nouveau client",
        "low_stock": "Stock faible",
    }.get(event_type, "Notification")
    await store_in_app_notification(event_type, in_app_title, message, priority)

    # Check if event is enabled for external channels
    events = settings.get("events", {})
    if not events.get(event_type, False):
        return {"sent": False, "reason": "event_disabled"}
    
    results = {}
    
    # Telegram
    if settings.get("telegram_enabled"):
        telegram_msg = html_message or message
        success = await send_telegram(
            telegram_msg,
            settings.get("telegram_bot_token", ""),
            settings.get("telegram_chat_id", "")
        )
        results["telegram"] = success
    
    # WhatsApp
    if settings.get("whatsapp_enabled"):
        success = await send_whatsapp(
            message,  # Plain text for WhatsApp
            settings.get("whatsapp_phone", ""),
            settings.get("whatsapp_api_key", "")
        )
        results["whatsapp"] = success
    
    return {"sent": True, "results": results}


# Helper functions for specific notification types

async def notify_new_order(order_data: dict):
    """Notify admins about a new order."""
    order_number = order_data.get("order_number", order_data.get("id", "?"))
    total = order_data.get("total", 0)
    customer = order_data.get("customer_name", order_data.get("customer_email", "Client"))
    items_count = len(order_data.get("items", []))
    
    html = f"<b>Nouvelle commande #{order_number}</b>\n<b>Client:</b> {customer}\n<b>Articles:</b> {items_count}\n<b>Total:</b> {total}€"
    in_app = f"#{order_number} • {customer} • {items_count} article(s) • {total}€"
    
    return await send_notification("new_order", in_app, html, title=f"Nouvelle commande #{order_number}", priority="high")


async def notify_new_return(return_data: dict):
    """Notify admins about a new return request."""
    return_number = return_data.get("return_number", return_data.get("id", "?"))
    customer = return_data.get("customer_name", return_data.get("customer_email", "Client"))
    reason = return_data.get("reason", "Non spécifié")
    amount = return_data.get("refund_amount", 0)
    
    html = f"<b>Nouvelle demande de retour #{return_number}</b>\n<b>Client:</b> {customer}\n<b>Motif:</b> {reason}\n<b>Montant:</b> {amount}€"
    in_app = f"#{return_number} • {customer} • Motif: {reason} • {amount}€"
    
    return await send_notification("new_return", in_app, html, title=f"Retour #{return_number}", priority="normal")


async def notify_new_customer(customer_data: dict):
    """Notify admins about a new customer registration."""
    name = customer_data.get("name", customer_data.get("email", "Client"))
    email = customer_data.get("email", "")
    
    html = f"<b>Nouveau client inscrit</b>\n<b>Nom:</b> {name}\n<b>Email:</b> {email}"
    in_app = f"{name} ({email})"
    
    return await send_notification("new_customer", in_app, html, title="Nouveau client inscrit", priority="normal")


async def notify_low_stock(product_name: str, variant: str, stock: int):
    """Notify admins about low stock."""
    html = f"<b>Stock faible: {product_name}</b>\n<b>Variant:</b> {variant}\n<b>Stock restant:</b> {stock}"
    in_app = f"{product_name} • {variant} • {stock} restant(s)"
    
    return await send_notification("low_stock", in_app, html, title=f"Stock faible: {product_name}", priority="high")
