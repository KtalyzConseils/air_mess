# Secrets & configurations sensibles

Ce document liste **tous les fichiers/valeurs sensibles** du monorepo, où
les récupérer, et la procédure à suivre en cas de fuite publique.

**Règle absolue** : rien de ce qui est listé ci-dessous ne doit apparaître
dans un commit. Tous les fichiers sensibles sont gitignorés — leurs
templates (`.env.example`, `google-services.json.example`) sont versionnés
avec des placeholders.

---

## Inventaire

### `apps/air_mess_api/.env` (backend Laravel)

Contient les **vrais secrets serveur** :

| Variable | Rôle | Rotation en cas de fuite |
|---|---|---|
| `APP_KEY` | Chiffrement Laravel (sessions, cookies, encrypted casts) | `php artisan key:generate` |
| `DB_PASSWORD` | Mot de passe Postgres | Changer le pass dans le SGBD + mettre à jour Railway |
| `MAIL_PASSWORD` | Clé SMTP Brevo | Régénérer dans Brevo dashboard → SMTP & API |
| `FEDAPAY_SECRET_KEY` | Signature des requêtes Fedapay | Fedapay dashboard → API Keys → Revoke + Regenerate |
| `FEDAPAY_WEBHOOK_SECRET` | Vérification des webhooks Fedapay | Fedapay dashboard → Webhooks → Regenerate |

**Où** : `apps/air_mess_api/.env` (jamais commité). Template : `.env.example`.
**Prod** : Railway → service `air_mess_api` → Variables.

### `apps/marchant-web/.env` (SPA React)

| Variable | Rôle | Rotation |
|---|---|---|
| `VITE_API_BASE_URL` | URL de l'API | pas un secret |
| `VITE_FIREBASE_*` (6 vars) | Config Firebase Web (Phone Auth + Google Sign-In) | Firebase Console → Project settings → Web app config |

**Où** : `apps/marchant-web/.env` (jamais commité). Template : `.env.example`.
**Prod** : Railway → service `marchant-web` → Variables.

Note : `VITE_FIREBASE_API_KEY` n'est **pas un secret technique** (Firebase
la restreint via Authorized domains + App Check). Mais on la sort du code
pour taire les scanners GitHub et pouvoir en changer sans re-deployer.

### `apps/driver-app/.env` (Expo)

| Variable | Rôle | Rotation |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | URL de l'API vue depuis l'émulateur/device | pas un secret |

**Où** : `apps/driver-app/.env` (jamais commité). Template : `.env.example`.
**Prod** : la valeur est bakée au build EAS via `eas.json` (profil production).

### `apps/driver-app/google-services.json` (Firebase Android)

Fichier natif Firebase Android — contient `project_id`, `mobilesdk_app_id`
et l'`api_key` Android. Comme la web, l'apiKey Android est "publique par
design" (la sécurité vient des restrictions Google Cloud + App Check),
mais on la sort du code pour éviter les alertes GitHub secret-scanner.

**Où** : `apps/driver-app/google-services.json` (jamais commité).
Template : `google-services.json.example`.

**Pour dev** : Firebase Console → Project → Add app → Android →
Download `google-services.json` → dépose-le dans `apps/driver-app/`.

**Pour prod (EAS build)** : deux options :

1. **Recommandé** — via EAS Secrets (Node file secret) :
   ```bash
   eas secret:create --scope project --name GOOGLE_SERVICES_JSON \
     --type file --value ./apps/driver-app/google-services.json
   ```
   Puis dans `eas.json`, ajouter à chaque profil qui build Android :
   ```json
   "build": {
     "production": {
       "env": {
         "GOOGLE_SERVICES_JSON": "$GOOGLE_SERVICES_JSON"
       }
     }
   }
   ```
2. **Fallback** — déposer localement avant chaque `eas build` (le
   `.gitignore` protège du commit accidentel).

---

## Procédure "clé leakée publiquement"

Symptôme : GitHub Secret-Scanning ouvre une alerte, ou tu as pushé sur
un repo public par erreur.

1. **Rotation immédiate** de la clé (Google Cloud Console / Fedapay
   Dashboard / Brevo / Firebase Console selon le cas).
2. **Update** le `.env` local + les vars Railway/EAS avec la nouvelle valeur.
3. **Vérifier** les logs du provider pour détecter un usage frauduleux
   entre la fuite et la rotation (Fedapay : Transactions ; Google Cloud :
   API metrics).
4. **Fermer l'alerte GitHub** avec la mention `Revoked`.
5. **Nettoyer l'historique git** si nécessaire — pour un secret rotationné,
   ce n'est pas obligatoire, mais si tu veux quand même l'effacer :
   `git filter-repo` ou BFG Repo-Cleaner + force-push (destructif, à faire
   en dernier recours et après avoir prévenu l'équipe).

---

## Vérification périodique

Avant chaque push majeur, un quick check :

```bash
# Aucun fichier sensible dans le staging
git status | grep -iE "\\.env($|\\.)|google-services\\.json|\\.p12|\\.jks|\\.key$" && \
  echo "STOP — fichier sensible détecté" || echo "OK"

# Aucune clé Google API dans le diff
git diff --staged | grep -E "AIzaSy[A-Za-z0-9_-]{33}" && \
  echo "STOP — clé Google API détectée" || echo "OK"
```
