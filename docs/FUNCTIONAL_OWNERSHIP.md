# Cartographie fonctionnelle AirMess

## Bonus de première course

- Source de vérité métier : `apps/air_mess_api/app/Services/FirstCourseDiscountService.php`.
- Code fonctionnel : `FIRST_COURSE_500`.
- Bénéficiaires : marchands ayant auparavant envoyé le formulaire public commerçant, une seule fois.
- Application à la facturation : `CourseBillingService` et les parcours de création de course qui l'utilisent.
- Preuve attendue : tests de création de course ; le bonus ne doit jamais être crédité comme un solde wallet.

Le rapprochement entre la candidature et le compte marchand se fait par email. Le champ `merchant_waitlists.bonus_amount` conserve la promesse faite au prospect, tandis que `FirstCourseDiscountService` reste seul responsable de l'éligibilité et de l'application. Aucun nouveau code promotionnel n'est généré.

## Deux populations actuellement appelées « liste d'attente »

1. `users.waitlisted_at` : utilisateurs déjà inscrits (marchands/livreurs) dont l'accès attend une validation administrative.
2. `merchant_waitlists` et `driver_waitlists` : prospects issus des formulaires publics, sans compte applicatif nécessairement créé.

Ces populations ne doivent pas être fusionnées implicitement dans le code ou l'interface. Avant toute évolution, préciser si elle vise les comptes à valider, les prospects ou les deux.

## Activation d'une candidature publique

- Source de vérité : `apps/air_mess_api/app/Services/PublicWaitlistActivationService.php`.
- Le bouton d'information admin génère un jeton aléatoire à usage unique, valable sept jours et stocké uniquement sous forme hachée.
- Le lien préremplit les champs communs, sans supprimer les champs ni les pièces obligatoires du formulaire d'inscription.
- La création du compte consomme le jeton et rattache la candidature au nouvel utilisateur via `activated_user_id`.
- Ne pas recréer un second mécanisme de lien, de code ou de conversion des candidatures.

## Collecte du questionnaire public livreur

- Source de vérité : la table `driver_waitlists`, pour l'ancien formulaire comme pour le questionnaire versionné de la landing.
- Endpoint public unique : `POST /api/waitlist/drivers`. Le contrôleur distingue le questionnaire versionné par le champ `survey`.
- Idempotence : `survey_response_id` est unique afin qu'une reprise après coupure réseau ne crée pas de doublon.
- Les coordonnées d'ouverture de compte ne sont acceptées qu'avec un jeton de vérification correspondant au numéro normalisé.
- Le mode démonstration de la landing doit rester explicitement activé et ne doit jamais être la valeur par défaut en production.
- Restitution administrative : `Résultats des formulaires`, onglet livreurs, avec les réponses brutes conservées dans `survey_payload` et `account_payload`.

## Remise de colis entre livreurs

- Source unique de confirmation : `Course::confirmParcelTransfer`, utilisée par la transition livreur et l'exception ops. Aucun mouvement financier n'y est ajouté.
- `AdminController::reassignCourse` renouvelle le code à chaque désignation et conserve le détenteur réel si le second livreur est remplacé avant remise.
- Code à six chiffres chiffré en base et masqué par défaut. Seule la liste des courses du détenteur courant expose `handover_code` ; ne jamais l'ajouter aux notifications, historiques ou réponses destinées au second livreur/client.
- Cinq erreurs entraînent un blocage de quinze minutes. La confirmation est verrouillée en transaction, consomme le code et trace les deux livreurs. Une répétition ne doit pas renotifier ou libérer une seconde fois.
- Exception : endpoint admin réservé super/ops, motif de vérification obligatoire et événement distinct. Confirmer une remise ne clôture pas automatiquement l'incident.
- Déploiement : migration `2026_09_25_000001_secure_parcel_transfers` (inclut les transferts en cours), puis API/web et application mobile compatible. Prévenir les opérations avant activation : une ancienne app ne peut plus confirmer sans saisir le code ; utiliser la procédure exceptionnelle seulement après vérification physique.
- Validation locale encore requise : les tests PostgreSQL ont été bloqués par un disque plein lors de cette implémentation. Ne pas déployer sans relancer les tests de transfert et tester les deux comptes sur appareil.

## Diagnostic des courses sans livreur

- Source unique : `AdminController::unassignedCourses`, accessible aux rôles super, ops et support. Les compteurs et listes `assignment_diagnostic.people` sont calculés ensemble.
- Offres et refus : historique cumulé de la course, dédupliqué par utilisateur/livreur, toutes diffusions confondues. « Contactés sans refus enregistré » ne prouve pas l'absence de toute réponse passée.
- `push_received_at` est un accusé de réception et `read_at` concerne la notification, pas une preuve de lecture de l'offre. Une notification enregistrée ne garantit pas l'envoi ou la réception du push.
- Disponibilités et distances : dernières positions connues, même rayon de 8 km que les compteurs existants ; ne constituent pas un contrôle complet d'éligibilité à une course.

## Désactivation d'un livreur connecté

- Isolation mobile des comptes : le `QueryClient` du layout est propre à chaque session ; le provider est remonté et l'ancien cache supprimé au changement de token. Ne pas réintroduire un cache global entre deux connexions : les codes de remise et autres données privées ne doivent jamais apparaître pour le compte suivant.

- Source serveur : `AdminController::toggleDriverActive`, qui suspend le compte, le passe hors ligne et révoque ses tokens. Une course en cours, un retour ou un colis encore détenu pour transfert interdit cette désactivation.
- Source mobile : l'intercepteur 401 de `driver-app/src/api/client.ts` et `authStore.expireSession`. Seule la session du token concerné est invalidée ; une panne réseau ou un refus 403 ne déconnecte pas.
- Le layout actualise la query existante `['me']` au retour au premier plan et toutes les 15 secondes lorsque l'app est active, sur tous les écrans. Ne pas ajouter un second polling dans l'accueil.
- Une réponse 401 ne distingue pas expiration et désactivation : le message ne doit pas inventer un motif précis. Le login conserve le diagnostic serveur du compte.

## Règle d'évolution

Avant de toucher au bonus ou aux listes d'attente, rechercher au minimum : `FirstCourseDiscountService`, `FIRST_COURSE_500`, `waitlisted_at`, `MerchantWaitlist`, `DriverWaitlist`, les routes admin correspondantes et leurs tests.

## Réconciliation financière et fonds sandbox

- Source de vérité administrative : `GET /api/admin/reconciliation` et sa section `sandbox_audit`.
- Analyse en lecture seule : `SandboxFinancialAuditService` ; elle doit être étendue plutôt que dupliquée.
- Le `snapshot_token` représente l'état financier courant. Un plan préparé sur un dump ou avec un ancien jeton est obsolète.
- Les boutons de remise à zéro d'un wallet ne constituent pas un outil d'assainissement global.
- Toute correction future doit conserver les historiques, utiliser des écritures compensatoires et revérifier le jeton dans la transaction d'application.
- L'application exige une préparation serveur et un code temporaire à usage unique lié au super-admin, au snapshot et au hash du plan. Une simple confirmation navigateur ne suffit pas.
