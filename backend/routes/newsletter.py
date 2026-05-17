import os
import asyncio
import logging
import sys
import uuid
import resend
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient

# Ensure parent dir is on path so auth_deps can be imported
_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _parent not in sys.path:
    sys.path.insert(0, _parent)
from auth_deps import require_admin

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Pydantic Models
class SubscribeRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UnsubscribeRequest(BaseModel):
    email: EmailStr
    token: str

class NewsletterConfig(BaseModel):
    subject_new_product: str = "Nouveau produit disponible !"
    subject_promotion: str = "Nouvelle promotion exceptionnelle !"
    header_text: str = "BEST SHOP"
    footer_text: str = "Merci de votre fidélité !"
    primary_color: str = "#DC2626"
    sender_email: str = "onboarding@resend.dev"
    password_reset_sender_email: str = "onboarding@resend.dev"
    logo_url: Optional[str] = None

class SendNewsletterRequest(BaseModel):
    subject: str
    title: str
    content: str
    button_text: Optional[str] = "Voir maintenant"
    button_url: Optional[str] = None

# Helper function to generate unsubscribe token
def generate_unsubscribe_token():
    return str(uuid.uuid4())

# Helper function to get newsletter config
async def get_newsletter_config():
    config = await db.settings.find_one({"type": "newsletter"}, {"_id": 0})
    if not config:
        default_config = {
            "type": "newsletter",
            "subject_new_product": "Nouveau produit disponible !",
            "subject_promotion": "Nouvelle promotion exceptionnelle !",
            "header_text": "BEST SHOP",
            "footer_text": "Merci de votre fidélité !",
            "primary_color": "#DC2626",
            "sender_email": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
            "password_reset_sender_email": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
            "logo_url": None
        }
        await db.settings.insert_one(default_config)
        # Return config without _id field
        return {k: v for k, v in default_config.items() if k != "_id"}
    # Ensure password_reset_sender_email has a fallback for older configs
    if "password_reset_sender_email" not in config:
        config["password_reset_sender_email"] = config.get("sender_email") or os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    return config

# Helper function to build HTML email template
def build_email_html(title: str, content: str, button_text: str, button_url: str, 
                     unsubscribe_url: str, config: dict, product_image: str = None):
    primary_color = config.get("primary_color", "#DC2626")
    header_text = config.get("header_text", "BEST SHOP")
    footer_text = config.get("footer_text", "Merci de votre fidélité !")
    
    product_image_html = ""
    if product_image:
        product_image_html = f'''
        <tr>
            <td style="padding: 20px;">
                <img src="{product_image}" alt="Product" style="max-width: 100%; height: auto; border-radius: 8px;" />
            </td>
        </tr>
        '''
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 20px 0;">
                    <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(to right, {primary_color}, {primary_color}dd); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">{header_text}</h1>
                            </td>
                        </tr>
                        
                        <!-- Product Image -->
                        {product_image_html}
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px;">
                                <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">{title}</h2>
                                <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    {content}
                                </p>
                                <table role="presentation" style="margin: 0 auto;">
                                    <tr>
                                        <td style="background-color: {primary_color}; border-radius: 6px;">
                                            <a href="{button_url}" style="display: inline-block; padding: 15px 30px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">
                                                {button_text}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                                <p style="color: #888888; font-size: 14px; margin: 0 0 10px 0;">{footer_text}</p>
                                <p style="color: #888888; font-size: 12px; margin: 0;">
                                    <a href="{unsubscribe_url}" style="color: #888888; text-decoration: underline;">
                                        Se désinscrire de la newsletter
                                    </a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    '''

# Subscribe to newsletter
@router.post("/subscribe")
async def subscribe_newsletter(request: SubscribeRequest):
    # Check if already subscribed
    existing = await db.newsletter_subscribers.find_one({"email": request.email}, {"_id": 0})
    
    if existing:
        if existing.get("active", True):
            return {"message": "Vous êtes déjà inscrit à notre newsletter", "status": "already_subscribed"}
        else:
            # Reactivate subscription
            await db.newsletter_subscribers.update_one(
                {"email": request.email},
                {"$set": {"active": True, "resubscribed_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"message": "Votre inscription a été réactivée", "status": "reactivated"}
    
    # Create new subscriber
    subscriber = {
        "id": str(uuid.uuid4()),
        "email": request.email,
        "name": request.name,
        "unsubscribe_token": generate_unsubscribe_token(),
        "active": True,
        "subscribed_at": datetime.now(timezone.utc).isoformat(),
        "source": "website"
    }
    
    await db.newsletter_subscribers.insert_one(subscriber)
    
    # Send welcome email
    config = await get_newsletter_config()
    try:
        frontend_url = os.environ.get("FRONTEND_URL", "https://store-test.preview.emergentagent.com")
        unsubscribe_url = f"{frontend_url}/newsletter/unsubscribe?email={request.email}&token={subscriber['unsubscribe_token']}"
        
        html_content = build_email_html(
            title="Bienvenue dans notre newsletter !",
            content="Merci de vous être inscrit à notre newsletter. Vous recevrez désormais nos dernières nouveautés et promotions exclusives directement dans votre boîte mail.",
            button_text="Découvrir notre boutique",
            button_url=frontend_url,
            unsubscribe_url=unsubscribe_url,
            config=config
        )
        
        params = {
            "from": config.get("sender_email", SENDER_EMAIL),
            "to": [request.email],
            "subject": "Bienvenue dans la newsletter Best Shop !",
            "html": html_content
        }
        
        await asyncio.to_thread(resend.Emails.send, params)
    except Exception as e:
        logger.error(f"Failed to send welcome email: {str(e)}")
    
    return {"message": "Inscription réussie ! Vérifiez votre boîte mail.", "status": "subscribed"}

# Unsubscribe from newsletter
@router.post("/unsubscribe")
async def unsubscribe_newsletter(request: UnsubscribeRequest):
    subscriber = await db.newsletter_subscribers.find_one(
        {"email": request.email, "unsubscribe_token": request.token},
        {"_id": 0}
    )
    
    if not subscriber:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé ou token invalide")
    
    await db.newsletter_subscribers.update_one(
        {"email": request.email},
        {"$set": {"active": False, "unsubscribed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Vous avez été désinscrit de notre newsletter", "status": "unsubscribed"}

# Unsubscribe via GET (for email links)
@router.get("/unsubscribe")
async def unsubscribe_newsletter_get(email: str = Query(...), token: str = Query(...)):
    subscriber = await db.newsletter_subscribers.find_one(
        {"email": email, "unsubscribe_token": token},
        {"_id": 0}
    )
    
    if not subscriber:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé ou token invalide")
    
    await db.newsletter_subscribers.update_one(
        {"email": email},
        {"$set": {"active": False, "unsubscribed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Vous avez été désinscrit de notre newsletter", "status": "unsubscribed"}

# Get all subscribers (admin)
@router.get("/subscribers")
async def get_subscribers(active_only: bool = True, _admin: dict = Depends(require_admin)):
    query = {"active": True} if active_only else {}
    subscribers = await db.newsletter_subscribers.find(query, {"_id": 0}).to_list(1000)
    return subscribers

# Get newsletter config (admin)
@router.get("/config")
async def get_config(_admin: dict = Depends(require_admin)):
    return await get_newsletter_config()

# Update newsletter config (admin)
@router.put("/config")
async def update_config(config: NewsletterConfig, _admin: dict = Depends(require_admin)):
    await db.settings.update_one(
        {"type": "newsletter"},
        {"$set": {
            "type": "newsletter",
            "subject_new_product": config.subject_new_product,
            "subject_promotion": config.subject_promotion,
            "header_text": config.header_text,
            "footer_text": config.footer_text,
            "primary_color": config.primary_color,
            "sender_email": config.sender_email,
            "password_reset_sender_email": config.password_reset_sender_email,
            "logo_url": config.logo_url
        }},
        upsert=True
    )
    return {"message": "Configuration mise à jour"}

# Send newsletter to all subscribers (admin)
@router.post("/send")
async def send_newsletter(request: SendNewsletterRequest, _admin: dict = Depends(require_admin)):
    config = await get_newsletter_config()
    subscribers = await db.newsletter_subscribers.find({"active": True}, {"_id": 0}).to_list(1000)
    
    if not subscribers:
        return {"message": "Aucun abonné actif", "sent": 0}
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://store-test.preview.emergentagent.com")
    button_url = request.button_url or frontend_url
    
    sent_count = 0
    failed_count = 0
    
    for subscriber in subscribers:
        try:
            unsubscribe_url = f"{frontend_url}/newsletter/unsubscribe?email={subscriber['email']}&token={subscriber['unsubscribe_token']}"
            
            html_content = build_email_html(
                title=request.title,
                content=request.content,
                button_text=request.button_text,
                button_url=button_url,
                unsubscribe_url=unsubscribe_url,
                config=config
            )
            
            params = {
                "from": config.get("sender_email", SENDER_EMAIL),
                "to": [subscriber['email']],
                "subject": request.subject,
                "html": html_content
            }
            
            await asyncio.to_thread(resend.Emails.send, params)
            sent_count += 1
        except Exception as e:
            logger.error(f"Failed to send newsletter to {subscriber['email']}: {str(e)}")
            failed_count += 1
    
    return {
        "message": f"Newsletter envoyée à {sent_count} abonnés",
        "sent": sent_count,
        "failed": failed_count
    }

# Send notification for new product (called internally)
async def notify_new_product(product: dict):
    config = await get_newsletter_config()
    subscribers = await db.newsletter_subscribers.find({"active": True}, {"_id": 0}).to_list(1000)
    
    if not subscribers:
        return
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://store-test.preview.emergentagent.com")
    product_url = f"{frontend_url}/product/{product.get('id')}"
    product_image = product.get('images', [None])[0] if product.get('images') else None
    
    for subscriber in subscribers:
        try:
            unsubscribe_url = f"{frontend_url}/newsletter/unsubscribe?email={subscriber['email']}&token={subscriber['unsubscribe_token']}"
            
            html_content = build_email_html(
                title=f"Nouveau : {product.get('name', 'Nouveau produit')}",
                content=f"Découvrez notre nouveau produit : {product.get('name')}. {product.get('description', '')} Prix : {product.get('price', 0)}€",
                button_text="Voir le produit",
                button_url=product_url,
                unsubscribe_url=unsubscribe_url,
                config=config,
                product_image=product_image
            )
            
            params = {
                "from": config.get("sender_email", SENDER_EMAIL),
                "to": [subscriber['email']],
                "subject": config.get("subject_new_product", "Nouveau produit disponible !"),
                "html": html_content
            }
            
            await asyncio.to_thread(resend.Emails.send, params)
        except Exception as e:
            logger.error(f"Failed to notify {subscriber['email']} about new product: {str(e)}")

# Send notification for new promotion (called internally)
async def notify_new_promotion(product: dict):
    config = await get_newsletter_config()
    subscribers = await db.newsletter_subscribers.find({"active": True}, {"_id": 0}).to_list(1000)
    
    if not subscribers:
        return
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://store-test.preview.emergentagent.com")
    product_url = f"{frontend_url}/product/{product.get('id')}"
    product_image = product.get('images', [None])[0] if product.get('images') else None
    
    discount = 0
    if product.get('originalPrice') and product.get('price'):
        discount = round(((product['originalPrice'] - product['price']) / product['originalPrice']) * 100)
    
    for subscriber in subscribers:
        try:
            unsubscribe_url = f"{frontend_url}/newsletter/unsubscribe?email={subscriber['email']}&token={subscriber['unsubscribe_token']}"
            
            html_content = build_email_html(
                title=f"-{discount}% sur {product.get('name', 'un produit')} !",
                content=f"Profitez de notre promotion exceptionnelle sur {product.get('name')} ! Prix original : {product.get('originalPrice', 0)}€, maintenant à seulement {product.get('price', 0)}€. Économisez {product.get('originalPrice', 0) - product.get('price', 0)}€ !",
                button_text="Profiter de l'offre",
                button_url=product_url,
                unsubscribe_url=unsubscribe_url,
                config=config,
                product_image=product_image
            )
            
            params = {
                "from": config.get("sender_email", SENDER_EMAIL),
                "to": [subscriber['email']],
                "subject": config.get("subject_promotion", "Nouvelle promotion exceptionnelle !"),
                "html": html_content
            }
            
            await asyncio.to_thread(resend.Emails.send, params)
        except Exception as e:
            logger.error(f"Failed to notify {subscriber['email']} about promotion: {str(e)}")

# Get newsletter statistics
@router.get("/stats")
async def get_newsletter_stats(_admin: dict = Depends(require_admin)):
    total = await db.newsletter_subscribers.count_documents({})
    active = await db.newsletter_subscribers.count_documents({"active": True})
    unsubscribed = await db.newsletter_subscribers.count_documents({"active": False})
    
    return {
        "total": total,
        "active": active,
        "unsubscribed": unsubscribed
    }


# Delete subscriber (admin only, requires security code)
class DeleteSubscriberRequest(BaseModel):
    code: str

@router.delete("/subscribers/{subscriber_id}")
async def delete_subscriber(subscriber_id: str, request: DeleteSubscriberRequest, _admin: dict = Depends(require_admin)):
    # Verify security code
    settings = await db.settings.find_one({"type": "site_settings"}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=500, detail="Configuration non trouvée")
    
    require_code = settings.get("require_code_for_deletion", True)
    if require_code:
        stored_code = settings.get("deletion_code")
        if not stored_code or request.code != stored_code:
            raise HTTPException(status_code=403, detail="Code de sécurité incorrect")
    
    # Delete subscriber
    result = await db.newsletter_subscribers.delete_one({"id": subscriber_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Abonné non trouvé")
    
    return {"message": "Abonné supprimé avec succès"}
