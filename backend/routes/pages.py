import sys
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import resend
import asyncio

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Resend
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _parent not in sys.path:
    sys.path.insert(0, _parent)
from auth_deps import require_admin

router = APIRouter()

class TranslatedContent(BaseModel):
    title: str = ""
    content: str = ""

class PageContent(BaseModel):
    # Legacy fields (FR-only) — kept for backwards compatibility
    title: Optional[str] = None
    content: Optional[str] = None
    # New: per-language content
    translations: Optional[dict] = None  # {"fr": {"title","content"}, "en": {...}, "ar": {...}}
    contactEmail: Optional[str] = None

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

SUPPORTED_LANGS = ("fr", "en", "ar")

def _normalize_page_doc(doc: dict) -> dict:
    """Ensure every page exposes a `translations` dict (fr/en/ar). Backfill from legacy fields."""
    if not doc:
        return doc
    translations = doc.get("translations") or {}
    # Backfill FR from legacy top-level title/content if translations missing
    if not translations.get("fr") and (doc.get("title") or doc.get("content")):
        translations["fr"] = {"title": doc.get("title", ""), "content": doc.get("content", "")}
    for lang in SUPPORTED_LANGS:
        translations.setdefault(lang, {"title": "", "content": ""})
    doc["translations"] = translations
    return doc

@router.get("/{page_id}")
async def get_page(page_id: str, lang: Optional[str] = None):
    """
    Get page content by ID.
    - With `?lang=xx`: returns the requested language (with FR fallback if empty).
    - Without `lang`: returns the full doc with all translations (used by admin).
    """
    page = await db.pages.find_one({"page_id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    page = _normalize_page_doc(page)

    if lang:
        translations = page.get("translations", {})
        # Resolve preferred language with French fallback when empty
        chosen = translations.get(lang) or {}
        fr = translations.get("fr") or {}
        return {
            "page_id": page.get("page_id"),
            "title": chosen.get("title") or fr.get("title") or page.get("title", ""),
            "content": chosen.get("content") or fr.get("content") or page.get("content", ""),
            "contactEmail": page.get("contactEmail"),
            "lang": lang,
        }
    return page

@router.put("/{page_id}")
async def update_page(page_id: str, page: PageContent, _admin: dict = Depends(require_admin)):
    """Update or create page content (full multilingual doc)."""
    page_data = {"page_id": page_id, "contactEmail": page.contactEmail}
    if page.translations:
        # Sanitize: only keep supported langs and required keys
        clean = {}
        for lang in SUPPORTED_LANGS:
            t = (page.translations or {}).get(lang) or {}
            clean[lang] = {"title": t.get("title", ""), "content": t.get("content", "")}
        page_data["translations"] = clean
        # Mirror French content to legacy top-level fields (kept for any old consumers)
        page_data["title"] = clean["fr"]["title"]
        page_data["content"] = clean["fr"]["content"]
    else:
        # Legacy single-language payload
        page_data["title"] = page.title or ""
        page_data["content"] = page.content or ""
        page_data["translations"] = {
            "fr": {"title": page.title or "", "content": page.content or ""},
            "en": {"title": "", "content": ""},
            "ar": {"title": "", "content": ""},
        }

    await db.pages.update_one({"page_id": page_id}, {"$set": page_data}, upsert=True)
    return {"message": "Page updated successfully", "page_id": page_id}

@router.post("/contact/send")
async def send_contact_message(message: ContactMessage):
    """Send contact form message via Resend email"""
    contact_page = await db.pages.find_one({"page_id": "contact"}, {"_id": 0})
    
    if not contact_page or not contact_page.get("contactEmail"):
        raise HTTPException(status_code=400, detail="Contact email not configured")
    
    recipient_email = contact_page["contactEmail"]
    
    # Store message in database
    message_data = {
        "name": message.name,
        "email": message.email,
        "subject": message.subject,
        "message": message.message,
        "status": "new",
        "email_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contact_messages.insert_one(message_data)
    message_data.pop("_id", None)
    
    # Send email via Resend
    email_sent = False
    if resend.api_key:
        try:
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #000; color: #fff; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 20px;">BEST SHOP - Nouveau message de contact</h1>
                </div>
                <div style="padding: 30px; background-color: #f9f9f9;">
                    <h2 style="color: #333; margin-top: 0;">{message.subject}</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 8px 0; color: #666; width: 100px;"><strong>Nom :</strong></td>
                            <td style="padding: 8px 0;">{message.name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;"><strong>Email :</strong></td>
                            <td style="padding: 8px 0;"><a href="mailto:{message.email}">{message.email}</a></td>
                        </tr>
                    </table>
                    <div style="background-color: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
                        <p style="color: #666; margin-top: 0; font-size: 12px; text-transform: uppercase;">Message :</p>
                        <p style="color: #333; line-height: 1.6; white-space: pre-wrap;">{message.message}</p>
                    </div>
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">
                        Vous pouvez répondre directement à <a href="mailto:{message.email}">{message.email}</a>
                    </p>
                </div>
                <div style="padding: 15px; text-align: center; color: #999; font-size: 11px;">
                    Ce message a été envoyé depuis le formulaire de contact de Best Shop
                </div>
            </div>
            """
            
            params = {
                "from": SENDER_EMAIL,
                "to": [recipient_email],
                "reply_to": message.email,
                "subject": f"[Contact] {message.subject} - de {message.name}",
                "html": html_content
            }
            
            await asyncio.to_thread(resend.Emails.send, params)
            email_sent = True
            
            # Update message status
            await db.contact_messages.update_one(
                {"email": message.email, "created_at": message_data["created_at"]},
                {"$set": {"email_sent": True, "status": "sent"}}
            )
            
        except Exception as e:
            print(f"Resend email error: {e}")
            # Message is still stored, just email failed
            await db.contact_messages.update_one(
                {"email": message.email, "created_at": message_data["created_at"]},
                {"$set": {"email_error": str(e)}}
            )
    
    return {
        "message": "Message sent successfully",
        "email_sent": email_sent
    }

@router.get("/messages/list")
async def list_contact_messages():
    """List all contact messages (admin only)"""
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return messages
