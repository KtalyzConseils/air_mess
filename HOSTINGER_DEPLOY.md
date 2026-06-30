# Déploiement RMess sur Hostinger (VPS KVM2 + Coolify)

Prod auto-hébergée sur le VPS Hostinger via **Coolify** (PaaS type Railway). On **réutilise
les Dockerfiles existants** (`apps/air_mess_api/Dockerfile`, `apps/marchant-web/Dockerfile`).
Railway reste en parallèle comme staging.

Remplace partout `TONDOMAINE` par ton vrai domaine.

## Architecture cible

```
VPS Ubuntu (Hostinger KVM2)
└── Coolify (Docker + reverse-proxy Traefik + SSL Let's Encrypt auto)
    ├── PostgreSQL                          (base de données)
    ├── App "api"  → https://api.TONDOMAINE   (Dockerfile, base dir apps/air_mess_api, port 8080)
    │   └── volume persistant sur /var/www/html/storage/app
    └── App "web"  → https://app.TONDOMAINE   (Dockerfile, base dir apps/marchant-web, port 80)
```

Dashboard Coolify : `https://coolify.TONDOMAINE` (ou `http://IP_DU_VPS:8000`).

---

## Étape 1 — Installer Coolify sur le VPS

En SSH (root) sur le VPS :
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```
Ça installe Docker + Coolify (~3-5 min). À la fin, ouvre `http://IP_DU_VPS:8000` et crée le
**compte admin** Coolify (premier utilisateur = propriétaire).

## Étape 2 — DNS (chez le registrar du domaine)

Crée 3 enregistrements **A** pointant vers l'**IP du VPS** :

| Type | Nom | Valeur |
|---|---|---|
| A | `coolify` | IP_DU_VPS |
| A | `api` | IP_DU_VPS |
| A | `app` | IP_DU_VPS |

(propagation : quelques minutes à 1 h.)

## Étape 3 — Connecter Coolify à GitHub

Coolify → **Sources** → connecter GitHub (App ou token) → accès au dépôt `KtalyzConseils/air_mess`.
Puis créer un **Projet** « rmess » avec un environnement « production ».

## Étape 4 — PostgreSQL

Projet → **+ New Resource** → **PostgreSQL**. Coolify génère user/password/db et une URL interne
(`postgres://...@<nom-service>:5432/...`). Noter ces infos pour le service api.

## Étape 5 — App « api »

**+ New Resource → Application → depuis le repo GitHub.**
- **Base Directory** : `/apps/air_mess_api`
- **Build Pack** : Dockerfile
- **Port exposé** : `8080`
- **Domaine** : `https://api.TONDOMAINE` (Coolify provisionne le SSL automatiquement)
- **Storage persistant** : ajouter un volume monté sur `/var/www/html/storage/app`
  (le script `docker/50-storage-permissions.sh` règle déjà les permissions au boot)
- **Variables d'environnement** (cf. tableau plus bas)
- **Pre-deploy / commande** : `php artisan migrate --force` (ou lancer à la main via le terminal Coolify)

## Étape 6 — App « web »

**+ New Resource → Application → même repo.**
- **Base Directory** : `/apps/marchant-web`
- **Build Pack** : Dockerfile
- **Port exposé** : `80`
- **Domaine** : `https://app.TONDOMAINE`
- **Variable de BUILD** (cochée « disponible au build ») :
  `VITE_API_BASE_URL=https://api.TONDOMAINE/api`

## Variables d'env du service api

| Clé | Valeur |
|---|---|
| `APP_NAME` | RMess |
| `APP_ENV` | production |
| `APP_KEY` | `php artisan key:generate --show` |
| `APP_DEBUG` | false |
| `APP_URL` | https://api.TONDOMAINE |
| `FRONTEND_URL` | https://app.TONDOMAINE |
| `CORS_ALLOWED_ORIGINS` | https://app.TONDOMAINE |
| `DB_CONNECTION` | pgsql |
| `DB_HOST` | nom du service Postgres Coolify (réseau interne) |
| `DB_PORT` | 5432 |
| `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | infos Postgres Coolify |
| `SESSION_DRIVER` / `CACHE_STORE` | database |
| `QUEUE_CONNECTION` | sync *(pas de worker → mails envoyés en synchrone)* |
| `FILESYSTEM_DISK` | local |
| `MAIL_MAILER` | brevo *(ou smtp — non bloqué sur VPS)* |
| `BREVO_API_KEY` | clé `xkeysib-` |
| `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` | expéditeur vérifié / RMess |
| `FEDAPAY_*` | clés Fedapay |

## Étape 7 — Données de référence + super-admin

Via le **terminal** de l'app api dans Coolify :
```bash
php artisan db:seed --class=PackageCategorySeeder --force
php artisan db:seed --class=SubscriptionPlanSeeder --force
php artisan db:seed --class=AppSettingSeeder --force
php artisan airmess:make-admin
```

## Étape 8 — Brancher le reste

- Webhook Fedapay → `https://api.TONDOMAINE/api/webhooks/fedapay`
- App livreur : `eas.json` → `EXPO_PUBLIC_API_BASE_URL=https://api.TONDOMAINE/api` (rebuild EAS)

## Vérification

- `https://api.TONDOMAINE/up` → 200 (et cadenas SSL valide).
- `https://app.TONDOMAINE` → login, pas d'erreur CORS.
- Inscription marchand + livreur (upload docs) → OK, persiste après redéploiement (volume).
- Mot de passe oublié → e-mail reçu.

## Notes

- `trustProxies(at: '*')` déjà en place → HTTPS correct derrière Traefik.
- `railway.json` est ignoré par Coolify (sans effet, pas de conflit avec le staging Railway).
- Sécurité VPS recommandée plus tard : `ufw` (ouvrir 22/80/443), fail2ban, user non-root.
