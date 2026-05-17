# 4. Sécurité / Security 🛡️

## 🇫🇷 FRANÇAIS

Best Shop a été conçu avec la sécurité comme priorité absolue. Score sécurité obtenu après audit complet : **9 / 10**.

### 4.1 Authentification & Mots de passe

| Mesure | Implémentation |
|---|---|
| **Hashing** | `bcrypt` avec coût 12 (résistant aux attaques par force brute / rainbow tables) |
| **JWT** | Secret 46+ caractères, expiration 7 jours |
| **Cookie httpOnly** | Session sécurisée, inaccessible en JavaScript (protection XSS) |
| **Cookie secure** | Envoyé uniquement en HTTPS |
| **SameSite=Lax** | Protection contre attaques CSRF cross-site |
| **2FA TOTP** | Google Authenticator / Authy + codes de backup à usage unique |
| **Google OAuth** | Alternative sécurisée à la gestion de mots de passe |
| **Vérification email** | Obligatoire à l'inscription |

### 4.2 Protection des endpoints API

- **95% des endpoints sensibles** protégés par `require_admin` ou `require_user`
- **Double-submit CSRF** sur toutes les mutations via cookie auth
- **JWT Bearer** pour les clients API externes
- **Rate Limiting** sur endpoints sensibles :
  - Login : 5 tentatives/minute
  - Forgot password : 3/minute
  - Register : 10/minute

### 4.3 CORS & Cross-Origin

```
CORS_ORIGINS = "https://votre-domaine.com"
allow_methods = [GET, POST, PUT, DELETE, PATCH, OPTIONS]
allow_headers = [Authorization, Content-Type, X-CSRF-Token, X-Requested-With]
allow_credentials = true
```

Aucun wildcard `*`. Rejette toute origine non whitelistée avec HTTP 400.

### 4.4 Headers de sécurité HTTP

Appliqués sur **toutes les réponses** via `SecurityHeadersMiddleware`:

| Header | Valeur | Objectif |
|---|---|---|
| `Content-Security-Policy` | Policy stricte avec whitelist CDN | Anti-XSS defense-in-depth |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Anti-clickjacking |
| `X-Content-Type-Options` | `nosniff` | Anti MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protection vie privée |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Restriction APIs navigateur |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolation cross-origin |
| `Cross-Origin-Resource-Policy` | `same-site` | Isolation ressources |

### 4.5 Protection XSS

- **DOMPurify** pour tout HTML éditable admin (Pages, Newsletter)
- **React** échappe nativement les chaînes `{variable}`
- **CSP** bloque l'exécution de scripts externes non-whitelistés
- Aucun usage d'`eval()`, `new Function()`, `document.write()`

### 4.6 Protection MongoDB / NoSQL Injection

- Requêtes **paramétrées** uniquement (pas de concaténation de chaînes)
- Pydantic **valide tous les payloads** avant insertion DB
- Champ `_id` exclu des responses API
- Aucun `$where` dynamique

### 4.7 Gestion des mots de passe

- **Jamais stockés en clair** (bcrypt hash uniquement)
- Réinitialisation via lien magique email (valide 1h, à usage unique)
- Politique de complexité configurable
- Changement de mot de passe forcé pour admin par défaut

### 4.8 Notifications & Logs

- Tentatives de connexion loggées (IP, user-agent, timestamp)
- Brute force détecté automatiquement → ban temporaire
- Notifications admin sur événements critiques (nouvelle commande, retour, etc.)

### 4.9 Dépendances

- **Audit automatique** via `pip-audit` (CI recommandé)
- Versions récentes et patchées pour toutes les dépendances critiques :
  - `fastapi 0.136`, `starlette 1.0`, `aiohttp 3.13.5`
  - `cryptography 46.0.7`, `pymongo 4.16`, `pillow 12.2`
  - `bcrypt`, `pyjwt`, `resend`
- Frontend : `react-scripts` (CVE build-only, jamais en production)

### 4.10 Conformité & RGPD

- Export données utilisateur (JSON) sur demande
- Droit à l'oubli (suppression compte)
- Cookies uniquement essentiels par défaut
- Politique de confidentialité configurable depuis l'admin

### 4.11 Recommandations de déploiement

1. **HTTPS obligatoire** (Let's Encrypt via Certbot)
2. `COOKIE_SECURE=true` en production (déjà par défaut)
3. Firewall UFW : uniquement ports 80/443 ouverts
4. `fail2ban` pour SSH + brute force
5. Backups MongoDB chiffrés automatiques (rclone + cron)
6. Rotation du `JWT_SECRET` tous les 90 jours
7. Monitoring des logs `/var/log/supervisor/*.log`

---

## 🇬🇧 ENGLISH

Best Shop was designed with security as top priority. Security score after full audit: **9 / 10**.

### 4.1 Authentication & Passwords

| Measure | Implementation |
|---|---|
| **Hashing** | `bcrypt` cost 12 (resistant to brute force / rainbow tables) |
| **JWT** | 46+ character secret, 7-day expiration |
| **httpOnly cookie** | Secure session, inaccessible from JavaScript (XSS protection) |
| **Secure cookie** | Sent only over HTTPS |
| **SameSite=Lax** | CSRF cross-site protection |
| **TOTP 2FA** | Google Authenticator / Authy + one-time backup codes |
| **Google OAuth** | Secure alternative to password management |
| **Email verification** | Mandatory on registration |

### 4.2 API Endpoint Protection

- **95% of sensitive endpoints** protected by `require_admin` or `require_user`
- **Double-submit CSRF** on all cookie-auth mutations
- **JWT Bearer** for external API clients
- **Rate Limiting** on sensitive endpoints:
  - Login: 5 attempts/minute
  - Forgot password: 3/minute
  - Register: 10/minute

### 4.3 CORS & Cross-Origin

Strict whitelist, no wildcard. Rejects any non-whitelisted origin with HTTP 400.

### 4.4 HTTP Security Headers

Applied on **all responses** via `SecurityHeadersMiddleware`:

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | Strict policy with CDN whitelist | Anti-XSS defense-in-depth |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Anti-clickjacking |
| `X-Content-Type-Options` | `nosniff` | Anti MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Privacy protection |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Browser API restriction |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cross-origin isolation |
| `Cross-Origin-Resource-Policy` | `same-site` | Resource isolation |

### 4.5 XSS Protection

- **DOMPurify** for any admin-editable HTML (Pages, Newsletter)
- **React** natively escapes `{variable}` strings
- **CSP** blocks execution of non-whitelisted external scripts
- No use of `eval()`, `new Function()`, `document.write()`

### 4.6 MongoDB / NoSQL Injection Protection

- **Parameterized** queries only (no string concatenation)
- Pydantic **validates all payloads** before DB insertion
- `_id` field excluded from API responses
- No dynamic `$where` operators

### 4.7 Password Management

- **Never stored in clear** (bcrypt hash only)
- Reset via magic email link (1h validity, single-use)
- Configurable complexity policy
- Forced password change for default admin

### 4.8 Notifications & Logs

- Login attempts logged (IP, user-agent, timestamp)
- Brute force detected automatically → temporary ban
- Admin notifications on critical events (new order, return, etc.)

### 4.9 Dependencies

- **Automatic audit** via `pip-audit` (CI recommended)
- Recent, patched versions for all critical dependencies
- Frontend: `react-scripts` (build-only CVEs, never shipped to production)

### 4.10 GDPR Compliance

- User data export (JSON) on request
- Right to be forgotten (account deletion)
- Essential cookies only by default
- Configurable privacy policy from admin

### 4.11 Deployment Recommendations

1. **Mandatory HTTPS** (Let's Encrypt via Certbot)
2. `COOKIE_SECURE=true` in production (default)
3. UFW firewall: only ports 80/443 open
4. `fail2ban` for SSH + brute force
5. Encrypted MongoDB backups via cron
6. `JWT_SECRET` rotation every 90 days
7. Monitor logs at `/var/log/supervisor/*.log`
