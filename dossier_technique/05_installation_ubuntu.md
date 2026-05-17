# 5. Installation VPS Ubuntu 24.04 LTS 🚀

## 🇫🇷 FRANÇAIS — Manuel d'installation complet

### 5.0 Pré-requis

- **VPS** : Ubuntu 24.04 LTS minimum (2 CPU, 4 Go RAM, 40 Go SSD recommandés)
- **Nom de domaine** pointant vers l'IP du VPS (A record)
- **Accès root** (ou utilisateur sudo)

---

### 5.1 Préparation du serveur

#### 5.1.1 Connexion SSH et mise à jour
```bash
ssh root@VOTRE_IP
apt update && apt upgrade -y
apt install -y curl wget git build-essential software-properties-common
```

#### 5.1.2 Créer un utilisateur non-root
```bash
adduser bestshop
usermod -aG sudo bestshop
rsync --archive --chown=bestshop:bestshop ~/.ssh /home/bestshop
```

#### 5.1.3 Durcir SSH
```bash
nano /etc/ssh/sshd_config
# Modifier :
#   PermitRootLogin no
#   PasswordAuthentication no
#   Port 2222  (optionnel, changer le port par défaut)
systemctl restart sshd
```

#### 5.1.4 Firewall UFW
```bash
ufw allow 2222/tcp     # SSH (si changé)
ufw allow 80/tcp       # HTTP
ufw allow 443/tcp      # HTTPS
ufw enable
```

#### 5.1.5 Protection anti-brute force
```bash
apt install -y fail2ban
systemctl enable --now fail2ban
```

---

### 5.2 Installation des dépendances

#### 5.2.1 Python 3.11 + pip
```bash
apt install -y python3.11 python3.11-venv python3-pip
```

#### 5.2.2 Node.js 20 + Yarn
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn
```

#### 5.2.3 MongoDB 7
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl enable --now mongod
```

#### 5.2.4 Supervisor + Nginx + Certbot
```bash
apt install -y supervisor nginx certbot python3-certbot-nginx
```

---

### 5.3 Déploiement de l'application

#### 5.3.1 Cloner le code
```bash
su - bestshop
cd /home/bestshop
git clone https://github.com/VOTRE_REPO/Store_site-v8.git app
cd app
```

#### 5.3.2 Configurer le backend
```bash
cd /home/bestshop/app/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Créer `/home/bestshop/app/backend/.env` :
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="bestshop_production"
CORS_ORIGINS="https://votre-domaine.com"

# Google OAuth (remplir avec vos clés)
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-votre-secret

# Resend (emails)
RESEND_API_KEY=re_votre_cle_resend
SENDER_EMAIL=noreply@votre-domaine.com

# Frontend URL (HTTPS obligatoire)
FRONTEND_URL=https://votre-domaine.com
GOOGLE_REDIRECT_URI=https://votre-domaine.com/api/auth/google/callback

# Sécurité (GÉNÉRER DES SECRETS FORTS!)
JWT_SECRET=$(openssl rand -hex 48)
COOKIE_SECURE=true
SITE_NAME=BestShop
```

**Générer un JWT_SECRET fort** :
```bash
openssl rand -hex 48
# Copier le résultat dans JWT_SECRET
```

#### 5.3.3 Configurer le frontend
```bash
cd /home/bestshop/app/frontend
yarn install
```

Créer `/home/bestshop/app/frontend/.env` :
```env
REACT_APP_BACKEND_URL=https://votre-domaine.com
```

Build de production :
```bash
yarn build
```

---

### 5.4 Configuration Supervisor

Créer `/etc/supervisor/conf.d/bestshop.conf` :
```ini
[program:bestshop-backend]
command=/home/bestshop/app/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2
directory=/home/bestshop/app/backend
user=bestshop
autostart=true
autorestart=true
startsecs=5
stopwaitsecs=10
stderr_logfile=/var/log/bestshop/backend.err.log
stdout_logfile=/var/log/bestshop/backend.out.log
environment=PATH="/home/bestshop/app/backend/venv/bin:/usr/bin"
```

```bash
mkdir -p /var/log/bestshop
chown bestshop:bestshop /var/log/bestshop
supervisorctl reread && supervisorctl update
supervisorctl start bestshop-backend
```

---

### 5.5 Configuration Nginx + HTTPS

Créer `/etc/nginx/sites-available/bestshop` :
```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    # SSL certificates (Let's Encrypt, à configurer ensuite)
    # ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    # Sécurité supplémentaire
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    client_max_body_size 25M;

    # Frontend (React build statique)
    root /home/bestshop/app/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
```

Activer et obtenir le certificat SSL :
```bash
ln -s /etc/nginx/sites-available/bestshop /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

Certbot active le renouvellement automatique via cron.

---

### 5.6 Initialisation MongoDB

```bash
mongosh
# Dans le shell mongo :
use bestshop_production
db.createUser({
  user: "bestshop_user",
  pwd: "mot_de_passe_fort",
  roles: [{ role: "readWrite", db: "bestshop_production" }]
})
exit
```

Activer l'auth MongoDB :
```bash
nano /etc/mongod.conf
# security:
#   authorization: enabled
systemctl restart mongod
```

Mettre à jour `MONGO_URL` dans `.env` :
```env
MONGO_URL="mongodb://bestshop_user:mot_de_passe_fort@localhost:27017/bestshop_production"
```

Redémarrer le backend :
```bash
supervisorctl restart bestshop-backend
```

---

### 5.7 Premier lancement

1. Visiter `https://votre-domaine.com`
2. Admin par défaut créé automatiquement :
   - **Email** : `admin@bestshop.com`
   - **Password** : `admin123`
3. **IMPORTANT** : se connecter et changer immédiatement ce mot de passe !
4. Créer les catégories, produits, promotions via l'admin

---

### 5.8 Sauvegardes automatiques

Script de backup `/home/bestshop/scripts/backup.sh` :
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/bestshop/backups"
mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://bestshop_user:mot_de_passe_fort@localhost:27017/bestshop_production" \
          --out=$BACKUP_DIR/$DATE
# Nettoyage : garder 14 jours
find $BACKUP_DIR -type d -mtime +14 -exec rm -rf {} +
# Optionnel : upload S3/rclone
```

```bash
chmod +x /home/bestshop/scripts/backup.sh
crontab -e
# Ajouter :
# 0 3 * * * /home/bestshop/scripts/backup.sh >> /var/log/bestshop/backup.log 2>&1
```

---

### 5.9 Monitoring

```bash
# Logs backend
tail -f /var/log/bestshop/backend.out.log

# Status des services
supervisorctl status
systemctl status nginx mongod

# Usage CPU/RAM
htop
```

---

## 🇬🇧 ENGLISH — Full installation manual

### 5.0 Prerequisites

- **VPS**: Ubuntu 24.04 LTS minimum (2 CPU, 4 GB RAM, 40 GB SSD recommended)
- **Domain name** pointing to the VPS IP (A record)
- **Root access** (or sudo user)

### 5.1 - 5.9 Instructions

All instructions in the French section above are valid. Key commands summary:

```bash
# Update system + install dependencies
apt update && apt upgrade -y
apt install -y python3.11 python3.11-venv nodejs yarn mongodb-org \
               supervisor nginx certbot python3-certbot-nginx fail2ban

# Firewall
ufw allow 22,80,443/tcp && ufw enable

# Deploy backend
cd /home/bestshop/app/backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Edit .env with your secrets (MongoDB, Google, Resend, JWT_SECRET)

# Deploy frontend
cd /home/bestshop/app/frontend
yarn install && yarn build

# Start via supervisor (see bestshop.conf in French section)
supervisorctl start bestshop-backend

# HTTPS
certbot --nginx -d yourdomain.com

# Default admin: admin@bestshop.com / admin123 (CHANGE IMMEDIATELY)
```

### Post-installation checklist

- [ ] Change default admin password
- [ ] Enable MongoDB authentication
- [ ] Set `COOKIE_SECURE=true`
- [ ] Configure `JWT_SECRET` with `openssl rand -hex 48`
- [ ] Restrict `CORS_ORIGINS` to your production domain only
- [ ] Setup automated MongoDB backups (cron + rclone)
- [ ] Enable `fail2ban` + UFW
- [ ] Install Let's Encrypt SSL certificate
- [ ] Configure Stripe + PayPal API keys in admin
- [ ] Configure Resend API key for email delivery
- [ ] Test 2FA on admin account
- [ ] Configure monitoring alerts (logs, disk, RAM)

---

## 🚑 Troubleshooting / Dépannage

| Problem / Problème | Solution |
|---|---|
| Backend won't start / Backend ne démarre pas | Check `/var/log/bestshop/backend.err.log`, verify `.env` file |
| MongoDB auth failed | Verify user/password, restart `systemctl restart mongod` |
| 502 Bad Gateway | Check `supervisorctl status bestshop-backend` |
| Emails not sent / Emails non envoyés | Verify Resend API key and domain verification |
| Certbot fails | Ensure DNS A record points to VPS IP, ports 80/443 open |
| CORS errors | Verify `CORS_ORIGINS` in backend `.env` matches frontend domain |
