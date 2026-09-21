# Build the marketing landing (Vite) then serve it statically via Caddy.

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_APP_URL is baked into the bundle AT BUILD TIME (Vite freezes it).
# Point it at the deployed AirMess app (https://app.airmess-logistics.com).
ARG VITE_APP_URL
ENV VITE_APP_URL=$VITE_APP_URL
ARG VITE_API_BASE_URL=https://api.airmess-logistics.com/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_DRIVER_DEMO_MODE=false
ENV VITE_DRIVER_DEMO_MODE=$VITE_DRIVER_DEMO_MODE
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
