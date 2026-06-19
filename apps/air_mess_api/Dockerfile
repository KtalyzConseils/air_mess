# Image de production de l'API RMess (Laravel 13) pour Railway.
# Base serversideup : php-fpm + nginx déjà configurés pour Laravel en prod.
FROM serversideup/php:8.3-fpm-nginx

# Railway termine le TLS en amont : on sert en HTTP simple derrière son proxy.
ENV SSL_MODE=off

# Optimisations Laravel exécutées au démarrage du conteneur (env disponible à ce moment).
# Les MIGRATIONS ne sont PAS lancées ici : elles passent par la pre-deploy command
# de Railway (voir railway.json) pour éviter les races en multi-instances.
ENV AUTORUN_ENABLED=true
ENV AUTORUN_LARAVEL_MIGRATION=false
ENV AUTORUN_LARAVEL_CONFIG_CACHE=true
ENV AUTORUN_LARAVEL_ROUTE_CACHE=true
ENV AUTORUN_LARAVEL_EVENT_CACHE=false
ENV AUTORUN_LARAVEL_VIEW_CACHE=false

# Driver PostgreSQL (la base Railway est un Postgres).
USER root
RUN install-php-extensions pdo_pgsql pgsql
USER www-data

WORKDIR /var/www/html
COPY --chown=www-data:www-data . .

RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# Script de démarrage : rend le Volume Railway (storage/app) inscriptible par www-data.
# L'entrypoint serversideup exécute les scripts de /etc/entrypoint.d/ en root au boot.
USER root
RUN cp /var/www/html/docker/50-storage-permissions.sh /etc/entrypoint.d/50-storage-permissions.sh \
    && sed -i 's/\r$//' /etc/entrypoint.d/50-storage-permissions.sh \
    && chmod +x /etc/entrypoint.d/50-storage-permissions.sh
USER www-data

# Le webroot par défaut de l'image est /var/www/html/public, le serveur écoute sur 8080.
# Healthcheck Railway : GET /up (défini dans bootstrap/app.php).
