# Vérification locale des appels de course

## Retour utilisateur du 24 septembre 2026

Le parcours corrigé fonctionne lors des essais. Deux anomalies restent à corriger :

- La notification utilise le son système au lieu du son personnalisé. Vérifier le canal et la ressource sonore sur le téléphone.
- Refuser une réaffectation fait apparaître brièvement le modal actif avant sa fermeture. Vérifier l'actualisation au retour à l'accueil sans masquer les courses normales `assigned`.

Exécuter depuis `apps/driver-app` :

```powershell
node scripts/test-incoming-course.cjs
npx.cmd tsc --noEmit
```

Le script exécute le coordinateur réel avec les frontières API, stockage et notifications simulées. Aucun paiement, push ou appel réseau réel n'est émis. Il ne valide pas le rendu natif ni le volume sonore du téléphone.

## Application de développement sur téléphone

Vérifier que l'API configurée est celle de test. Utiliser des comptes et courses de test.
Lancer Metro avec `npx.cmd expo start --dev-client`, puis ouvrir l'application de développement installée.

| Scénario | Résultat attendu |
| --- | --- |
| Offre normale, application ouverte | Un écran d'appel ; Accepter ouvre le parcours de la course, y compris au statut assigned. |
| Deux appuis rapides, ou réponse écran + notification | Une seule réponse API et un seul retour à l'accueil. |
| Fermer le modal actif | L'accueil reste visible après les rafraîchissements ; Reprendre rouvre toujours le modal. |
| Appel au-dessus de l'accueil | Aucun modal natif du tableau de bord ne recouvre les boutons d'appel. |
| Nouvelle offre B pendant l'appel A | A reste affiché ; B apparaît en notification avec ses actions et son son. |
| Accepter B depuis sa notification | Les alertes sont arrêtées, la file est vidée et B est accessible depuis l'accueil. |
| Refuser A | La prochaine offre prend le relais, ou retour à l'accueil sans empiler celui-ci. |
| Offre prise par un autre livreur | Sonnerie et alerte supprimées lors du prochain contrôle ; aucune acceptation fictive. |
| Réaffectation admin avant récupération | Accepter passe de assigned à driver_to_pickup ; Refuser utilise le refus de réaffectation. |
| Transfert après récupération | Notification informative, puis confirmation « Colis reçu du précédent livreur ». |
| Échec réseau lors d'une réponse | Erreur visible et boutons utilisables pour réessayer. |
| Retour Android pendant un appel | L'audio est libéré quand l'écran perd le focus ; une offre non traitée peut rester dans la file. |
| Application en arrière-plan / téléphone verrouillé | Notification sonore et actions, puis reprise correcte dans l'application. |
| Abandon avant / après récupération | Avant : remise en attente. Après : incident et instructions des opérations, parcours de retour ou transfert accessible. |

Le canal sonore de référence reste `incoming-call` avec `new_course_ring`. Les tests simulés vérifient la configuration demandée, pas les réglages déjà enregistrés par Android sur le téléphone.
