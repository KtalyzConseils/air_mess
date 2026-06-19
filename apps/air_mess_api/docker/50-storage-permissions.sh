#!/usr/bin/env sh
# Le Volume Railway est monté sur /var/www/html/storage/app et appartient à root
# au démarrage. On rend la propriété à www-data pour que l'application puisse y
# écrire (uploads CNI / permis / photo des livreurs via Storage::disk('local')).
# Exécuté en root par l'entrypoint serversideup à chaque démarrage du conteneur.
chown -R www-data:www-data /var/www/html/storage 2>/dev/null || true
