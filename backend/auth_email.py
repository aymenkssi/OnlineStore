"""
Auth email notification service using Resend.
Emails sent on security-sensitive events (password change, 2FA enable/disable).
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional

import resend

logger = logging.getLogger(__name__)

_RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
_SENDER = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
_SITE_NAME = os.environ.get("SITE_NAME", "Best Shop")

if _RESEND_API_KEY:
    resend.api_key = _RESEND_API_KEY


def _html_base(title: str, body_html: str, ip: Optional[str] = None) -> str:
    ip_line = f"<p style='color:#888;font-size:12px'>IP : {ip}</p>" if ip else ""
    ts = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#222">
      <h2 style="color:#0b0d10">{title}</h2>
      {body_html}
      <p style="color:#666;font-size:13px;margin-top:24px">
        Date : {ts}
      </p>
      {ip_line}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="color:#888;font-size:12px">
        Si vous n'êtes pas à l'origine de cette action, changez immédiatement votre mot de passe
        et contactez l'administrateur de {_SITE_NAME}.
      </p>
    </div>
    """


def _send(to: str, subject: str, html: str, sender: Optional[str] = None) -> bool:
    if not _RESEND_API_KEY:
        logger.info("RESEND_API_KEY absent — email '%s' vers %s NON envoyé (dev).", subject, to)
        return False
    try:
        resend.Emails.send({
            "from": sender or _SENDER,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Resend failed: %s", exc)
        return False


def send_password_changed(email: str, name: str = "", ip: Optional[str] = None) -> bool:
    html = _html_base(
        title="🔐 Votre mot de passe a été modifié",
        body_html=(
            f"<p>Bonjour {name or email},</p>"
            "<p>Nous vous confirmons que le mot de passe associé à votre compte vient d'être modifié.</p>"
            "<p>Vous pouvez continuer à utiliser votre compte normalement.</p>"
        ),
        ip=ip,
    )
    return _send(email, f"[{_SITE_NAME}] Mot de passe modifié", html)


def send_verification(email: str, name: str, verify_url: str) -> bool:
    html = _html_base(
        title="✉️ Vérifiez votre adresse email",
        body_html=(
            f"<p>Bonjour {name or email},</p>"
            "<p>Merci de votre inscription. Cliquez sur le bouton ci-dessous pour vérifier votre email :</p>"
            f"<p style='text-align:center;margin:24px 0'>"
            f"<a href='{verify_url}' style='display:inline-block;padding:12px 24px;background:#0b0d10;color:#fff;text-decoration:none;border-radius:8px'>Vérifier mon email</a>"
            "</p>"
            f"<p style='color:#666;font-size:12px'>Ou copiez ce lien : {verify_url}</p>"
            "<p style='color:#888;font-size:12px'>Lien valable 24h. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p>"
        ),
    )
    return _send(email, f"[{_SITE_NAME}] Vérifiez votre email", html)


def send_account_locked(email: str, name: str, minutes: int, ip: Optional[str] = None) -> bool:
    html = _html_base(
        title="🔒 Compte temporairement verrouillé",
        body_html=(
            f"<p>Bonjour {name or email},</p>"
            f"<p>Votre compte vient d'être temporairement verrouillé pendant <strong>{minutes} minutes</strong> "
            "suite à 5 tentatives de connexion incorrectes.</p>"
            "<p>Vous pourrez vous reconnecter après l'expiration du verrou. "
            "Si vous n'êtes pas à l'origine de ces tentatives, nous vous recommandons de changer votre mot de passe.</p>"
        ),
        ip=ip,
    )
    return _send(email, f"[{_SITE_NAME}] Compte verrouillé", html)


def send_2fa_enabled(email: str, name: str = "", ip: Optional[str] = None) -> bool:
    html = _html_base(
        title="🛡️ Authentification à deux facteurs activée",
        body_html=(
            f"<p>Bonjour {name or email},</p>"
            "<p>La double authentification (2FA TOTP) vient d'être activée sur votre compte.</p>"
            "<p>À chaque connexion, il vous sera demandé un code à 6 chiffres généré par "
            "votre application d'authentification (Google Authenticator, Authy, 1Password...).</p>"
        ),
        ip=ip,
    )
    return _send(email, f"[{_SITE_NAME}] 2FA activée", html)


def send_2fa_disabled(email: str, name: str = "", ip: Optional[str] = None) -> bool:
    html = _html_base(
        title="⚠️ Authentification à deux facteurs désactivée",
        body_html=(
            f"<p>Bonjour {name or email},</p>"
            "<p><strong>La double authentification (2FA) vient d'être désactivée</strong> sur votre compte.</p>"
            "<p>Votre compte est désormais protégé uniquement par votre mot de passe.</p>"
        ),
        ip=ip,
    )
    return _send(email, f"[{_SITE_NAME}] 2FA désactivée", html)


def send_password_reset(email: str, name: str, reset_url: str, sender: Optional[str] = None) -> bool:
    html = _html_base(
        title="🔑 Réinitialisation de votre mot de passe",
        body_html=(
            f"<p>Bonjour {name or email},</p>"
            "<p>Vous avez demandé la réinitialisation de votre mot de passe. "
            "Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>"
            f"<p style='text-align:center;margin:24px 0'>"
            f"<a href='{reset_url}' style='display:inline-block;padding:12px 24px;"
            f"background:#0b0d10;color:#fff;text-decoration:none;border-radius:8px'>"
            f"Réinitialiser mon mot de passe</a></p>"
            f"<p style='color:#666;font-size:12px'>Ou copiez ce lien : {reset_url}</p>"
            "<p style='color:#888;font-size:12px'>Ce lien est valable <strong>1 heure</strong>. "
            "Si vous n'avez pas demandé cette réinitialisation, ignorez simplement ce message.</p>"
        ),
    )
    return _send(email, f"[{_SITE_NAME}] Réinitialisation de mot de passe", html, sender=sender)


def send_order_confirmation(email: str, name: str, order_number: str, total: float, items: list) -> bool:
    items_html = ""
    for item in items[:10]:
        qty = item.get("quantity", 1)
        price = item.get("price", 0)
        items_html += (
            f"<tr>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #eee'>{item.get('name', '')}</td>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:center'>"
            f"{item.get('color', '')} / {item.get('size', '')}</td>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:center'>{qty}</td>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:right'>"
            f"{price * qty:.2f} EUR</td>"
            f"</tr>"
        )

    html = _html_base(
        title="Confirmation de votre commande",
        body_html=(
            f"<p>Bonjour {name or email},</p>"
            f"<p>Merci pour votre commande <strong>#{order_number}</strong> !</p>"
            "<p>Votre paiement a été confirmé. Voici le récapitulatif :</p>"
            "<table style='width:100%;border-collapse:collapse;margin:16px 0'>"
            "<thead><tr style='background:#f8f8f8'>"
            "<th style='padding:8px 12px;text-align:left;border-bottom:2px solid #ddd'>Article</th>"
            "<th style='padding:8px 12px;text-align:center;border-bottom:2px solid #ddd'>Variante</th>"
            "<th style='padding:8px 12px;text-align:center;border-bottom:2px solid #ddd'>Qté</th>"
            "<th style='padding:8px 12px;text-align:right;border-bottom:2px solid #ddd'>Prix</th>"
            "</tr></thead>"
            f"<tbody>{items_html}</tbody>"
            "<tfoot><tr>"
            f"<td colspan='3' style='padding:12px;text-align:right;font-weight:bold;border-top:2px solid #ddd'>Total</td>"
            f"<td style='padding:12px;text-align:right;font-weight:bold;border-top:2px solid #ddd;font-size:18px'>"
            f"{total:.2f} EUR</td>"
            "</tr></tfoot></table>"
            "<p>Nous préparons votre commande et vous tiendrons informé(e) de son expédition.</p>"
            "<p style='color:#666;font-size:13px'>Conservez cet email comme preuve d'achat.</p>"
        ),
    )
    return _send(email, f"[{_SITE_NAME}] Confirmation commande #{order_number}", html)
