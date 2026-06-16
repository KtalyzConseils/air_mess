# Déploiement Air Mess sur Railway

Ce guide met en ligne **l'API Laravel + PostgreSQL + le web marchand/admin** dans un seul
projet Railway. L'app livreur Expo (`apps/driver-app`) ne va pas sur Railway (build EAS), on la
pointe juste vers l'API de prod (§7).

```
Projet Railway "air-mess"
├── Postgres                                  → fournit DATABASE_URL
├── Service "api"   (root: apps/air_mess_api) → Dockerfile + Volume sur /var/www/html/storage
└── Service "web"   (root: apps/marchant-web) → Dockerfile (Vite build → Caddy)
```

Les fichiers de déploiement sont déjà dans le repo : `Dockerfile`, `.dockerignore`,
`railway.json` (API) et `Dockerfile`, `Caddyfile`, `.dockerignore` (web).

---

## 1. Prérequis

- Le code est poussé sur GitHub (`origin/main`).
- Un compte Railway connecté à ce dépôt GitHub.
- Un fournisseur e-mail (Brevo ou Resend) avec ses identifiants SMTP / clé API.
- Les clés Fedapay **live** + le secret du webhook.

## 2. Créer le projet et la base

1. Railway → **New Project** → **Deploy from GitHub repo** → choisir ce dépôt.
2. Dans le projet, **+ New** → **Database** → **PostgreSQL**.

## 3. Service API (`apps/air_mess_api`)

1. **+ New** → **GitHub Repo** (le même) → ce sera le service **api**.
2. Service **api** → **Settings** :
   - **Root Directory** : `apps/air_mess_api`
   - **Build** : Dockerfile (auto-détecté via `railway.json`).
   - **Networking** → **Generate Domain**, et régler le **target port à `8080`**
     (port servi par l'image serversideup).
3. **Settings → Volumes** → **+ Volume**, point de montage :
   `/var/www/html/storage`  ← rend persistants les documents livreurs + logs.
4. **Variables** du service api :

   | Clé | Valeur |
   |---|---|
   | `APP_NAME` | `Air Mess` |
   | `APP_ENV` | `production` |
   | `APP_DEBUG` | `false` |
   | `APP_KEY` | *(voir étape 5)* |
   | `APP_URL` | `https://<domaine-api>` *(après Generate Domain)* |
   | `FRONTEND_URL` | `https://<domaine-web>` *(rempli à l'étape 6, sans slash final)* |
   | `CORS_ALLOWED_ORIGINS` | `https://<domaine-web>` *(rempli à l'étape 6)* |
   | `DB_CONNECTION` | `pgsql` |
   | `DB_URL` | `${{Postgres.DATABASE_URL}}` *(référence Railway)* |
   | `SESSION_DRIVER` | `database` |
   | `CACHE_STORE` | `database` |
   | `QUEUE_CONNECTION` | `database` |
   | `FILESYSTEM_DISK` | `local` |
   | `LOG_CHANNEL` | `stack` |
   | `MAIL_MAILER` | `smtp` *(ou `resend`)* |
   | `MAIL_HOST` `MAIL_PORT` `MAIL_USERNAME` `MAIL_PASSWORD` `MAIL_SCHEME` | infos Brevo *(ou `RESEND_API_KEY` si driver resend)* |
   | `MAIL_FROM_ADDRESS` | `no-reply@<ton-domaine>` |
   | `MAIL_FROM_NAME` | `Air Mess` |
   | `FEDAPAY_ENV` | `live` |
   | `FEDAPAY_PUBLIC_KEY` `FEDAPAY_SECRET_KEY` `FEDAPAY_WEBHOOK_SECRET` | clés Fedapay |
   | `FEDAPAY_CURRENCY` | `XOF` |

5. **Générer `APP_KEY`** : en local dans `apps/air_mess_api`, lancer
   `php artisan key:generate --show` et coller la valeur (`base64:...`) dans la variable `APP_KEY`.
6. Laisser Railway déployer. La **pre-deploy command** (`php artisan migrate --force`, définie
   dans `railway.json`) crée le schéma. Le healthcheck `/up` doit passer au vert.

> ⚠️ `DB_URL` : Railway fournit `DATABASE_URL`. Laravel lit `DB_URL` (cf. `config/database.php`).
> On mappe donc `DB_URL = ${{Postgres.DATABASE_URL}}`. Ne pas remplir les `DB_HOST/PORT/...` :
> l'URL suffit.

## 4. Service Web (`apps/marchant-web`)

1. **+ New** → **GitHub Repo** (le même) → service **web**.
2. **Settings** :
   - **Root Directory** : `apps/marchant-web`
   - Build : Dockerfile (auto-détecté).
   - **Generate Domain** (Caddy écoute sur `$PORT`, target port auto).
3. **Variables** du service web :

   | Clé | Valeur |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<domaine-api>/api` |

   > `VITE_API_BASE_URL` est **figée au build**. Si on change le domaine API plus tard, il faut
   > **re-déclencher un build** du web (Redeploy).
4. Déployer → récupérer le **domaine web**.

## 5. Boucler la configuration croisée

De retour sur le service **api**, renseigner avec le domaine web obtenu :
- `FRONTEND_URL = https://<domaine-web>`
- `CORS_ALLOWED_ORIGINS = https://<domaine-web>`

Puis **Redeploy** l'API.

## 6. Données de référence (une fois)

⚠️ **NE PAS lancer `php artisan db:seed`** : le `DatabaseSeeder` crée des données de DÉMO
(faux marchands/livreurs + un super-admin factory) et n'inclut pas les plans/réglages.

Ouvrir un shell sur le service api (`railway run` ou l'onglet shell) et lancer **uniquement**
les seeders de référence (idempotents, basés sur `updateOrCreate`) :

```bash
php artisan db:seed --class=PackageCategorySeeder --force
php artisan db:seed --class=SubscriptionPlanSeeder --force
php artisan db:seed --class=AppSettingSeeder --force
```

Puis créer **le vrai super-admin** (mot de passe choisi) via tinker :

```bash
php artisan tinker
>>> $u = \App\Models\User::create(['name'=>'Admin','email'=>'admin@airmess.bj','phone'=>'97000000','password'=>bcrypt('CHANGE_MOI'),'type'=>'admin','is_active'=>true]);
>>> \App\Models\Admin::create(['user_id'=>$u->id,'first_name'=>'Admin','last_name'=>'Air Mess','sub_role'=>'super']);
```

## 7. Fedapay & app livreur

- **Webhook Fedapay** : pointer vers `https://<domaine-api>/api/webhooks/fedapay`.
- **App livreur** (`apps/driver-app`) : mettre `EXPO_PUBLIC_API_BASE_URL=https://<domaine-api>/api`
  puis builder via **EAS Build**. ⚠️ Le sous-module a des modifs non commitées — committer/pousser
  avant de builder.

---

## Vérification de bout en bout

- [ ] `GET https://<domaine-api>/up` → `200`.
- [ ] Web de prod s'ouvre, page login OK, **aucune erreur CORS** en console.
- [ ] Inscription marchand + inscription livreur (upload CNI/permis) → OK.
- [ ] **Redéployer l'API**, puis ré-ouvrir le document livreur via l'admin
      (`/admin/drivers/{id}/document/{type}`) → toujours présent ⇒ le **Volume persiste**. ✅
- [ ] Login super-admin → valider marchand/livreur, créer une course, ouvrir le lien public
      `/tracking/{token}` en **https**.
- [ ] « Mot de passe oublié » → e-mail réellement reçu, lien vers `<web>/reset-password`.
- [ ] App livreur (build EAS) pointée sur l'API prod → login + réception d'une course proposée.

## Points d'attention

- `APP_DEBUG=false` impératif (sinon fuite d'infos sensibles).
- Activer les **backups** du Postgres Railway (données clients/courses).
- Coût : Postgres + 2 services + volume → prévoir le plan payant au-delà du crédit gratuit.
- Pas de Redis (choix assumé pour le MVP) : sessions/cache/queue sur Postgres.
