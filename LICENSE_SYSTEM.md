# 🔐 License System — Deployment & Operations Guide

A complete licensing system for the Best Shop e-commerce app. Each customer must
have a valid license key — bound to a single deployment domain — to run the
backend.

## Architecture

```
   ┌─────────────────────┐           ┌───────────────────────┐
   │  Vendor (you)       │           │  Customer deployment  │
   │                     │           │                       │
   │  License Server     │◄──────────│  Best Shop backend    │
   │  (this repo)        │  HTTPS    │  (license_check.py)   │
   │  /app/license_server│           │                       │
   │                     │           │  - on startup         │
   │  • Admin UI         │           │  - heartbeat /24h     │
   │  • Issues keys      │           │  - blocks if invalid  │
   │  • Validates        │           └───────────────────────┘
   │  • Signs JWT (RS256)│
   └─────────────────────┘
```

* **License server** (you host once): issues + validates licenses. Stores them
  in MongoDB. Provides an admin UI to create/revoke keys. Signs license tokens
  with RSA private key.
* **License client** (`backend/license_check.py`): runs on every customer
  deployment. On startup it activates or heartbeats to your server. Verifies
  the JWT with the embedded **public** key. If anything fails → backend
  refuses to start.

---

## Part 1 — Deploy YOUR (vendor) license server (one-time)

### Option A · Render.com (free tier, simplest)

1. Push `/app/license_server/` to a new GitHub repo.
2. Create a free MongoDB Atlas cluster ([cloud.mongodb.com](https://cloud.mongodb.com)) →
   copy the connection string.
3. On [render.com](https://render.com) → New → Web Service → connect repo.
   * Build command: `pip install -r requirements.txt`
   * Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (settings → environment) — copy from `.env.example`,
   replace `MONGO_URL`, set strong `ADMIN_PASSWORD` and a random
   `ADMIN_JWT_SECRET` (use `openssl rand -hex 32`).
5. Upload the RSA keys (or generate fresh ones — see below) and reference their
   paths via env vars `PRIVATE_KEY_PATH` / `PUBLIC_KEY_PATH`. On Render the
   simplest is to paste the keys directly as env vars and adjust `server.py` to
   read them. (The provided code uses files; commit them or use Render Secret
   Files.)

### Option B · Any small VPS (5–10 €/month)

```bash
git clone <your-repo>
cd license_server
cp .env.example .env  &&  vim .env       # set MONGO_URL, ADMIN_*, secrets
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -c "
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization as s
k = rsa.generate_private_key(65537, 2048)
open('private_key.pem','w').write(k.private_bytes(s.Encoding.PEM, s.PrivateFormat.PKCS8, s.NoEncryption()).decode())
open('public_key.pem','w').write(k.public_key().public_bytes(s.Encoding.PEM, s.PublicFormat.SubjectPublicKeyInfo).decode())
"
uvicorn server:app --host 0.0.0.0 --port 8002
```

Put behind nginx + Let's Encrypt → `https://license.yourdomain.com`.

### Generate the RSA key pair (only once, ever)

```bash
cd license_server
python3 -c "
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization as s
k = rsa.generate_private_key(65537, 2048)
open('private_key.pem','w').write(k.private_bytes(s.Encoding.PEM, s.PrivateFormat.PKCS8, s.NoEncryption()).decode())
open('public_key.pem','w').write(k.public_key().public_bytes(s.Encoding.PEM, s.PublicFormat.SubjectPublicKeyInfo).decode())
"
```

> **CRITICAL** — keep `private_key.pem` secret. If leaked, anyone can forge
> licenses. The `public_key.pem` is shipped to every customer (it can only
> verify, not forge).

---

## Part 2 — Sell a license to a customer

1. Open your license server's admin UI: `https://license.yourdomain.com/admin`
2. Sign in with `ADMIN_EMAIL` + `ADMIN_PASSWORD` from your `.env`.
3. Click **Generate license key** → enter customer email + name + optional
   notes (e.g. order #).
4. Copy the displayed key → email it to the customer along with these
   instructions and the public key.

### Email template to send to the customer

> Hello [Name],
>
> Thank you for your purchase. Below is your license:
>
> ```
> License key: BSHP-XXXX-XXXX-XXXX-XXXX
> License server: https://license.yourdomain.com
> ```
>
> To activate, set the following environment variables on your deployment
> (`backend/.env`):
>
> ```
> LICENSE_ENABLED=true
> LICENSE_KEY=BSHP-XXXX-XXXX-XXXX-XXXX
> LICENSE_SERVER_URL=https://license.yourdomain.com
> LICENSE_DOMAIN=https://shop.your-domain.com
> LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
> MIIBIjANBgkq...
> -----END PUBLIC KEY-----"
> ```
>
> Restart the backend. The first start will bind your license to the domain.
> Future deployments on that same domain will work transparently.
>
> If you need to migrate to a different domain (re-deployment, server change,
> etc.), email me at [your email] and I will reset the binding.

---

## Part 3 — How the customer's backend behaves

* **Startup** — reads env vars, computes a server fingerprint
  (`sha256(machine_id + DB_NAME + domain)`), POSTs to `/api/v1/activate`. The
  server returns a signed JWT (24 h validity). The JWT is verified locally
  with the embedded public key and cached at `/tmp/.license_cache.json`.
* **Every 24 h** — background task POSTs to `/api/v1/heartbeat` to refresh
  the JWT.
* **Failure modes**
  | Situation | Behaviour |
  |---|---|
  | `LICENSE_ENABLED=false` | License check skipped (dev mode). |
  | Wrong / unknown key | Backend exits 1, supervisor will retry until fixed. |
  | License revoked | Same — refused at next startup or next heartbeat. |
  | Domain mismatch | `409 Conflict` from server, backend exits 1. |
  | License server unreachable | Falls back to cached token. After 3 days offline, backend exits 1. |
  | JWT signature invalid | Backend exits 1 (tampering attempt). |

---

## Part 4 — Vendor operations

### Revoke a license (customer didn't pay / chargeback)

* Admin UI → click **Revoke**. Within 24 h the customer's deployment will hit
  the next heartbeat, see `403 License is revoked`, and shut down.

### Allow a customer to redeploy on a new domain

* Admin UI → click **Reset bind** on their license. Tell them to restart the
  backend; the next startup will bind to the new domain.

### Re-activate a previously revoked license

* Admin UI → click **Re-activate**.

### Delete a license entirely

* Admin UI → **Delete** (cannot be undone).

---

## Part 5 — Local development

* Keep `LICENSE_ENABLED=false` in your `backend/.env`.
* The license module logs `running in development mode (no license check)`
  and skips network calls.
* Run end-to-end license tests against a local server:

  ```bash
  cd /app/license_server && uvicorn server:app --port 8002
  # in another shell
  curl -X POST localhost:8002/api/v1/admin/login -d '{"email":"admin@bestshop.com","password":"admin123"}' -H 'Content-Type: application/json'
  # then create + activate a license, set LICENSE_ENABLED=true and restart backend
  ```

---

## Files & layout

```
/app/license_server/
├── server.py             # FastAPI app (public + admin endpoints)
├── requirements.txt
├── .env.example          # Copy → .env and fill secrets
├── private_key.pem       # RSA PRIVATE — never share, never commit publicly
├── public_key.pem        # RSA PUBLIC  — given to customers
└── static/admin.html     # Vendor management UI

/app/backend/
├── license_check.py      # Client-side verification (called on startup)
├── server.py             # Wires the check into FastAPI startup_event
└── .env                  # LICENSE_* variables (DISABLED by default)
```

---

## Security notes

* **Always** serve the license server over HTTPS. The license JWT is the proof
  of validity; if MITM'd on plain HTTP the client could be tricked.
* The signature uses **RS256** (asymmetric). Customers cannot forge tokens
  even though they own the public key.
* Domain binding is case-insensitive, scheme-stripped, port-stripped. A
  customer cannot bypass binding by changing `https` to `http` or adding a
  port.
* The fingerprint adds defense-in-depth: same domain + different machine
  fingerprint is allowed (machine moves), but the server records both for
  forensics.
* `ADMIN_JWT_SECRET` and `ADMIN_PASSWORD` must be strong and rotated if leaked.
* Consider rate-limiting `/api/v1/activate` and `/api/v1/admin/login` in
  production (use `slowapi`, already in dependencies of main backend).

---

## Pricing / business hooks (optional)

* Add a Stripe webhook on the license server:
  `POST /api/v1/stripe/webhook` → on `checkout.session.completed`,
  auto-create the license and email it to the customer (use Resend/SendGrid).
* Add per-license expiry to switch from one-shot to subscription pricing
  later — the server already supports `expires_at`.
