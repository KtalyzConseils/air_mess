# AirMess — Landing

Public marketing site for **AirMess** (a KTALYZ product). Standalone app: it owns its
own build and deploy, and links out to the AirMess app (`marchant-web`) for sign-up and login.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- `react-i18next` — bilingual **FR (default) / EN**

## Develop

```bash
npm install
npm run dev      # http://localhost:5174
```

## Configuration

CTAs point at the deployed AirMess app via a single build-time variable:

| Variable        | Purpose                                  | Default (dev)            |
| --------------- | ---------------------------------------- | ------------------------ |
| `VITE_APP_URL`  | Base URL of the AirMess app (marchant-web) | `http://localhost:5173`  |

Copy `.env.example` to `.env` and set it, or pass it as a build arg (see `Dockerfile`).
Outbound links are centralised in [`src/config.ts`](src/config.ts):
`/login`, `/register` (senders), `/register/driver` (couriers).

## Internationalisation

- French is the default and the fallback language for the primary market.
- The visitor's language is detected from `localStorage` (`rmess_lang`) or the browser, and `<html lang>` stays in sync.
- All copy lives in [`src/locales/en.ts`](src/locales/en.ts) and [`src/locales/fr.ts`](src/locales/fr.ts);
  `fr.ts` is typed against `en.ts`, so a missing key fails the build.

## Build & deploy

```bash
VITE_APP_URL=https://app.airmess-logistics.com npm run build   # outputs dist/
```

Production is served by Caddy from `dist/` (see `Dockerfile` + `Caddyfile`), mirroring
`marchant-web`. Deploy as a separate service on its own (sub)domain, e.g. `airmess-logistics.com`
for the landing and `app.airmess-logistics.com` for the app.
