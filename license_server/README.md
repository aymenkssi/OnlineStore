# License Server

This is the vendor-side service that issues and validates licenses for the
Best Shop application. See **`/app/LICENSE_SYSTEM.md`** at the repo root for
the complete deployment & operations guide.

## Quick start (local dev)

```bash
cp .env.example .env       # then edit credentials/secrets
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8002
```

Open <http://localhost:8002/admin> and sign in with the credentials from
`.env`.

## Key files

| File | Purpose |
|---|---|
| `server.py` | FastAPI app (public + admin endpoints) |
| `static/admin.html` | Vendor management UI |
| `private_key.pem` | RSA private — **NEVER share** |
| `public_key.pem` | RSA public — give to customers |
| `.env.example` | Configuration template |

## Endpoints

### Public (called by customer deployments)
- `POST /api/v1/activate` — first activation, binds license to domain
- `POST /api/v1/heartbeat` — periodic re-check (every 24 h)
- `GET /api/v1/public-key` — fetch the public key
- `GET /api/v1/health` — health probe

### Admin (vendor only, protected by `Authorization: Bearer …`)
- `POST /api/v1/admin/login`
- `GET  /api/v1/admin/licenses`
- `POST /api/v1/admin/licenses` — create
- `POST /api/v1/admin/licenses/{id}/revoke`
- `POST /api/v1/admin/licenses/{id}/activate`
- `POST /api/v1/admin/licenses/{id}/reset-binding`
- `DELETE /api/v1/admin/licenses/{id}`
