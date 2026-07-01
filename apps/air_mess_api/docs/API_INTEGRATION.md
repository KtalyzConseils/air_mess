# API d'intégration AirMess — Documentation développeur

Créez des courses (livraisons) AirMess automatiquement depuis votre propre
application (site e-commerce, ERP, backend…) via une API REST simple.

> **Cas d'usage type** : une commande est passée sur votre boutique → vous
> appelez AirMess en serveur-à-serveur → une course est créée et proposée aux
> livreurs disponibles autour de votre point de retrait.

> **📢 Deux façons d'obtenir une clé** :
> **(1) Mode développeur (recommandé)** — Depuis votre compte marchand OU
> particulier, activez le "mode dev", créez une **app** avec un plan API
> (Starter 15, Pro 100 ou Premium 500 requêtes/mois) et générez sa clé. Voir §12.
> **(2) Clés marchand historiques** — Un marchand avec un plan Business peut
> encore générer des clés depuis `/integration/keys`. Ces clés existent pour
> compat rétro (Gbandjo/Systige) et sont **sans quota de requêtes**.

---

## 1. Pré-requis & accès

- Un compte AirMess **actif** (marchand ou particulier).
- Une **clé d'intégration** générée depuis une **app dev** (voir §12) — ou une
  clé marchand historique (§3).
- Les appels sont **serveur-à-serveur** : la clé est secrète et ne doit
  **jamais** être exposée côté navigateur.
- Un **wallet AirMess approvisionné** : chaque course est facturée au user
  propriétaire de la clé (montant `delivery_fee` réservé à la création, débité
  à la livraison). Solde insuffisant → `402`, course non créée.

## 2. URL de base

| Environnement | Base URL |
|---|---|
| Production | `https://<votre-domaine-api>/api` |
| Local (dev) | `http://127.0.0.1:8000/api` |

Toutes les routes ci-dessous sont relatives à cette base.

---

## 3. Authentification

L'API utilise une **clé d'intégration** (jeton Bearer) portant l'autorisation
`integration:create-course`. Chaque clé appartient à un marchand ; les courses
créées avec sont rattachées à ce marchand.

### En-tête à envoyer sur chaque appel

```
Authorization: Bearer <VOTRE_CLE>
Accept: application/json
Content-Type: application/json
```

### Gérer ses clés (depuis le compte marchand connecté)

Ces routes utilisent l'authentification **du marchand** (session de l'app) et
servent à fabriquer/révoquer les clés. La valeur en clair n'est affichée
**qu'une seule fois**, à la création.

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/integration/keys` | Génère une nouvelle clé (renvoie la valeur en clair **une seule fois**). |
| `GET` | `/integration/keys` | Liste les clés (id, dernière utilisation) — **sans** la valeur. |
| `DELETE` | `/integration/keys/{id}` | Révoque une clé. |

Exemple de génération (réponse `201`) :

```json
{
  "message": "Clé d'intégration générée. Copiez-la maintenant : elle ne sera plus affichée.",
  "id": 146,
  "key": "146|k71gsCLTNMkLGWPZQMbTTb9tqygexUAcupMN9yzxff902cc3"
}
```

---

## 4. Créer une course

### `POST /integration/courses`

Crée une course de livraison. **Idempotent** sur `external_reference` (voir §6).

### Corps de la requête

```jsonc
{
  // Identifiant de la commande dans VOTRE système (recommandé : idempotence)
  "external_reference": "GB-ORD-10293",
  "source": "gbandjo",                 // libellé libre de provenance (optionnel)
  "urgency": "standard",               // "standard" (déf.) | "express"

  // Le point de RETRAIT (vous / le vendeur)
  "origin": {
    "name": "Boutique Awa",            // requis
    "phone": "+22990000001",           // requis
    "street": "Rue 12.345",            // optionnel
    "landmark": "près de la pharmacie",// optionnel
    "quartier": "Gbegamey",            // requis
    "city": "Cotonou",                 // requis
    "lat": 6.3700,                     // optionnel (voir §5)
    "lng": 2.4100,                     // optionnel
    "instructions": "Sonner à l'étage" // optionnel
  },

  // Le CLIENT (destination) — souvent incomplète au moment de la commande
  "destination": {
    "name": "Koffi",                   // optionnel
    "phone": "+22997000002",           // requis (numéro WhatsApp du client)
    "address": "Maison bleue, en face du marché", // optionnel (texte libre)
    "quartier": "Calavi",              // optionnel
    "city": "Abomey-Calavi",           // optionnel
    "lat": null,                       // optionnel
    "lng": null,                       // optionnel
    "instructions": "Appeler avant"    // optionnel
  },

  // Le colis (optionnel — des valeurs par défaut sont appliquées)
  "package": {
    "category_id": 1,                  // optionnel (déf. : catégorie « standard »)
    "description": "Commande #10293",  // optionnel
    "size": "M"                        // "S" | "M" (déf.) | "L" | "XL"
  },

  // Encaissement à la livraison (optionnel)
  "collection_amount": 5000,           // si présent, has_collection = true
  "collection_method": "cash"          // "cash" | "mobile_money" | "prepaid"
}
```

> **Minimum requis** : `origin.{name,phone,quartier,city}` et
> `destination.phone`. Tout le reste est optionnel.

### Réponse `201 Created`

```json
{
  "message": "Course créée. En attente d'attribution.",
  "reference": "AM-2026-00042",
  "status": "awaiting_assignment",
  "tracking_url": "https://airmess.../t/EqVC0WhyTs",
  "delivery_fee": 1500
}
```

Utilisez `reference` pour relier la course à votre commande, et `tracking_url`
pour suivre la livraison (page publique).

---

## 5. Coordonnées GPS & statut de la course

Le rapprochement avec les livreurs se fait autour du **point de retrait**
(`origin`). Deux cas :

| `origin.lat` / `origin.lng` | Statut initial | Conséquence |
|---|---|---|
| Fournis | `awaiting_assignment` | La course est immédiatement proposée aux livreurs proches. |
| Absents | `awaiting_geo` | La course est créée mais **en attente** que les coordonnées du retrait soient renseignées (côté AirMess) avant d'être proposée. |

➡️ **Recommandation** : fournissez `origin.lat`/`origin.lng` si vous les avez,
pour un dispatch immédiat. La destination peut rester sans GPS (le livreur
contacte le client au numéro fourni).

---

## 6. Idempotence (éviter les doublons)

Si vous renvoyez **le même `external_reference`** pour le même marchand, AirMess
**ne crée pas** de seconde course : il renvoie la course existante avec un
statut `200 OK` (au lieu de `201`). Vos *retries* réseau sont donc sans danger.

```json
// 2ᵉ appel avec le même external_reference :
{
  "message": "Course déjà créée pour cette commande.",
  "reference": "AM-2026-00042",
  "status": "awaiting_assignment",
  "tracking_url": "https://airmess.../t/EqVC0WhyTs",
  "delivery_fee": 1500
}
```

---

## 7. Codes de réponse & erreurs

| Code | Signification | Que faire |
|---|---|---|
| `201` | Course créée | — |
| `200` | Course déjà existante (idempotence) | Aucun doublon créé. |
| `401` | Clé absente / invalide | Vérifier l'en-tête `Authorization`. |
| `403` | Clé sans l'autorisation, marchand non validé / abo inactif | Vérifier le plan (api_access) et la validation du compte. |
| `402` | Solde wallet insuffisant | Recharger le wallet du marchand (la course n'est pas créée). |
| `422` | Validation échouée | Lire `errors` (détail par champ). |
| `429` | Trop de requêtes (rate limit) | Respecter la limite (voir §8) et réessayer. |

Exemple `402` (solde insuffisant) :

```json
{ "message": "Solde wallet insuffisant. Rechargez votre wallet pour créer des courses via l'API.", "insufficient_funds": true, "available": 500, "required": 1500 }
```

Exemple `422` (validation) :

```json
{
  "message": "The destination.phone field is required.",
  "errors": { "destination.phone": ["The destination.phone field is required."] }
}
```

---

## 8. Limites de débit (rate limiting)

Les appels à `/integration/courses` sont limités à **60 requêtes / minute** par
clé. Au-delà → `429 Too Many Requests`. Si vous avez un besoin de volume
supérieur, contactez-nous.

---

## 9. Cycle de vie d'une course (statuts)

```
awaiting_geo ─▶ awaiting_assignment ─▶ assigned ─▶ driver_to_pickup ─▶ at_pickup
   ─▶ picked_up ─▶ at_dropoff ─▶ delivered
                                 (ou cancelled / failed à tout moment)
```

Suivez l'état en temps réel via la `tracking_url` renvoyée à la création.

---

## 10. Exemple complet (curl)

```bash
curl -s https://<api>/api/integration/courses \
  -X POST \
  -H "Authorization: Bearer 146|k71gsCLTNMkLGWP..." \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "external_reference": "GB-ORD-10293",
    "source": "gbandjo",
    "urgency": "standard",
    "origin":      { "name": "Boutique Awa", "phone": "+22990000001",
                     "quartier": "Gbegamey", "city": "Cotonou",
                     "lat": 6.37, "lng": 2.41 },
    "destination": { "name": "Koffi", "phone": "+22997000002",
                     "address": "Maison bleue", "quartier": "Calavi",
                     "city": "Abomey-Calavi" },
    "package":     { "description": "Commande #10293", "size": "M" }
  }'
```

---

## 11. Bonnes pratiques

- **Toujours** envoyer un `external_reference` (votre n° de commande) → sécurise
  les *retries* et le rapprochement comptable.
- Appel **uniquement côté serveur** : ne jamais embarquer la clé dans du code
  client (navigateur/app mobile).
- Stockez la `reference` AirMess avec votre commande pour le suivi.
- Gérez les erreurs sans bloquer votre tunnel : en cas d'échec API, enregistrez
  la commande et rejouez l'appel (l'idempotence évite les doublons).

---

## 12. Mode développeur — apps API dev

Tout compte marchand OU particulier peut activer le "mode dev" et créer une
ou plusieurs **apps**. Chaque app :

- Est rattachée à un **plan API** (Starter 15, Pro 100, Premium 500 req/mois)
- Porte son propre **compteur de quota** (reset le 1er du mois UTC)
- Peut avoir **plusieurs clés** d'accès (Sanctum tokens scopés)
- Peut configurer un **endpoint webhook** pour recevoir les événements de
  course (voir §13)

Le paiement de chaque course créée par l'app est débité du **wallet du user
propriétaire** de l'app (marchand ou particulier).

### 12.1 Endpoints — gestion des apps (auth session du user)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api-plans` | Liste des plans API disponibles |
| `GET` | `/me/api-apps` | Mes apps |
| `POST` | `/me/api-apps` | Créer une app (`name`, `description?`, `subscription_plan_id`) |
| `PATCH` | `/me/api-apps/{id}` | Renommer / changer de plan |
| `DELETE` | `/me/api-apps/{id}` | Supprimer (révoque toutes les clés) |
| `POST` | `/me/api-apps/{id}/subscribe` | Souscrire/renouveler un plan (`plan_code`, `callback_url`) — renvoie `checkout_url` Fedapay si plan payant |

### 12.2 Endpoints — gestion des clés d'une app

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/me/api-apps/{id}/keys` | Liste des clés (sans la valeur) |
| `POST` | `/me/api-apps/{id}/keys` | Génère une clé — plaintext **une seule fois** |
| `DELETE` | `/me/api-apps/{id}/keys/{keyId}` | Révoque une clé |

### 12.3 Quota mensuel

Chaque appel réussi (2xx) à `/integration/courses` **avec une clé d'app dev**
consomme **une** unité du quota mensuel. Le compteur reset le 1er du mois
UTC.

Quota atteint → `429 Too Many Requests` :

```json
{
  "message": "Quota mensuel atteint pour cette application.",
  "quota_limit": 15,
  "quota_used": 15,
  "reset_at": "2026-08-01T00:00:00+00:00"
}
```

> Les clés marchand historiques (§3) ne sont **pas** soumises au quota mensuel
> — juste au rate-limit 60 req/min.

### 12.4 Expiration d'abonnement

Les plans API payants sont valables **30 jours** à partir de l'activation
Fedapay. Un cron quotidien suspend les apps dont l'abonnement est expiré
(`paid_until < now`). Le user peut renouveler à tout moment depuis `/dev`.

Le plan gratuit (**Starter**) n'expire jamais.

---

## 13. Webhooks — recevoir les événements de course

Configurez un endpoint HTTPS sur votre app dev pour recevoir en temps réel les
changements d'état des courses qu'elle a créées.

### 13.1 Configuration

| Méthode | Route | Description |
|---|---|---|
| `PUT` | `/me/api-apps/{id}/webhook` | Configure/met à jour l'URL — régénère le secret (**one-shot**) |
| `DELETE` | `/me/api-apps/{id}/webhook` | Désactive les webhooks |
| `GET` | `/me/api-apps/{id}/deliveries` | Historique paginé des envois |
| `POST` | `/me/api-apps/{id}/deliveries/{deliveryId}/retry` | Rejoue une delivery `failed` ou `pending` |

### 13.2 Événements dispatchés

| `event_type` | Déclencheur |
|---|---|
| `course.created` | Création via `POST /integration/courses` |
| `course.assigned` | Un livreur a accepté la course |
| `course.picked_up` | Le colis a été retiré chez le vendeur |
| `course.delivered` | Livraison confirmée au destinataire |
| `course.cancelled` | Course annulée avant retrait |
| `course.failed` | Course en échec (livreur abandonne, refus destinataire…) |

### 13.3 Format du payload

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "course.delivered",
  "created_at": "2026-07-01T14:32:19+00:00",
  "data": {
    "course": {
      "id": 4213,
      "reference": "AM-2026-04213",
      "status": "delivered",
      "external_reference": "GB-ORD-10293",
      "tracking_url": "https://airmess.../t/EqVC0WhyTs",
      "urgency": "standard",
      "delivery_fee": 1500,
      "driver_earnings": 1050,
      "origin": { "name": "Boutique Awa", "quartier": "Gbegamey", ... },
      "destination": { "name": "Koffi", "quartier": "Calavi", ... },
      "collection": { "amount": 5000, "method": "cash" },
      "created_at": "2026-07-01T13:12:00+00:00"
    }
  }
}
```

### 13.4 Headers HTTP envoyés

| Header | Contenu |
|---|---|
| `Content-Type` | `application/json` |
| `User-Agent` | `AirMess-Webhook/1.0` |
| `X-AirMess-Event` | `course.delivered` etc. |
| `X-AirMess-Event-Id` | UUID (idempotence côté receveur) |
| `X-AirMess-Signature` | HMAC-SHA256 hex du body avec votre secret |
| `X-AirMess-Delivery` | ID de la delivery côté AirMess (utile pour le retry) |

### 13.5 Vérifier la signature (obligatoire)

Recalculez `HMAC-SHA256(secret, raw_body)` et comparez au header
`X-AirMess-Signature`. Rejetez si différent.

**Exemple Node.js/Express** :

```js
const crypto = require('crypto')

app.post('/webhooks/airmess', express.raw({ type: 'application/json' }), (req, res) => {
  const secret = process.env.AIRMESS_WEBHOOK_SECRET
  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex')
  const received = req.header('X-AirMess-Signature')

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))) {
    return res.status(401).end()
  }

  const payload = JSON.parse(req.body.toString())
  // ... traitez selon payload.event_type
  res.status(200).end()
})
```

**Exemple PHP** :

```php
$body   = file_get_contents('php://input');
$secret = env('AIRMESS_WEBHOOK_SECRET');
$expected = hash_hmac('sha256', $body, $secret);
$received = $_SERVER['HTTP_X_AIRMESS_SIGNATURE'] ?? '';

if (! hash_equals($expected, $received)) {
    http_response_code(401);
    exit;
}
```

### 13.6 Idempotence côté receveur

Chaque envoi porte le **même** `event_id` (UUID) sur tous les retries. Stockez
les `event_id` déjà traités et ignorez les doublons — indispensable pour ne
pas double-traiter en cas de retry AirMess.

### 13.7 Retry automatique

Si votre endpoint renvoie autre chose que `2xx` (ou timeout > 15s), AirMess
retente automatiquement :

| Tentative | Délai après échec |
|---|---|
| 1 vers 2 | +30 s |
| 2 vers 3 | +5 min |
| 3 vers échec définitif | +30 min |

Après 3 échecs → delivery en état `failed`. Vous pouvez la rejouer manuellement
depuis `/dev` ou via `POST .../deliveries/{id}/retry`.

### 13.8 Bonnes pratiques

- Répondez **2xx rapidement** (< 15 s) puis traitez en arrière-plan si besoin
- **Toujours** vérifier la signature avant de traiter
- Stockez les `event_id` déjà vus (dédup) pendant au moins 7 jours
- Endpoint **HTTPS uniquement**, avec certificat valide
