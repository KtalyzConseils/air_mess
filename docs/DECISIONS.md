# Décisions produit / design / tech — AirMess

> Journal des décisions tranchées. Format : décision + rationale + impact.

## D-01 — Nom de marque canonique : « AirMess » (22/09/2026)

**Décision :** « AirMess » est le nom d'affichage unique en UI et en marketing. « Air Mess » est conservé **uniquement** dans les pages légales (CGU, confidentialité) et les références contractuelles.

**Rationale :** cohérence avec le nom d'app (`app.json`), les bundles (`com.airmess.*`), le domaine (`airmess-logistics.com`) et `config.ts`.

**Impact :** normaliser `Airmess` et `Air Mess` (hors pages légales) → `AirMess`. `AIRMESS` (tout-caps) → `AirMess` dans les métadonnées visibles (title/OG), réservé au logo le cas échéant.

## D-02 — Package Android `com.anonymous.driver` : différer (22/09/2026)

**Décision :** ne pas renommer maintenant. Le renommage se fera au moment de la préparation Play Store, en migration coordonnée (Firebase + Google Maps + EAS).

**Rationale :** le package est cuit dans Firebase (`google-services.json.example`) et la restriction de clé Google Maps (`app.config.js`) ; le renommer hors migration casserait push + cartes. Pas de lancement Play Store imminent.

**Impact :** voir `docs/PACKAGE_NAME_MIGRATION.md`.

## D-03 — App marchand native `AirMess` : décommissionner (22/09/2026)

**Décision :** la PWA web `marchant-web` est la surface marchand de référence ; l'app native `AirMess` est hors périmètre MVP (le cahier prévoit « espace marchand web » + « app livreur Android ») et sera retirée.

**Rationale :** deux surfaces marchandes redondantes = double maintenance ; la PWA couvre l'usage smartphone sans installation.

**Impact :** ne plus construire/maintenir `apps/AirMess` ; planifier son archivage et la migration éventuelle des données utilisateurs. Le chemin `google-services.json` cassé devient sans objet.
