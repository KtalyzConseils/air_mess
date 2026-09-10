# Tester l'app marchand AirMess sur iPhone via Codemagic

Le fichier [`codemagic.yaml`](../codemagic.yaml) (racine du dépôt) contient les
workflows des deux apps mobiles :

| Workflow | App | Résultat |
|---|---|---|
| `ios-release` | driver (`apps/driver-app`) | IPA signé App Store + TestFlight |
| `ios-test` | driver | IPA non signé (compilation seule) |
| `merchant-ios-testflight` | marchand (`apps/AirMess`) | IPA signé App Store + TestFlight |

Le workflow marchand a été calqué sur `ios-release` (qui fonctionne déjà pour le
driver) : même intégration App Store Connect, même groupe de variables, même
méthode de signature automatique.

---

## Prérequis

- Un **Apple Developer Program** actif : la signature App Store/TestFlight est
  impossible sans lui.
- La fiche app **App Store Connect** pour le bundle marchand
  `com.airmess.merchant` (l'app driver utilise `com.airmess.driver`).
- L'intégration Codemagic `codemagic` (clé API App Store Connect) déjà utilisée
  par les workflows driver.
- Le groupe de variables Codemagic **`ios_signing`**, déjà référencé par les
  workflows driver, auquel il faut ajouter **une** variable (voir étape 3).

## 1. Créer l'App ID et la fiche App Store Connect du marchand

1. [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list)
   → **Identifiers** → **+** → **App IDs** → **App**.
   - Description : `AirMess Merchant`
   - Bundle ID (explicit) : `com.airmess.merchant`
2. Ouvre ensuite `com.airmess.merchant` et coche la capacité
   **Push Notifications** (l'app marchand utilise `expo-notifications`), puis
   **Save**.
3. [App Store Connect](https://appstoreconnect.apple.com/apps) → **My Apps** →
   **+** → **New App** : plateforme iOS, nom `AirMess`, bundle ID
   `com.airmess.merchant`, SKU libre (ex. `airmess-merchant`).

Sans fiche app, l'étape TestFlight échoue.

## 2. Vérifier l'intégration Codemagic

Les workflows driver signent déjà leurs builds, donc l'intégration
`codemagic` (Team settings → Integrations → Developer Portal) et la variable
`CERTIFICATE_PRIVATE_KEY` du groupe `ios_signing` existent normalement déjà.

Dans le doute : Team settings → **Integrations** → **Developer Portal** doit
contenir une clé nommée `codemagic`, avec les droits **App Manager**.

## 3. Ajouter le GoogleService-Info.plist pour l'app marchand

Le plugin `@react-native-firebase/app` déclaré dans `apps/AirMess/app.json`
**refuse** de générer le projet iOS sans ce fichier (même si le code de l'app
ne l'utilise pas : aucun import Firebase dans `src/`, c'est un reste de
dépendance). Le workflow le décode depuis un secret Codemagic.

1. [Firebase Console](https://console.firebase.google.com/) → projet AirMess →
   **Ajouter une app** → **iOS** → bundle ID `com.airmess.merchant` →
   télécharge `GoogleService-Info.plist`.
2. Encode-le en base64 (PowerShell, depuis le dossier du fichier) :

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\GoogleService-Info.plist"))
```

3. Dans Codemagic → **ton application** → **Environment variables** → groupe
   **`ios_signing`** → ajoute la variable
   `GOOGLE_SERVICE_INFO_PLIST_BASE64` (coche **Secret**) et colle la chaîne
   base64. Le workflow accepte la valeur sur une ou plusieurs lignes.

> Variante utilisée par l'app driver : son `GoogleService-Info.plist` est
> versionné dans `apps/driver-app/` (`git add -f`) et référencé dans `app.json`.
> Si tu préfères la même approche pour le marchand, commite
> `apps/AirMess/GoogleService-Info.plist`, ajoute
> `"googleServicesFile": "./GoogleService-Info.plist"` dans `expo.ios` de
> `apps/AirMess/app.json` et supprime le secret + l'étape
> « Inject Firebase iOS config » du workflow.

## 4. Lancer le build

1. [codemagic.io](https://codemagic.io/apps) → application `air_mess` →
   branche `app-marchant-react-native`.
2. **Start new build** → workflow
   **AIRMESS Merchant - Signed TestFlight**.
3. Compter 20 à 40 min au premier build (npm ci, prebuild, pods, archive).

Le workflow est manuel : il ne se déclenche pas au push. Ajoute une section
`triggering` dans `codemagic.yaml` si tu veux l'automatiser.

## 5. Installer sur l'iPhone

1. App Store Connect → ton app `AirMess` → **TestFlight** →
   **Internal Testing** → crée un groupe et ajoute ton Apple ID.
2. Sur l'iPhone, installe l'app **TestFlight**, accepte l'invitation, puis
   installe le build (disponible après traitement Apple, de quelques minutes à
   une heure).

## Personnalisation

- **API ciblée** : `EXPO_PUBLIC_API_BASE_URL` dans le workflow. La valeur est
  intégrée au bundle JS au moment du build ; mets
  `https://dev.api.airmess-logistics.com/api` pour tester sur la préprod.
- **Numéro de build** : mis à jour automatiquement via `agvtool` avec le numéro
  de build Codemagic, donc chaque envoi TestFlight est unique.
- **TestFlight interne uniquement** (sans revue bêta Apple) : ajoute
  `--custom-export-options='{"testFlightInternalTestingOnly": true}'` à la
  commande `xcode-project use-profiles`.

## Dépannage

| Erreur | Cause / correction |
|---|---|
| `GOOGLE_SERVICE_INFO_PLIST_BASE64 absent` | Variable non ajoutée au groupe `ios_signing` (étape 3) |
| `Path to GoogleService-Info.plist is not defined` | Même cause : le secret n'a pas été injecté avant le prebuild |
| `No profiles for 'com.airmess.merchant' were found` | App ID ou fiche App Store Connect manquante (étape 1), ou clé API sans droits App Manager |
| `Provisioning profile doesn't include the aps-environment entitlement` | Coche **Push Notifications** sur l'App ID `com.airmess.merchant` puis relance |
| `npm ci` échoue | `package.json` et `package-lock.json` désynchronisés : lancer `npm install` en local et commiter le lockfile |
| Échec des pods au premier build | Relancer le workflow : le cache CocoaPods n'est pas encore chaud |
| Le build apparaît dans TestFlight mais l'app plante au lancement | Vérifier que `EXPO_PUBLIC_API_BASE_URL` pointe vers une API joignable depuis l'iPhone |
