"""
TOTP (Time-based One-Time Password) utilities for 2FA.
"""
import base64
import io
import os
import secrets
from typing import Tuple

import pyotp
import qrcode


ISSUER = os.environ.get("TOTP_ISSUER", "Best Shop")


def generate_secret() -> str:
    """Generate a base32 TOTP secret (160 bits)."""
    return pyotp.random_base32()


def build_provisioning_uri(secret: str, email: str) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name=ISSUER)


def build_qr_code_data_url(provisioning_uri: str) -> str:
    """Return a data:image/png;base64 URL of the QR code for the provisioning URI."""
    img = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def verify_code(secret: str, code: str, valid_window: int = 1) -> bool:
    """Verify a 6-digit TOTP code against the secret."""
    if not secret or not code:
        return False
    code = code.strip().replace(" ", "")
    if not code.isdigit() or len(code) != 6:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=valid_window)


def generate_recovery_codes(count: int = 8) -> Tuple[list, list]:
    """Generate `count` recovery codes. Returns (plain_codes, hashed_codes).

    The plain codes are shown ONCE to the user; only the hashed versions are stored.
    """
    import hashlib
    plain = []
    hashed = []
    for _ in range(count):
        # 10-char alphanumeric, grouped "XXXXX-XXXXX" for readability
        raw = secrets.token_urlsafe(8)[:10].upper().replace("_", "X").replace("-", "Y")
        code = f"{raw[:5]}-{raw[5:]}"
        plain.append(code)
        hashed.append(hashlib.sha256(code.encode()).hexdigest())
    return plain, hashed


def verify_recovery_code(stored_hashes: list, code: str) -> Tuple[bool, list]:
    """Verify a recovery code and return (ok, updated_hashes_without_used)."""
    import hashlib
    if not code:
        return False, stored_hashes
    normalized = code.strip().upper().replace(" ", "")
    h = hashlib.sha256(normalized.encode()).hexdigest()
    if h in stored_hashes:
        new_hashes = [x for x in stored_hashes if x != h]
        return True, new_hashes
    return False, stored_hashes
