# 🚀 Manuel de déploiement — Best Shop sur Render + MongoDB Atlas

Guide pas-à-pas pour mettre l'application en production.
**Coût total** : 0 € pour démarrer (free tiers), ~7 €/mois si vous voulez le backend toujours actif.

---

## ⏱ Vue d'ensemble (≈ 30 min)

| Étape | Service | Durée |
|---|---|---|
| 1 | MongoDB Atlas — créer le cluster | 5 min |
| 2 | Pousser le code sur GitHub | 3 min |
| 3 | Render — déployer le backend (Web Service) | 10 min |
| 4 | Render — déployer le frontend (Static Site) | 8 min |
| 5 | Vérifications & domaine custom (optionnel) | 5 min |

> ⚠️ **Avant tout** — supprimez le système de licence si vous n'en avez pas besoin tout de suite : dans `backend/.env` laissez `LICENSE_ENABLED=false`. On le réactivera une fois que le license server sera déployé séparément.

---

## 1 · MongoDB Atlas — créer la base

### 1.1 Créer un cluster gratuit (M0, 512 Mo)

1. Connectez-vous à <https://cloud.mongodb.com>.
2. **Build a Database** → choisissez **M0 Free** → région la plus proche de vos clients européens (ex : `Frankfurt eu-central-1`) → **Create**.
3. Patientez 1–3 minutes pendant la provision.

### 1.2 Créer un utilisateur DB

1. **Database Access** (menu gauche) → **Add New Database User**.
2. Authentication Method: **Password**.
3. Username : `bestshop_app` — Password : générez un mot de passe fort (cliquez "Autogenerate Secure Password" et **copiez-le tout de suite**).
4. Database User Privileges : **Read and write to any database**.
5. **Add User**.

### 1.3 Autoriser les IP

1. **Network Access** → **Add IP Address**.
2. Cliquez **Allow Access from Anywhere** (`0.0.0.0/0`).
   > Render utilise des IP dynamiques. Pour restreindre, vous pouvez plus tard utiliser une `egress address` Render (offre payante).
3. **Confirm**.

### 1.4 Récupérer la chaîne de connexion

1. **Database** → cliquez **Connect** sur votre cluster → **Drivers** → Python 3.6+.
2. Copiez la chaîne, ressemble à :
   ```
   mongodb+srv://bestshop_app:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
3. Remplacez `<password>` par votre vrai mot de passe (URL-encoded si caractères spéciaux : `@` → `%40`, etc.).
4. **Conservez cette URL** — vous l'utiliserez dans Render.

---

## 2 · Pousser le code sur GitHub

### 2.1 Créer un dépôt vide

1. <https://github.com/new> → nom `bestshop-prod` (ou autre) → **Private** recommandé → **Create**.

### 2.2 Pousser depuis votre projet

Dans Emergent, utilisez la fonctionnalité **« Save to Github »** dans la barre de chat (icône GitHub). Sinon, en local :

```bash
cd /app
git remote add origin https://github.com/<vous>/bestshop-prod.git
git add -A && git commit -m "Initial deploy"
git push -u origin main
```

> 💡 Vérifiez que `backend/.env`, `frontend/.env`, `license_server/.env`, `private_key.pem` ne sont **PAS** poussés (déjà dans `.gitignore`). Sinon ajoutez-les avant de pousser.

---

## 3 · Render — déployer le backend (Web Service)

### 3.1 Connecter GitHub à Render

1. <https://dashboard.render.com> → en haut à droite **New +** → **Web Service**.
2. **Connect a repository** → autorisez Render à lire votre repo `bestshop-prod`.

### 3.2 Configuration du service

| Champ | Valeur |
|---|---|
| **Name** | `bestshop-backend` |
| **Region** | Frankfurt (proche du cluster Atlas) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| **Plan** | **Free** (sleep après 15 min inactif) ou **Starter $7/mois** (toujours actif) |

### 3.3 Variables d'environnement

Cliquez **Advanced** → **Add Environment Variable** et remplissez (sans guillemets) :

```
MONGO_URL              = mongodb+srv://bestshop_app:VOTRE_PASS@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME                = bestshop_prod
JWT_SECRET             = (générez-en un: `openssl rand -hex 32`)
CORS_ORIGINS           = https://bestshop-frontend.onrender.com   # à mettre à jour après l'étape 4
FRONTEND_URL           = https://bestshop-frontend.onrender.com
GOOGLE_CLIENT_ID       = 19307570746-7o48ffdvlh0mla43qh6e1n500gd4tdi3.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET   = 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
GOOGLE_REDIRECT_URI    = https://bestshop-backend.onrender.com/api/auth/google/callback
RESEND_API_KEY         = re_XAvav4sw_Nye8G4egHEFMYrAHYJjusZhu
SENDER_EMAIL           = onboarding@resend.dev
SITE_NAME              = Best Shop
TOTP_ISSUER            = Best Shop
COOKIE_SECURE          = true
REQUIRE_EMAIL_VERIFICATION = false
FORCE_ADMIN_PASSWORD_CHANGE = true
ACCOUNT_LOCKOUT_THRESHOLD = 5
ACCOUNT_LOCKOUT_MINUTES   = 15
STRIPE_API_KEY         = sk_test_xxxxx                  # votre vraie clé Stripe (test ou live)
LICENSE_ENABLED        = false                          # mettre true plus tard quand license server prêt
PYTHON_VERSION         = 3.11.10
```

> 🔐 **`FORCE_ADMIN_PASSWORD_CHANGE=true`** force l'admin à changer le mot de passe par défaut au premier login. **Indispensable en prod**.

### 3.4 Lancer le déploiement

1. **Create Web Service** → Render commence le build (~5 min).
2. Surveillez les logs. Vous devez voir :
   ```
   INFO:     Application startup complete.
   INFO:     Uvicorn running on http://0.0.0.0:10000
   ```
3. Notez l'URL fournie : `https://bestshop-backend.onrender.com` (variable selon le nom).
4. Test : `https://bestshop-backend.onrender.com/api/` → doit renvoyer `{"message":"Hello World"}`.

### 3.5 Mettre à jour Google OAuth

⚠️ Le `GOOGLE_REDIRECT_URI` doit être autorisé dans la console Google Cloud :

1. <https://console.cloud.google.com/apis/credentials>
2. Cliquez sur votre OAuth Client ID.
3. **Authorized redirect URIs** → ajoutez :
   `https://bestshop-backend.onrender.com/api/auth/google/callback`
4. **Save**.

---

## 4 · Render — déployer le frontend (Static Site)

### 4.1 Créer le service

1. Render dashboard → **New +** → **Static Site**.
2. Sélectionnez le même repo.

| Champ | Valeur |
|---|---|
| **Name** | `bestshop-frontend` |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `yarn install && yarn build` |
| **Publish Directory** | `build` |

### 4.2 Variables d'environnement

```
REACT_APP_BACKEND_URL = https://bestshop-backend.onrender.com
NODE_VERSION          = 20.11.1
```

### 4.3 Configurer les redirects (SPA)

Render → onglet **Redirects/Rewrites** de votre Static Site → **Add Rule** :

| Source | Destination | Action |
|---|---|---|
| `/*` | `/index.html` | `Rewrite` |

Sans cette règle, le rafraîchissement d'une page comme `/admin/products` renverra 404.

### 4.4 Déployer

1. **Create Static Site** → build (~3–5 min).
2. URL fournie : `https://bestshop-frontend.onrender.com`.
3. Ouvrez l'URL → la boutique doit s'afficher.

### 4.5 ⚠️ Synchroniser le backend avec l'URL réelle du frontend

Si l'URL frontend diffère de ce que vous aviez prévu :

1. Retournez sur le service backend → **Environment** → mettez à jour :
   ```
   CORS_ORIGINS = https://bestshop-frontend.onrender.com
   FRONTEND_URL = https://bestshop-frontend.onrender.com
   ```
2. **Save Changes** → Render redémarrera le backend automatiquement.

---

## 5 · Vérifications finales

### 5.1 Test fonctionnel

- ✅ Page d'accueil charge la boutique
- ✅ `https://bestshop-backend.onrender.com/api/products/` renvoie la liste des produits
- ✅ Login admin : `admin@bestshop.com / admin123` → forcera le changement de mot de passe au premier login
- ✅ Tableau de bord admin → stats s'affichent
- ✅ Test envoi email (mot de passe oublié → reset via Resend)

### 5.2 Sécurité — à faire AVANT la mise en vente

| Action | Pourquoi |
|---|---|
| Changer le mot de passe admin par défaut | Évident |
| Mettre `STRIPE_API_KEY` en clé **live** (`sk_live_…`) | Sinon les paiements sont faux |
| Vérifier un domaine sur Resend + remplacer `SENDER_EMAIL` | `onboarding@resend.dev` est limité (testing) |
| `JWT_SECRET` long et aléatoire | Évite le forgeage de tokens |
| `REQUIRE_EMAIL_VERIFICATION=true` (optionnel) | Empêche les faux comptes |

### 5.3 Domaine personnalisé (optionnel — gratuit sur Render)

1. Achetez un domaine (Namecheap, OVH, Cloudflare ~10 €/an).
2. Sur Render → service frontend → **Settings** → **Custom Domain** → entrez `boutique.votredomaine.com`.
3. Render vous donne un CNAME → ajoutez-le chez votre registrar.
4. Refaites pareil pour le backend : `api.votredomaine.com`.
5. Mettez à jour les variables d'env :
   - `REACT_APP_BACKEND_URL = https://api.votredomaine.com`
   - `CORS_ORIGINS / FRONTEND_URL = https://boutique.votredomaine.com`
   - `GOOGLE_REDIRECT_URI` → ajoutez la nouvelle URL dans Google Console
6. SSL Let's Encrypt automatique (Render le gère).

---

## 6 · Limitations connues du free tier Render

| Limitation | Impact | Solution |
|---|---|---|
| Sleep après 15 min inactif | Premier appel 30 s + lent | Plan Starter **$7/mois** |
| Pas de disque persistant en free | `backend/uploads/` perdus à chaque redéploiement | Migrer les uploads sur Cloudinary / S3 / utiliser le plan payant |
| 750 h gratuites/mois | Suffisant pour 1 service 24/24 | Surveiller les heures dans dashboard |
| Build limité à 15 min | Le projet build en ~3 min, OK | — |

> 💡 **Pour les uploads** : ajoutez Cloudinary (free 25 Go) — je peux l'intégrer si vous voulez.

---

## 7 · Mise à jour future de l'application

Render auto-déploie à chaque `git push origin main` :

```bash
# en local
git add -A && git commit -m "feat: nouvelle fonctionnalité"
git push origin main
```

Render détecte et redéploie automatiquement (backend + frontend).

Pour un **rollback**, allez dans Render → service → **Manual Deploy** → choisissez un commit précédent.

---

## 8 · Dépannage rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| `502 Bad Gateway` au lancement | Backend n'a pas démarré | Vérifiez les logs Render → souvent `MONGO_URL` mal formaté |
| `CORS error` dans le navigateur | `CORS_ORIGINS` ne correspond pas à l'URL frontend | Mettre la valeur exacte (https://, sans / final) |
| Login Google → erreur `redirect_uri_mismatch` | URL pas dans Google Console | Ajouter `…/api/auth/google/callback` dans les Authorized URIs |
| Frontend affiche du blanc | `REACT_APP_BACKEND_URL` mal configuré | Vérifier la variable + rebuild (déclenchez un nouveau deploy) |
| 404 sur les routes admin (`/admin/products`) | Règle de rewrite SPA manquante | Étape 4.3 |
| Emails non reçus | Domaine Resend non vérifié OU email arrivé en spam | Console Resend → Domains → Add domain |
| Backend lent au premier appel | Sleep du free tier | Passez en Starter ou utilisez UptimeRobot pour ping toutes les 14 min |

---

## 9 · Checklist finale avant de vendre

- [ ] Backend déployé, endpoint `/api/` répond 200
- [ ] Frontend déployé, page d'accueil s'affiche
- [ ] Login admin fonctionne, mot de passe par défaut changé
- [ ] Stripe en mode **live** + webhook configuré (si paiement actif)
- [ ] Resend : domaine vérifié, `SENDER_EMAIL` mis à jour
- [ ] Google OAuth : URL de redirection prod ajoutée
- [ ] Domaine custom + HTTPS actif
- [ ] (Optionnel) License server déployé et `LICENSE_ENABLED=true` côté client
- [ ] Backup MongoDB Atlas activé (Atlas → cluster → Backup → Continuous Cloud Backup gratuit sur M0)

---

✨ **Vous êtes en production !**
Pour toute question, consultez `LICENSE_SYSTEM.md` (système de licences) ou ouvrez un ticket dans votre repo.
