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

## D-04 — Package Android livreur `com.anonymous.driver` : conservé (12/10/2026)

**Décision :** l'application livreur est publiée sur Google Play sous `com.anonymous.driver` et garde ce package définitivement. Le renommage vers `com.airmess.driver` est abandonné sur cette application.

**Rationale :** un package publié est immuable chez Google. Le renommer exigerait une nouvelle fiche, une réinstallation par tous les livreurs et la perte des jetons push des appareils déjà équipés — exactement le coût identifié dans `docs/PACKAGE_NAME_MIGRATION.md`, désormais sans contrepartie puisqu'il n'y a plus de fenêtre de lancement à préparer.

**Impact :** `docs/PACKAGE_NAME_MIGRATION.md` passe en statut abandonné ; les liens de téléchargement (landing, app marchand, bannière d'inscription livreur de la web) pointent vers la fiche Google Play et non plus vers un APK Expo. Ne plus planifier de renommage du package livreur.

## D-05 — Inscription marchand sans validation admin (12/10/2026)

**Décision :** un marchand qui s'inscrit via `POST /api/auth/register/marchant` obtient un compte immédiatement opérationnel : plus de `waitlisted_at`, `marchants.validated_at` posé à la création, mail de bienvenue envoyé à l'inscription. Le parcours est aligné sur celui du particulier et sur celui de l'application mobile.

**Rationale :** l'email est déjà confirmé par code à l'inscription, et l'équipe garde les moyens d'agir après coup (`AdminController::suspendMarchant`, `rejectMarchant`, `reactivateMarchant`). La validation a priori n'apportait donc rien, mais bloquait la première course d'un marchand fraîchement inscrit : `CreateCourseRequest` refusait toute création tant que `validated_at` était nul, web comme application mobile.

**Impact :** `CreateCourseRequest` s'ouvre dès l'inscription ; la file admin `AdminController::pendingMarchants` ne concerne plus que les dossiers antérieurs au 12/10/2026 ; `MarchantValidatedMail` n'est plus envoyé pour les nouvelles inscriptions ; l'override web « dossier en cours de validation » (overlay du dashboard, badge « en attente » du profil) piloté par `validated_at` ne s'affiche plus. Les dossiers marchands déjà en attente en production ne sont pas validés automatiquement : ils demandent une action admin explicite.

## D-06 — Retraits : débit du wallet seulement après confirmation du virement (14/10/2026)

**Décision :** une demande de retrait approuvée (par un admin ou en libre-service) réserve le montant sans débiter le wallet. Le débit a lieu uniquement quand FedaPay confirme le payout (`sent`) ou quand un admin marque le virement manuel comme effectué. Un échec FedaPay libère la réservation, sans mouvement financier.

**Rationale :** jusqu'ici, le wallet était débité avant que l'argent ne parte, puis recrédité en cas d'échec. Comme le webhook de succès n'était jamais reconnu (FedaPay envoie `sent`, pas `approved`/`processed`) et que la contrainte `paid_consistency_check` refusait les retraits instant sans admin, des soldes étaient amputés sans virement confirmé.

**Impact :** migration `2026_10_14_000000_allow_automatic_withdraw_payout_without_admin` (`paid_by_admin_id` peut rester nul pour un payout automatique). Les demandes historiques déjà débitées sont reconnues et ne sont jamais débitées une seconde fois ; en cas d'échec, elles restent remboursées. Les applications peuvent afficher `available` et `withdraw_in_progress_fcfa` au lieu de `balance`.

## D-07 — Inscription marchand : fin de la vérification email (16/10/2026)

**Décision :** `POST /api/auth/register/marchant` ne demande plus de code de confirmation par email. L'email est marqué vérifié à la création (`email_verified_at`), comme le téléphone (`phone_verified_at`), et le compte reste ouvert immédiatement (D-05). Le particulier conserve le code à six chiffres, sans changement.

**Rationale :** le code email était la dernière vérification de l'inscription marchand et bloquait des inscriptions légitimes quand le message n'arrivait pas. Le compte étant déjà opérationnel sans validation admin depuis D-05, l'étape n'apportait plus qu'une friction.

**Impact :** plus aucun contrôle à l'inscription marchand — un compte opérationnel peut être créé avec une adresse email que le demandeur ne possède pas. Le throttle `auth-register` (3 inscriptions/minute par IP) devient la seule limite. `email_code` reste accepté à la validation pour les clients déjà installés, mais il est ignoré côté marchand. La justification de D-05 (« l'email est déjà confirmé par code à l'inscription ») n'est plus vraie : le contrôle a posteriori (`AdminController::suspendMarchant`, `rejectMarchant`) devient le seul filet. Réversibilité : rétablir l'appel à `consumeRegistrationEmailCode` dans `AuthController::registerMarchant` et `emailCodeRequired = true` dans `RegisterPage`.
