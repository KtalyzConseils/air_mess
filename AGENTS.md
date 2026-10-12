# Règles de contribution AirMess

Ces règles s'appliquent à toute personne et à tout agent IA avant de modifier ce dépôt.

## Précontrôle obligatoire

1. Vérifier la branche et l'état du dépôt avec `git status -sb`.
2. Récupérer l'état distant avec `git fetch origin`, puis comparer la branche locale à sa branche distante.
3. Intégrer les changements distants avant de coder. Ne jamais écraser les modifications locales ou celles d'un collaborateur.
4. Lire les commits récents (`git log --oneline --decorate -15`) et le diff du dernier changement lié au sujet.
5. Rechercher l'existant avec `rg` dans le back-end, les applications, les migrations, les routes, les tests et les traductions.
6. Écrire un constat bref avant l'implémentation :
   - ce qui existe déjà ;
   - ce qui manque réellement ;
   - la décision : réutiliser, compléter, corriger, migrer ou remplacer ;
   - les doublons qui seront supprimés ou conservés volontairement.
7. Ne créer aucun nouveau service, composant, endpoint, table, migration ou règle métier tant qu'une extension de l'existant est possible.
8. Si deux implémentations se chevauchent, arrêter l'ajout et proposer d'abord une source de vérité unique et un plan de migration.
9. Ajouter ou adapter un test qui démontre l'absence de double application du comportement.
10. Avant le commit, refaire `git fetch`, vérifier les conflits fonctionnels avec les nouveaux commits distants, lancer les tests ciblés et résumer les fichiers touchés.

## Règles de sécurité des données

- Toute opération sur la production commence par un audit strictement en lecture seule.
- Aucun correctif financier ne doit modifier directement un solde sans reconstruire les paiements, réservations, courses, gains, ajustements et écritures associés.
- Toute correction de production exige une sauvegarde, une simulation avant/après, une liste explicite des identifiants ciblés et l'accord du responsable.
- Préférer des écritures compensatoires et auditables aux suppressions d'historique.
- Ne jamais inclure de secret, fichier Firebase, `.env`, export de base ou donnée personnelle dans un commit.

## Cartographie métier à consulter

La cartographie des fonctions sensibles et leurs sources de vérité se trouve dans `docs/FUNCTIONAL_OWNERSHIP.md`. Elle doit être mise à jour lorsqu'une nouvelle fonction transverse est introduite.

