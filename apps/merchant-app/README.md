# Air Mess — Merchant App (Expo)

Application mobile **marchand + particulier**, miroir du `driver-app`, branchée sur la même API Laravel (`/courses`, `/me/wallet`, etc.).

La PWA `marchant-web` reste en production en parallèle.

## Décisions produit

| Sujet | Choix |
|-------|--------|
| Stack | Expo 56 + expo-router + NativeWind (comme driver) |
| Audience | `marchant` **et** `individual` |
| Cartes | `react-native-maps` (création course — prochaine itération) |
| Paiement | WebView Fedapay + callback `/payments/return-to-app` |
| OTP inscription | Firebase Phone Auth (comme `marchant-web`) |
| Deep link | `airmess-merchant://` |

## Démarrage

```bash
cd apps/merchant-app
cp .env.example .env   # ajuster EXPO_PUBLIC_API_BASE_URL
npm install
npx expo start
```

- Émulateur Android → `http://10.0.2.2:8000/api`
- Device physique → IP LAN du PC

Push notifications : **dev build** requis (pas Expo Go).

## Structure

```
src/
  app/           # expo-router (login, register, payment, tabs)
  api/           # client axios + courses / wallet / notifications
  stores/        # auth Zustand + SecureStore
  lib/firebase.ts
```

## Scaffold vs prochaines itérations

**Déjà en place**
- Login (gate `marchant` \| `individual`)
- Register (formulaire + token Firebase — OTP UI à brancher)
- Dashboard, liste courses, wallet `/me/wallet`, notifications, profil
- Paiement Fedapay in-app

**À faire ensuite**
1. Widget OTP Firebase natif (reCAPTCHA / `@react-native-firebase/auth`)
2. Création de course (carte dual-pin, estimate, adresse book)
3. Détail course + cancel / incident
4. EAS projectId + `google-services.json` dédiés
5. Optionnel : `GET /payments/return-to-app` → deep link `airmess-merchant://wallet`

## Lien avec le driver-app

Réutilisé : UI kit, auth SecureStore, payment WebView, push `/device-tokens`, brand splash.

Retiré : GPS background, Notifee full-screen, availability, incoming-course, wallet `/driver/wallet`.
