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

## Règle d'évolution

Avant de toucher au bonus ou aux listes d'attente, rechercher au minimum : `FirstCourseDiscountService`, `FIRST_COURSE_500`, `waitlisted_at`, `MerchantWaitlist`, `DriverWaitlist`, les routes admin correspondantes et leurs tests.
