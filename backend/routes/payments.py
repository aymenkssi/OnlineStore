"""
Stripe Checkout integration routes.
Creates checkout sessions and polls payment status.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
import os
import uuid

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])

db = None

def init_db(database):
    global db
    db = database


class CreateCheckoutRequest(BaseModel):
    order_id: str
    origin_url: str


@router.post("/checkout")
async def create_checkout_session(payload: CreateCheckoutRequest, http_request: Request):
    """Create a Stripe checkout session for an existing order."""
    order = await db.orders.find_one({"id": payload.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    if order.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Cette commande est déjà payée")

    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")

    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/order-confirmation?session_id={{CHECKOUT_SESSION_ID}}&order_id={order['id']}"
    cancel_url = f"{origin}/checkout?cancelled=true"

    amount = float(order["total"])
    metadata = {
        "order_id": order["id"],
        "order_number": order.get("order_number", ""),
        "customer_email": order.get("customer_email", ""),
    }

    checkout_req = CheckoutSessionRequest(
        amount=amount,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        payment_methods=["card"],
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)

    # Store payment transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "order_id": order["id"],
        "order_number": order.get("order_number", ""),
        "customer_email": order.get("customer_email", ""),
        "amount": amount,
        "currency": "eur",
        "payment_status": "initiated",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.insert_one(transaction)

    # Update order with session_id
    await db.orders.update_one(
        {"id": order["id"]},
        {"$set": {
            "stripe_session_id": session.session_id,
            "payment_status": "initiated",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    return {"url": session.url, "session_id": session.session_id}


@router.get("/status/{session_id}")
async def get_payment_status(session_id: str, http_request: Request):
    """Poll Stripe for checkout session status and update DB."""
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")

    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    try:
        status = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Session Stripe invalide: {str(e)}")

    # Find the transaction
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx:
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
        }

    # Update transaction if status changed
    new_status = status.payment_status  # "paid", "unpaid", "no_payment_required"
    if tx.get("payment_status") != new_status:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": new_status,
                "stripe_status": status.status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )

        # Update order payment status
        order_id = tx.get("order_id")
        if order_id and new_status == "paid":
            order = await db.orders.find_one({"id": order_id})
            if order and order.get("payment_status") != "paid":
                await db.orders.update_one(
                    {"id": order_id},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "processing",
                        "paid_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }},
                )
                # Send confirmation email
                try:
                    import auth_email
                    auth_email.send_order_confirmation(
                        email=order.get("customer_email", ""),
                        name=order.get("customer_name", ""),
                        order_number=order.get("order_number", ""),
                        total=order.get("total", 0),
                        items=order.get("items", []),
                    )
                except Exception as e:
                    print(f"[auth_email] order confirmation send failed: {e}")

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "order_id": tx.get("order_id"),
    }


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")

    try:
        event = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        print(f"[stripe webhook] error: {e}")
        return {"status": "error", "detail": str(e)}

    if event.payment_status == "paid" and event.session_id:
        tx = await db.payment_transactions.find_one({"session_id": event.session_id})
        if tx and tx.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {
                    "payment_status": "paid",
                    "stripe_event_id": event.event_id,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            order_id = tx.get("order_id") or event.metadata.get("order_id")
            if order_id:
                order = await db.orders.find_one({"id": order_id})
                if order and order.get("payment_status") != "paid":
                    await db.orders.update_one(
                        {"id": order_id},
                        {"$set": {
                            "payment_status": "paid",
                            "status": "processing",
                            "paid_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }},
                    )
                    try:
                        import auth_email
                        auth_email.send_order_confirmation(
                            email=order.get("customer_email", ""),
                            name=order.get("customer_name", ""),
                            order_number=order.get("order_number", ""),
                            total=order.get("total", 0),
                            items=order.get("items", []),
                        )
                    except Exception as e:
                        print(f"[auth_email] order confirmation send failed: {e}")

    return {"status": "ok"}
