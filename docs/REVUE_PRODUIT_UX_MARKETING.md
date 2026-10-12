# Revue Produit · UX/UI · Marketing — AirMess

> Date : 22 septembre 2026 · Périmètre : `apps/` (landing, marchant-web, AirMess, driver-app, air_mess_api) + `docs/` · Auteur : revue croisée produit / design / marketing.

## 1. Résumé exécutif

AirMess est une **marketplace de livraison Bénin** (Cotonou / Abomey-Calavi) qui met en relation marchands, livreurs et admin, avec un différenciateur fort : **l'encaissement intégré** (cash + Mobile Money MTN/Moov) reversé automatiquement au marchand.

Le socle est **plus avancé que le MVP du cahier des charges** : wallet, réconciliation, incidents, onboarding public, bonus, OTP, tracking client, back-office complet. Le problème prioritaire n'est donc **pas le manque de fonctionnalités**, mais :

1. **La fragmentation des surfaces** (deux clients marchands + triple implémentation de la landing).
2. **La dérive de l'identité de marque et des sources de vérité** (polices divergentes, tokens legacy, contacts incohérents).
3. **L'absence de mesure** (aucun suivi de conversion/CAC, pourtant exigé par le cahier des charges).

## 2. État des lieux

### 2.1 Architecture réelle

| Couche | Techno | Rôle |
|---|---|---|
| `apps/air_mess_api` | Laravel 13 + Sanctum + Brevo (mailer) | Backend REST (auth, courses, wallet, waitlists, OTP, admin) |
| `apps/marchant-web` | React 19 + Vite + Leaflet + PWA + Firebase | Espace marchand web + **tout le back-office admin** |
| `apps/AirMess` | Expo 56 / RN 0.85 | **App marchand native** (bundle `com.airmess.merchant`) |
| `apps/driver-app` | Expo 56 / RN 0.85 | App livreur Android (VoIP, full-screen notifications) |
| `apps/landing` | React 19 + Vite + framer-motion + i18next | Site vitrine + enquêtes publiques |
| `AIRMESS_Refonte_HTML_Developpeur` | HTML/CSS/JS statique | Refonte de la page d'accueil (livrable séparé) |

### 2.2 Documents de référence

- `docs/AirMess_CahierDesCharges.docx` — cahier des charges MVP (19/05/2026).
- `docs/FUNCTIONAL_OWNERSHIP.md` — cartographie des fonctions sensibles.
- `docs/ouverture-compte-livreur-enquete.md` — spec d'ouverture automatique de compte livreur.
- `docs/PRODUCTION_FINANCIAL_CLEANUP.md` — procédure d'assainissement financier.

## 3. Analyse Produit

### 3.1 P0 — Deux surfaces marchandes concurrentes

L'app native `apps/AirMess` et la PWA `apps/marchant-web` couvrent le même métier (dashboard, courses, `new-course`, wallet, adresses, profil). Le cahier prévoit *« espace marchand = application web responsive »* et *« app mobile = livreur uniquement »*.

**Recommandation :** garder la PWA web marchand comme source de vérité (le use-case 4 « Madame Rachelle » exige un usage 100 % smartphone sans installation), et **trancher explicitement** le sort de l'app native marchand (décommissionner, ou repositionner comme « expéditeur occasionnel »). Tant que les deux vivent, chaque feature est codée deux fois.

### 3.2 P0 — Triple implémentation de la landing

`LandingCommercantsPage` et `LandingDriversPage` existent **en double** :

- `apps/landing/src/pages/LandingCommercantsPage.tsx` (1242 lignes) ≈ `apps/marchant-web/src/pages/LandingCommercantsPage.tsx` (1215 lignes) ;
- `apps/landing/src/pages/LandingDriversPage.tsx` (1410) ≈ `apps/marchant-web/src/pages/LandingDriversPage.tsx` (1192).

S'y ajoutent `apps/landing/src/pages/homepage.html` + `redesign.css` et le livrable statique `AIRMESS_Refonte_HTML_Developpeur/dist`. Le plan de réconciliation détaillé est dans `docs/LANDING_RECONCILIATION_PLAN.md`.

### 3.3 P1 — Écart de stack non documenté

Le cahier propose Node (NestJS) / Django + PostgreSQL + Redis + WebSocket ; la réalisation est **Laravel 13**. Décision à **acter** dans un doc d'architecture, avec la stratégie temps réel et scalabilité (×10 visé).

### 3.4 P1 — Scope iOS livreur non assumé

`driver-app` porte `bundleIdentifier` iOS, `GoogleService-Info.plist`, `codemagic.yaml` et des commits CI iOS, alors que le cahier dit « iOS hors MVP ». À décider explicitement (coût de maintenance réel).

### 3.5 P1 — Config Android : migration coordonnée, pas un correctif simple

Le package `com.anonymous.driver` (`apps/driver-app/app.json`) n'est **pas** un simple oubli : il est cuit dans la config Firebase (`apps/driver-app/google-services.json.example` → `package_name: "com.anonymous.driver"`) et dans la restriction de clé Google Maps (`apps/driver-app/app.config.js`). Le changer casse FCM et Maps tant que ces deux services ne sont pas mis à jour.

Le chemin `googleServicesFile: "../merchant-app/google-services.json"` (`apps/AirMess/app.json`) pointe vers un dossier inexistant, mais sa correction dépend de la décision sur l'app marchand native (surface redondante vs la PWA web).

→ Runbook : `docs/PACKAGE_NAME_MIGRATION.md`. Trancher d'abord le sort de l'app marchand native.

### 3.6 P2 — Incohérence tarifaire

La landing annonce « livraison à partir de 500 FCFA » (tarif à la course) ; le cahier décrit une formule Pro 15 000 FCFA/mois + commissions. Deux modèles affichés sans explication → clarifier et harmoniser.

### 3.7 P2 — Cannibalisation des incitations

La spec `ouverture-compte-livreur-enquete.md` signale déjà : bonus 500 FCFA + prime d'activation 700 FCFA ≈ 1 950 FCFA, au-dessus du budget d'amortissement (~1 640 FCFA). Décision à trancher **avant** mise en ligne.

## 4. Analyse UX / UI

### 4.1 Bonne nouvelle : les couleurs de marque convergent déjà en code

`apps/marchant-web/src/index.css`, `apps/AirMess/tailwind.config.js` et `apps/driver-app/tailwind.config.js` partagent déjà :

- jaune `#FFCC00` (`airmess-yellow`), jaune vif `#FFD633` ;
- rouge `#D40511` (`airmess-red`), rouge clair `#E2231A` ;
- sombre `#1A1614` (`airmess-dark`).

La source de vérité est le **logo SVG officiel** (`apps/marchant-web/src/assets/logo/`).

### 4.2 Ce qui diverge encore

| Dimension | État constaté | Impact |
|---|---|---|
| **Typographie** | Manrope (web), Plus Jakarta Sans (apps), Archivo/Inter/JetBrains Mono (landing), Bebas Neue/Barlow (cahier), Inter/Barlow Condensed (refonte) | Incohérence immédiate entre surfaces |
| **Tokens legacy** | `landing/index.css` conserve `--color-yellow #ffc300` et `--color-red #cc0000` à côté des nouveaux tokens | Double palette, risque de mauvais usage |
| **Neutres chauds** | `warm-*` diffèrent entre web (`#F2EFE8…`) et apps (`#F4EFE4…`) | Teintes légèrement désaccordées |
| **Sémantique** | `success/warning/info` diffèrent (web `#15803D/#EA580C/#0369A1` vs apps `#16A34A/#F59E0B/#0284C7`) | Accessibilité des états incohérente |
| **Fond/texte** | landing `bg #f6f5f1` / `ink #161514` vs web `cream #FAF7F0` / `ink #0A0908` | Arrière-plan qui ne matche pas |

Le design system canonique + les tables de correspondance sont dans `docs/AIRMESS_DESIGN_SYSTEM.md`.

### 4.3 Cohérence de marque et de contact

- Nom : « Air Mess », « AirMess », « Airmess », « AIRMESS » coexistent dans la même landing.
- Email : `contact@rmess.app` (coquille, dans `AIRMESS_Refonte_HTML_Developpeur/INSTRUCTIONS_DEVELOPPEUR.md`) vs `support@airmess-logistics.com` (`apps/landing/src/config.ts`).
- WhatsApp : `+229 01 40 26 57 57` vs `22994180794`.

**Recommandation :** figer un seul nom + un email + un WhatsApp dans une source partagée (`apps/landing/src/config.ts` est le bon candidat) et propager.

### 4.4 Accessibilité livreur (exigence métier forte)

Le cahier impose : boutons larges/contrastés une main, notifications sonores, statuts en un geste, **mode dégradé** (file hors-ligne + sync différée), cartes hors-ligne, économie de batterie. C'est un levier de rétention direct (« une UX banale = un livreur qui abandonne en 2 semaines »).

**Recommandation :** audit UX dédié app livreur (contraste, taille des cibles, offline-first, résilience 3G) avant montée en charge.

### 4.5 Performance 3G non vérifiée

Seuils du cahier : web < 3 s en 3G, app < 4 s sur entrée de gamme, API < 500 ms p95. → Intégrer ces seuils en CI (Lighthouse + budget de bundle).

## 5. Analyse Marketing

### 5.1 P1 — Le funnel de conversion est incomplet

La landing est **déjà bien outillée** : GA4 (`G-KVMJQF9J8Z`) sur landing et marchant-web, events de clic (`click_register_driver`, `click_register_sender`, `click_whatsapp`, `click_download_driver_app`), Open Graph/Twitter, canonical, `robots.txt`, `sitemap.xml`, JSON-LD Organization.

Ce qui manque, c'est le **funnel complet** que le MVP doit prouver (coût d'acquisition marchand, coût par course) : complétion des formulaires, création de compte, première course, CA par source `src`.

**Recommandation :** ajouter des events de conversion sur la soumission des formulaires (`submit_merchant`, `submit_driver`) et sur les jalons produit (compte créé, 1re course, CA), puis un tableau de bord branché sur GA4. Corriger au passage le double `page_view` possible sur marchant-web (`index.html` + `AnalyticsTracker`).

### 5.2 P1 — Preuve sociale trop faible

La section « Ils nous font confiance » liste des logos sans chiffres ni témoignages. Le produit a un argument de confiance fort (encaissement, suivi, livreurs vérifiés) sous-exploité.

**Recommandation :** chiffres (courses livrées, délai moyen, zones), 1-2 témoignages marchands, mettre l'**encaissement** en message n°1.

### 5.3 P2 — Hygiène du dépôt et doublons d'images

Racine et `docs/` contiennent des assets marketing en vrac (`recrutement_*.png/jpg`, `probleme_commercants.png`, un PNG ChatGPT de 2 Mo, `exports/`, `favicon_io/`, `.codex-repl-probe.txt`). Certaines images sont **dupliquées** entre `docs/` et les dossiers `public/images/` de landing et marchant-web. → déplacer hors Git (ou Git LFS), dé-dupliquer et nettoyer.

### 5.4 P2 — Conformité APDP / confidentialité

La spec `ouverture-compte-livreur` exige les **formalités APDP avant mise en ligne** + politique de confidentialité complète (finalités, durées, droits). → compléter `apps/marchant-web/src/pages/legal/PrivacyPage.tsx` et `TermsPage.tsx`. Checklist complète : `docs/MARKETING_CONFORMITY_CHECKLIST.md`.

## 6. Plan d'action priorisé

| Priorité | Action | Référence |
|---|---|---|
| P1 | Migrer le package Android `com.anonymous.driver` (Firebase + Maps + EAS, coordonné) | §3.5 + runbook |
| P0 | Figer une source de vérité landing + un email + un WhatsApp + un nom de marque | §4.3 |
| P0 | Adopter le design system (tokens canoniques + une police) | `docs/AIRMESS_DESIGN_SYSTEM.md` |
| P1 | Compléter le funnel de conversion (complétion → compte → 1re course → CA) | §5.1 |
| P1 | Trancher la redondance app marchand native vs PWA web | §3.1 |
| P1 | Réconcilier les landing en double | `docs/LANDING_RECONCILIATION_PLAN.md` |
| P1 | Auditer l'UX livreur (accessibilité, offline-first, batterie, 3G) | §4.4 |
| P1 | Clarifier pricing public + incitations (500 vs 700) | §3.6/3.7 |
| P2 | Acter la stack Laravel + stratégie temps réel / scalabilité | §3.3 |
| P2 | Nettoyer le repo (assets marketing, fichiers lourds) | §5.3 |
| P2 | Conformité APDP / confidentialité / CGU | §5.4 |
| P3 | Décider du scope iOS livreur | §3.4 |

## 7. Documents produits par cette revue

- `docs/AIRMESS_DESIGN_SYSTEM.md` — tokens canoniques + correspondances.
- `docs/LANDING_RECONCILIATION_PLAN.md` — plan de dé-duplication landing.
- `docs/MARKETING_CONFORMITY_CHECKLIST.md` — checklist SEO / analytics / légal.
