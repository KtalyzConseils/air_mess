# Migration du package Android `com.anonymous.driver`

> Statut : **bloqué sur coordination externe** (Firebase + Google Cloud + décision sur les installations existantes). Ce document est le runbook prêt à exécuter une fois la décision prise.

## 1. Pourquoi ce n'est pas un simple renommage

Le package Android est utilisé à **trois endroits externes** qui doivent être mis à jour en même temps :

1. **Firebase** — `apps/driver-app/google-services.json.example` contient `package_name: "com.anonymous.driver"`. Le vrai `google-services.json` est géré par secret EAS (`GOOGLE_SERVICES_JSON`).
2. **Google Maps SDK** — la clé est documentée comme restreinte au package `com.anonymous.driver` + SHA-1 (`apps/driver-app/app.config.js`).
3. **Installations existantes** — l'APK est déjà distribué (`apps/landing/src/config.ts` pointe vers un APK Expo) ; changer le package = nouvelle identité d'app (réinstallation, perte des tokens push, et si un jour sur Play Store : nouvelle fiche).

## 2. Prérequis avant de commencer

- [ ] Accès console Firebase (projet du driver-app) pour ajouter un app Android `com.airmess.driver`.
- [ ] Accès Google Cloud Console pour mettre à jour la restriction de la clé Maps (nouveau package + SHA-1 du nouveau build).
- [ ] Décision : l'app est-elle déjà publiée (Play Store) ou seulement en APK ? (détermine si le package est immuable).
- [ ] Accès aux secrets EAS (`GOOGLE_SERVICES_JSON`, `GOOGLE_MAPS_ANDROID_KEY`).

## 3. Étapes (ordre strict)

1. **Firebase** : ajouter l'app Android `com.airmess.driver`, télécharger le nouveau `google-services.json`.
2. **Google Cloud** : sur la clé Maps, remplacer la restriction `com.anonymous.driver` + SHA-1 par `com.airmess.driver` + SHA-1 du nouveau build.
3. **EAS** : mettre à jour le secret `GOOGLE_SERVICES_JSON` avec le nouveau fichier.
4. **Code** : remplacer dans `apps/driver-app/app.json` le champ `package: "com.anonymous.driver"` → `"com.airmess.driver"`.
5. **Code** : mettre à jour le commentaire de restriction Maps dans `apps/driver-app/app.config.js`.
6. **Exemple** : mettre à jour `apps/driver-app/google-services.json.example` (`package_name` + placeholders).
7. **Build & test** : nouveau build, vérifier réception push (FCM), affichage carte (Maps), connexion (Firebase Auth).
8. **Distribution** : communiquer aux livreurs la nouvelle APK (ancienne APK ne recevra plus de push).

## 4. Risques

- Faire l'étape 4 sans les étapes 1-3 = **push et Maps cassés** immédiatement.
- Si l'app est déjà sur Play Store, le package est **immuable** : on ne peut pas le renommer, il faut créer une nouvelle app.
- Perte des tokens push des appareils déjà installés.

## 5. Alternative (à évaluer)

Si l'effort de migration ne se justifie pas maintenant (pas encore de lancement public Play Store), **conserver `com.anonymous.driver`** à court terme et ne le renommer que lors de la préparation Play Store. Le coût du renommage reste le même, mais il est alors synchronisé avec le reste de la mise en production.
