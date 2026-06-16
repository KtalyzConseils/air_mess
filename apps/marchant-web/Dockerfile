# Build du SPA marchand/admin (Vite) puis service statique via Caddy.

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_BASE_URL est injectée AU BUILD (Vite la fige dans le bundle).
# Railway passe automatiquement la variable de service comme build arg homonyme.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
