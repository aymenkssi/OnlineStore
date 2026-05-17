# 3. Interface Admin / Admin Dashboard

## 🇫🇷 FRANÇAIS — 19 sections d'administration

### 3.1 Dashboard (Tableau de bord)
Vue synthétique en temps réel :
- Chiffre d'affaires du jour / semaine / mois
- Nombre de commandes en attente
- Produits en rupture / stock faible
- Top produits vendus
- Graphiques interactifs

![Dashboard](./screenshots/20_admin_dashboard.png)

### 3.2 Commandes
- Liste paginée avec filtres (statut, date, client)
- Détail de commande : items, total, adresse, paiement
- Changement de statut (en traitement → expédié → livré)
- Génération de facture PDF
- Envoi automatique d'emails à chaque changement

![Orders](./screenshots/21_admin_orders.png)

### 3.3 Produits
- CRUD complet (créer, modifier, dupliquer, supprimer)
- Upload images multiples (base64 ou URL)
- Variantes par taille/couleur avec stock individuel
- Prix normal + prix promo
- SEO : titre, meta description, slug

![Products](./screenshots/22_admin_products.png)

### 3.4 Gestion d'Inventaire
- Vue globale des stocks par produit/variante
- Alertes stock faible paramétrables
- Historique des mouvements
- Import CSV (à venir)

![Inventory](./screenshots/23_admin_inventory.png)

### 3.5 Catégories
- Arborescence (catégorie → sous-catégorie)
- Image et ordre d'affichage
- Activation/désactivation

![Categories](./screenshots/24_admin_categories.png)

### 3.6 Attributs
- Couleurs (nom + code HEX)
- Tailles
- Marques
- **Attributs personnalisés** (ex: matière, saison, genre)

![Attributes](./screenshots/25_admin_attributes.png)

### 3.7 Promotions
- Promotions par produit ou catégorie
- Dates de début/fin
- Pourcentage ou montant fixe
- Activation/désactivation

![Promotions](./screenshots/26_admin_promotions.png)

### 3.8 Coupons
- Codes promo avec règles (montant min, usages max, par client)
- Pourcentage ou fixe
- Dates de validité

![Coupons](./screenshots/27_admin_coupons.png)

### 3.9 Retours
- Liste des demandes avec motifs
- Workflow : demandé → approuvé → reçu → remboursé
- Remboursement en un clic

![Returns](./screenshots/28_admin_returns.png)

### 3.10 Statistiques de Ventes
- Graphiques période configurable
- CA par catégorie, par produit, par client
- Export CSV/PDF

![Sales Stats](./screenshots/29_admin_sales.png)

### 3.11 Clients
- Liste avec recherche
- Fiche détaillée (commandes, total dépensé, adresses)
- Blocage / déblocage
- Export données (RGPD)

![Customers](./screenshots/30_admin_customers.png)

### 3.12 Newsletter
- Configuration (expéditeur, logo, couleurs, modèles)
- **Expéditeur configurable pour mails de réinitialisation** de mot de passe
- Envoi de newsletter aux abonnés
- Liste des abonnés

![Newsletter](./screenshots/31_admin_newsletter.png)

### 3.13 Notifications Admin
- **Notifications in-app** (cloche dans le header avec badge non-lu)
- Canal **Telegram** (bot)
- Canal **WhatsApp** (CallMeBot)
- Événements paramétrables : nouvelle commande, retour, client, stock faible

![Notifications](./screenshots/32_admin_notifications.png)

### 3.14 Gestion des Pages
- Éditeur WYSIWYG pour CGV, À propos, Politique, Contact, FAQ
- Support HTML + MDX
- Versioning (à venir)

![Pages](./screenshots/33_admin_pages.png)

### 3.15 Paiement & Devise
- Configuration **Stripe** (clés API, webhook)
- Configuration **PayPal** (client ID, secret)
- **Cash on Delivery** (activable/désactivable)
- Devise par défaut (EUR / USD / TND)
- Seuil de livraison gratuite
- Frais de port

![Payment](./screenshots/34_admin_payment.png)

### 3.16 Style & Apparence
- Couleurs primaires / secondaires
- Polices de caractères
- Logo
- Layouts (header, footer, bannières)
- Mode sombre / clair

![Style](./screenshots/35_admin_style.png)

### 3.17 Administrateurs
- Création d'admins avec **permissions granulaires** (16 droits au choix)
- Niveau **lecture seule** (r) ou **écriture** (rw) par section
- Activation / désactivation / blocage
- Reset mot de passe
- Code de confirmation pour suppression sensible

![Admin Users](./screenshots/36_admin_users.png)

### 3.18 Authentification 2 Facteurs (2FA)
- **TOTP** (Google Authenticator, Authy)
- QR Code généré à l'activation
- Codes de backup (usage unique)
- Désactivation protégée par mot de passe

![2FA](./screenshots/37_admin_2fa.png)

### 3.19 Paramètres du Site
- **Tous les textes du site éditables** (CTA, titres, footer, etc.)
- Logo, favicon
- Réseaux sociaux
- Coordonnées (adresse, téléphone, email)

![Site Settings](./screenshots/38_admin_settings.png)

### 3.20 Interface Admin Mobile

![Mobile Admin](./screenshots/41_mobile_admin.png) ![Mobile Drawer](./screenshots/42_mobile_admin_drawer.png)

Menu hamburger + drawer animé, toutes les fonctionnalités admin accessibles depuis le smartphone.

---

## 🇬🇧 ENGLISH — 19 administration sections

### 3.1 Dashboard
Real-time summary view:
- Revenue (day / week / month)
- Number of pending orders
- Out-of-stock / low-stock products
- Top selling products
- Interactive charts

### 3.2 Orders
- Paginated list with filters (status, date, customer)
- Order detail: items, total, address, payment
- Status change (processing → shipped → delivered)
- PDF invoice generation
- Automatic email notifications on each status change

### 3.3 Products
- Full CRUD (create, edit, duplicate, delete)
- Multiple image upload (base64 or URL)
- Variants by size/color with individual stock
- Regular price + promo price
- SEO: title, meta description, slug

### 3.4 Inventory Management
- Global stock view per product/variant
- Configurable low-stock alerts
- Movement history
- CSV import (roadmap)

### 3.5 Categories
- Tree structure (category → subcategory)
- Image and display order
- Enable/disable

### 3.6 Attributes
- Colors (name + HEX code)
- Sizes
- Brands
- **Custom attributes** (e.g., material, season, gender)

### 3.7 Promotions
- Per-product or per-category discounts
- Start/end dates
- Percentage or fixed amount
- Enable/disable

### 3.8 Coupons
- Promo codes with rules (min amount, max uses, per customer)
- Percentage or fixed
- Validity dates

### 3.9 Returns
- Request list with reasons
- Workflow: requested → approved → received → refunded
- One-click refund

### 3.10 Sales Statistics
- Configurable period charts
- Revenue by category, product, customer
- CSV/PDF export

### 3.11 Customers
- Searchable list
- Detailed profile (orders, total spent, addresses)
- Block / unblock
- GDPR data export

### 3.12 Newsletter
- Configuration (sender, logo, colors, templates)
- **Configurable sender for password reset emails**
- Send newsletter to subscribers
- Subscribers list

### 3.13 Admin Notifications
- **In-app notifications** (bell in header with unread badge)
- **Telegram** channel (bot)
- **WhatsApp** channel (CallMeBot)
- Configurable events: new order, return, customer, low stock

### 3.14 Page Management
- WYSIWYG editor for T&C, About, Privacy, Contact, FAQ
- HTML + MDX support
- Versioning (roadmap)

### 3.15 Payment & Currency
- **Stripe** config (API keys, webhook)
- **PayPal** config (client ID, secret)
- **Cash on Delivery** (toggleable)
- Default currency (EUR / USD / TND)
- Free shipping threshold
- Shipping fees

### 3.16 Style & Appearance
- Primary / secondary colors
- Fonts
- Logo
- Layouts (header, footer, banners)
- Dark / light mode

### 3.17 Administrators
- Create admins with **granular permissions** (16 rights)
- **Read-only** (r) or **write** (rw) level per section
- Enable / disable / block
- Password reset
- Confirmation code for sensitive deletion

### 3.18 Two-Factor Authentication (2FA)
- **TOTP** (Google Authenticator, Authy)
- QR Code generated on enable
- Backup codes (one-time use)
- Password-protected disable

### 3.19 Site Settings
- **All site texts editable** (CTA, titles, footer, etc.)
- Logo, favicon
- Social networks
- Contact info (address, phone, email)

### 3.20 Mobile Admin Interface

Hamburger menu + animated drawer, all admin features accessible from smartphone — see `41_mobile_admin.png` and `42_mobile_admin_drawer.png`.
