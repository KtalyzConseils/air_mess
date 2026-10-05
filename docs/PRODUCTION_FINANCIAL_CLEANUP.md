# Assainissement des données financières de production

## Principe

Le nettoyage ne consiste pas à remettre les wallets à zéro. Une recharge sandbox peut avoir financé une course, créé une réservation, payé un livreur et généré des ajustements. Toute la chaîne doit être reconstruite avant correction.

## Phase 1 — audit en lecture seule

Réutiliser d'abord l'outil existant `/admin/reconciliation` et son export CSV. Il fournit déjà les snapshots, flux et dérives de wallets ; il ne faut pas créer un second système de rapprochement. L'audit sandbox devra compléter cet outil avec la traçabilité FedaPay manquante.

Pour chaque paiement FedaPay suspect, relever : identifiant interne, `provider_ref`, utilisateur, type, montant, statut, dates, métadonnées et réponse brute. Retrouver ensuite :

- les écritures du wallet utilisateur ;
- les courses liées et leur état ;
- les montants réservés ou débités ;
- les gains et écritures du wallet livreur ;
- les commissions, retraits, remboursements et ajustements ;
- les incidents liés.

Classer chaque chaîne en `sandbox_certain`, `réel_certain` ou `ambigu`. Une donnée ambiguë ne doit jamais être corrigée automatiquement.

## Limite actuelle importante

Le modèle `payments` n'enregistre pas explicitement l'environnement FedaPay utilisé au moment de la création. Une référence seule ne suffit donc pas toujours à prouver qu'une transaction était sandbox. L'audit devra croiser les réponses brutes, les références du tableau de bord FedaPay, les dates de bascule et les comptes de test connus.

## Phase 2 — simulation

Produire, sans écrire en base, un tableau avant/après par utilisateur, wallet et course. Vérifier les invariants : sommes disponibles, réservations, débits de courses et gains livreurs.

La section `sandbox_audit` de `/admin/reconciliation` est recalculée sur la base courante et fournit un `snapshot_token`. Un export ancien ou une copie locale ne doit jamais autoriser une correction. Toute future commande d'application devra recalculer ce jeton dans sa transaction et refuser l'opération s'il diffère du jeton explicitement validé.

L'application depuis l'admin suit obligatoirement deux étapes : préparation du plan, puis confirmation par un code temporaire à six chiffres lié au super-admin, au jeton et au contenu exact du plan. Le code expire après dix minutes et est invalidé après cinq erreurs ou après son utilisation. Les montants réservés par une course active sont différés et ne doivent jamais être débités par la compensation.

## Phase 3 — correction validée

Après sauvegarde et validation humaine de la liste exacte : exécuter une transaction atomique, créer des écritures compensatoires portant un identifiant d'opération, conserver les historiques sources, puis générer un rapport final. Aucun script ne doit sélectionner des lignes uniquement par date ou par montant.

## Prévention

Ajouter à terme un champ immuable `provider_environment` (`sandbox` ou `live`) à chaque paiement lors de sa création. Ce changement nécessite une migration et une stratégie explicite pour les paiements historiques, qui resteront `unknown` tant qu'ils ne sont pas vérifiés.
