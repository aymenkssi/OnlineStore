# 6. Stack Technique / Tech Stack

## 🇫🇷 FRANÇAIS

### Backend

| Composant | Technologie | Version |
|---|---|---|
| Langage | Python | 3.11 |
| Framework Web | FastAPI | 0.136 |
| Serveur ASGI | Uvicorn | 0.25+ |
| Base de données | MongoDB | 7.0 |
| Driver DB | Motor (async) | 3.7+ |
| Validation | Pydantic v2 | 2.6+ |
| Auth | JWT (PyJWT) + bcrypt | — |
| 2FA | pyotp (TOTP) | — |
| Email | Resend | — |
| Rate Limiting | slowapi | — |
| Notifications | HTTPx (Telegram / WhatsApp) | — |
| Paiements | Stripe, PayPal SDK | — |
| Process mgr | Supervisor | — |

### Frontend

| Composant | Technologie | Version |
|---|---|---|
| Framework | React | 19.x |
| Bundler | Create React App (CRA) + CRACO | — |
| Routing | React Router | 7.x |
| Styles | Tailwind CSS | 3.x |
| UI Components | shadcn/ui + Radix | — |
| Icons | Lucide React | — |
| State | React Hooks (local) | — |
| HTTP | fetch + helpers | — |
| Tests | Jest + React Testing Library | — |
| Notifications Toast | shadcn/ui Toaster | — |

### DevOps / Infra

| Composant | Technologie |
|---|---|
| OS recommandé | Ubuntu 24.04 LTS |
| Reverse proxy | Nginx |
| HTTPS | Let's Encrypt (Certbot) |
| Process manager | Supervisor |
| Firewall | UFW |
| Brute force | Fail2ban |
| Logs | /var/log/bestshop/ |
| Backups | MongoDB dumps + rclone (optionnel) |

### Structure du code

```
/app
├── backend/
│   ├── server.py                 # Entrée FastAPI + middleware sécurité
│   ├── auth_deps.py              # require_admin / require_user / CSRF
│   ├── auth_email.py             # Envoi emails transactionnels
│   ├── email_verification.py     # Tokens de vérification
│   ├── notification_service.py   # Telegram / WhatsApp / in-app
│   ├── rate_limit.py             # Configuration rate limiter
│   ├── routes/
│   │   ├── auth.py               # Google OAuth
│   │   ├── users.py              # Auth + profile + admins
│   │   ├── products.py
│   │   ├── categories.py
│   │   ├── orders.py
│   │   ├── returns.py
│   │   ├── promotions.py
│   │   ├── coupons.py
│   │   ├── attributes.py
│   │   ├── customers.py
│   │   ├── newsletter.py
│   │   ├── notifications.py
│   │   ├── pages.py
│   │   ├── payment.py
│   │   ├── settings.py
│   │   └── ... (15+ modules)
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.js                # Routes
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── AdminLayout.jsx   # Layout admin avec drawer mobile
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── ui/ (shadcn)
│   │   │   └── admin/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminProducts.jsx
│   │   │       ├── AdminOrders.jsx
│   │   │       ├── AdminUsers.jsx
│   │   │       ├── AdminCustomers.jsx
│   │   │       ├── AdminNewsletter.jsx
│   │   │       ├── StyleCustomization.jsx
│   │   │       └── ... (19 pages)
│   │   ├── hooks/                # useCanWrite, usePaymentSettings, etc.
│   │   ├── services/api.js       # Client HTTP centralisé
│   │   └── mock/mockData.js      # Fallback/seed data
│   ├── package.json
│   └── .env
│
├── dossier_technique/            # Ce dossier
└── memory/
    └── PRD.md                    # Historique des décisions produit
```

### Variables d'environnement critiques

**Backend `.env`** :
```
MONGO_URL, DB_NAME          # MongoDB
JWT_SECRET                  # 48+ chars aléatoires
COOKIE_SECURE=true          # HTTPS obligatoire
CORS_ORIGINS                # Domaines whitelisted
FRONTEND_URL                # Pour les liens email
GOOGLE_CLIENT_ID/SECRET     # OAuth Google
GOOGLE_REDIRECT_URI
RESEND_API_KEY              # Emails transactionnels
SENDER_EMAIL                # Expéditeur par défaut
SITE_NAME
```

**Frontend `.env`** :
```
REACT_APP_BACKEND_URL       # URL backend (HTTPS en prod)
```

### API Endpoints (aperçu)

| Route | Méthodes | Auth requise |
|---|---|---|
| `/api/users/login` | POST | Public |
| `/api/users/register` | POST | Public |
| `/api/users/forgot-password` | POST | Public (rate limited) |
| `/api/users/me` | GET | User |
| `/api/users/2fa/*` | POST/PUT | User |
| `/api/products/*` | GET | Public |
| `/api/products/*` | POST/PUT/DELETE | Admin |
| `/api/orders/` | POST | Public (checkout) |
| `/api/orders/*` | GET/PUT | Admin |
| `/api/categories/*` | GET | Public |
| `/api/categories/*` | POST/PUT/DELETE | Admin |
| `/api/promotions/*` | GET | Public |
| `/api/promotions/*` | POST/PUT/DELETE | Admin |
| `/api/attributes/*` | GET | Public |
| `/api/attributes/*` | PUT | Admin |
| `/api/customers/*` | GET/PUT | Admin |
| `/api/newsletter/config` | GET/PUT | Admin |
| `/api/newsletter/send` | POST | Admin |
| `/api/notifications/*` | GET/PUT/DELETE | Admin |
| `/api/settings/admins/*` | GET/POST/PUT | Admin |
| `/api/settings/site` | GET | Public |
| `/api/settings/texts` | GET/PUT | Public/Admin |
| `/api/auth/google/callback` | POST | Public |

Total : **100+ endpoints** documentés automatiquement via **FastAPI Swagger** à `/docs`.

---

## 🇬🇧 ENGLISH

Identical content — see French section for the full breakdown. Summary:

- **Backend**: Python 3.11 / FastAPI 0.136 / MongoDB 7 / Pydantic v2 / JWT + bcrypt
- **Frontend**: React 19 / Tailwind CSS / shadcn-ui / Radix / Lucide icons
- **Infra**: Ubuntu 24 / Nginx / Supervisor / Let's Encrypt / UFW / Fail2ban
- **API**: REST + FastAPI auto-docs at `/docs`
- **Email**: Resend
- **Payments**: Stripe + PayPal
- **Notifications**: In-app + Telegram + WhatsApp (CallMeBot)
- **Auth**: JWT + Google OAuth + TOTP 2FA
