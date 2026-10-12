# Plan de réconciliation des doublons Landing

> Objectif : une **seule** implémentation des pages publiques « commerçants » et « livreurs », un seul flux de maintenance.

## 0. Statut d'exécution (22/09/2026)

- [x] Étape 1 — lien `LoginPage` → URL canonique (via `MARKETING_SITE_URL`).
- [x] Étape 2 — routes `/landing/*` de marchant-web → redirections externes `LandingRedirect`.
- [x] Étape 3 — suppression des pages dupliquées `LandingCommercantsPage` / `LandingDriversPage` de marchant-web.
- [ ] Étape 4 — archivage du code mort React (corrigé ci-dessous, à traiter séparément).

## 1. Constat (doublons confirmés)

Les pages d'enquête publiques sont **dupliquées** entre deux applications React :

| Fichier | Lignes |
|---|---|
| `apps/landing/src/pages/LandingCommercantsPage.tsx` | 1242 |
| `apps/marchant-web/src/pages/LandingCommercantsPage.tsx` | 1215 |
| `apps/landing/src/pages/LandingDriversPage.tsx` | 1410 |
| `apps/marchant-web/src/pages/LandingDriversPage.tsx` | 1192 |

Les deux apps **servent les mêmes routes** :

- `apps/landing/src/App.tsx` (lignes 19 et 27) — via `window.location.pathname`.
- `apps/marchant-web/src/App.tsx` (lignes 121–124) — via React Router.

S'ajoutent deux artefacts statiques potentiellement redondants :

- `apps/landing/src/pages/homepage.html` (13 Ko) + `apps/landing/src/redesign.css` ;
- `AIRMESS_Refonte_HTML_Developpeur/dist/` (livrable HTML/CSS/JS séparé).

## 2. Source de vérité retenue

**`apps/landing` est la source de vérité unique** pour la homepage et les pages publiques commerçants/livreurs.

Justification :

1. C'est le site vitrine (`airmess-logistics.com`) et la destination publique des CTA.
2. Les pages elles-mêmes publient leur URL canonique `https://airmess-logistics.com/landing/…` (`LandingCommercantsPage.tsx:722`, `LandingDriversPage.tsx:1096`).
3. `apps/landing/src/config.ts` centralise déjà les liens d'inscription (marchand → `/register`, livreur → `/register/driver`).

Conséquence : `apps/marchant-web` **ne doit plus** embarquer ni servir ces pages.

## 3. Étapes de migration (dans l'ordre)

### Étape 1 — Corriger le lien interne de marchant-web

`apps/marchant-web/src/pages/LoginPage.tsx:82` contient un lien interne `to="/landing/merchants_learn"`. Le remplacer par un **lien externe** vers la source de vérité :

- URL canonique : `https://airmess-logistics.com/landing/merchants_learn` ;
- idéalement via une constante (ex. `apps/marchant-web/src/lib/constants.ts`) pour rester pilotable par build.

### Étape 2 — Supprimer les routes `/landing/*` de marchant-web

Dans `apps/marchant-web/src/App.tsx` :

- retirer les imports `LandingCommercantsPage` / `LandingDriversPage` (lignes 30–31) ;
- retirer les 4 routes `/landing/*` (lignes 121–124).

### Étape 3 — Supprimer les pages dupliquées

- `apps/marchant-web/src/pages/LandingCommercantsPage.tsx` ;
- `apps/marchant-web/src/pages/LandingDriversPage.tsx`.

Vérifier au préalable qu'aucun autre import ne référence ces deux fichiers (voir étape 6).

### Étape 4 — Correction : `homepage.html` et `redesign.css` sont VIVANTS

Contrairement à la v1 de ce plan, `homepage.html` et `redesign.css` ne sont **pas** obsolètes :

- `apps/landing/src/HomePage.tsx` rend le HTML via `import homepageHtml from './pages/homepage.html?raw'` + `dangerouslySetInnerHTML`.
- `apps/landing/src/main.tsx` importe `./redesign.css`.

Le vrai **code mort** est l'ancienne homepage React : `components/Hero.tsx`, `Features.tsx`, `HowItWorks.tsx`, `SocialProof.tsx`, `Audiences.tsx`, `DriverCta.tsx`, `Faq.tsx`, `Footer.tsx`, `Navbar.tsx`, `TrackingCard.tsx`, `WalletSection.tsx`, `WhatsAppButton.tsx`, `Logo.tsx`, plus `content.ts` et `locales/fr.ts` / `locales/en.ts` (plus importés par `HomePage`).

À traiter en tâche séparée : archiver ces composants orphelins — **pas** le HTML. `AIRMESS_Refonte_HTML_Developpeur/` (non versionné) reste le livrable de design historique, supprimable une fois la version React validée.

### Étape 5 — Vérifier les liens croisés

`rg "landing/merchants_learn|landing/drivers_learn|LandingCommercants|LandingDrivers" apps/` pour détecter tout lien restant, puis corriger chaque occurrence vers l'URL canonique.

### Étape 6 — Build & recette

- `npm run build` sur `apps/landing` et `apps/marchant-web`.
- Tester : `airmess-logistics.com/landing/merchants_learn`, `…/drivers_learn` (landing OK), et `app.airmess-logistics.com/login` → lien « commerçants » redirige vers la landing canonique.
- Vérifier que l'inscription marchand/livreur (POST vers `/api/waitlist/…`) fonctionne toujours — c'est le point fonctionnel critique de ces pages.

## 4. Non-objectifs

- Ne **pas** fusionner les deux apps React (landing et marchant-web) dans ce plan : l'objectif est uniquement de supprimer la duplication des pages publiques, pas de refondre l'architecture des deux SPA.
- Ne **pas** toucher aux enquêtes stockées côté backend (`driver_waitlists`, `reponses_enquete`, `merchant_waitlists`) : la réconciliation est frontend.

## 5. Risques

| Risque | Atténuation |
|---|---|
| Un deep-link `/landing/*` sur `app.airmess-logistics.com` existe déjà en circulation | Conserver une redirection 301 côté hébergement (ou route `Navigate`) vers `airmess-logistics.com/landing/*` |
| Le lien `LoginPage` casse après suppression de la route interne | Étape 1 exécutée **avant** l'étape 2 |
| Perte de l'historique de design | Archiver (ne pas supprimer) `AIRMESS_Refonte_HTML_Developpeur` tant que la version React n'est pas validée en production |
