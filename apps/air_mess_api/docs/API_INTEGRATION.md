# API d'intégration AirMess — Documentation développeur

Créez des courses (livraisons) AirMess automatiquement depuis votre propre
application (site e-commerce, ERP, backend…) via une API REST simple.

> **Cas d'usage type** : une commande est passée sur votre boutique → vous
> appelez AirMess en serveur-à-serveur → une course est créée et proposée aux
> livreurs disponibles autour de votre point de retrait.

---

## 1. Pré-requis & accès

- Un compte **marchand** AirMess **validé**, avec un abonnement actif incluant
  la fonctionnalité **`api_access`** (plan **Business**).
- Une **clé d'intégration** (voir §3). Les appels sont **serveur-à-serveur** :
  la clé est secrète et ne doit **jamais** être exposée côté navigateur.

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
| `402` | Quota mensuel de courses atteint | Passer à un plan supérieur / renouveler. |
| `422` | Validation échouée | Lire `errors` (détail par champ). |
| `429` | Trop de requêtes (rate limit) | Respecter la limite (voir §8) et réessayer. |

Exemple `402` (quota atteint) :

```json
{ "message": "Quota mensuel atteint.", "quota_reached": true, "used": 500, "limit": 500 }
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
