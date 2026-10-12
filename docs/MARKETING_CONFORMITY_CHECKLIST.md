# Checklist conformité marketing — AirMess

> État constaté le 22 septembre 2026. Légende : ✅ présent · ⚠️ partiel / à corriger · ❌ manquant.

## 1. SEO technique (landing `airmess-logistics.com`)

- ✅ `robots.txt` avec `Sitemap:` (`apps/landing/public/robots.txt`)
- ✅ `sitemap.xml` avec entrées image (`apps/landing/public/sitemap.xml`)
- ✅ `canonical`, `meta robots`, `google-site-verification`
- ✅ `<title>` + `meta description` (`apps/landing/index.html`)
- ✅ Open Graph + Twitter Card + JSON-LD `Organization`
- ✅ `og.png` présent (`apps/landing/public/og.png`) — ⚠️ vérifier les dimensions réelles 1200×630
- ✅ favicon + apple-touch-icon + icônes PWA
- ⚠️ `theme-color` incohérent : `#141414` (landing) vs `#1A1614` (marchant-web)
- ⚠️ `<title>` marchant-web nu « Air Mess » sans `meta description` (moins critique : app authentifiée)

## 2. Analytics & conversion

- ✅ GA4 `G-KVMJQF9J8Z` chargé sur landing **et** marchant-web
- ✅ Events de clic sur la landing : `click_register_driver`, `click_register_sender`, `click_whatsapp`, `click_download_driver_app`
- ✅ Page views SPA via `AnalyticsTracker` (marchant-web)
- ⚠️ **Double `page_view` probable** sur marchant-web au chargement initial (script inline de `index.html` **+** `AnalyticsTracker`)
- ❌ Events de **soumission** des formulaires (`submit_merchant`, `submit_driver`)
- ❌ Events de **jalons produit / valeur** : compte créé, 1re course validée, CA, par source `src`
- ❌ Liaison GA4 ↔ Firebase Analytics des apps mobiles (attribution cross-device / campagne)
- ❌ Tableau de bord **CAC marchand** et **coût par course** branché sur ces events (exigence du cahier des charges)

## 3. Marque & coordonnées de contact

- ⚠️ Nom incohérent : « AIRMESS », « Airmess », « Air Mess », « AirMess »
- ❌ Email incohérent : `contact@rmess.app` (coquille, refonte) vs `support@airmess-logistics.com` (`apps/landing/src/config.ts`)
- ⚠️ Numéro WhatsApp divergent : `+229 01 40 26 57 57` vs `22994180794`
- ✅ `apps/landing/src/config.ts` est le bon candidat pour figer ces valeurs — les propager partout

## 4. Légal & conformité (loi béninoise 2017-20, APDP)

- ✅ Pages `Terms` et `Privacy` existent (`apps/marchant-web/src/pages/legal/`)
- ⚠️ Contenu à auditer : séparation réponses/identité, durées de conservation, droits des personnes (exigé par `docs/ouverture-compte-livreur-enquete.md`)
- ❌ **Formalités APDP** à accomplir avant mise en ligne (spec ouverture de compte)
- ⚠️ CGU Livreur : ajouter l'article sur le statut « En liste d'attente » (aucun droit à une course, durée de l'invitation, conditions du bonus, cas d'annulation)
- ⚠️ Mentions « bonus 500 FCFA » : si la condition de déblocage change (ajout « 1re course validée »), mettre à jour `bonusRules` du formulaire et les CGU **avant** mise en ligne

## 5. Preuve sociale & conversion

- ✅ Logos partenaires (Bénin SuperMarché, Cotonou Pizza, …)
- ❌ Chiffres concrets (courses livrées, délai moyen, zones couvertes)
- ❌ Témoignages marchands / note de confiance
- ❌ Mise en avant du **bouclier encaissement** comme message n°1 (« vous ne courez plus après votre argent »)

## 6. Performance (seuils du cahier des charges)

- ⚠️ Web < 3 s en 3G — non vérifié (intégrer Lighthouse en CI)
- ⚠️ App livreur < 4 s sur entrée de gamme — non vérifié (budget de bundle)
- ⚠️ API < 500 ms p95 — non mesuré

## 7. Hygiène des assets

- ⚠️ Images dupliquées entre `docs/`, `apps/landing/public/images/` et `apps/marchant-web/public/images/`
- ❌ Fichiers lourds en vrac à la racine : `recrutement_livreurs.jpg`, PNG ChatGPT 2 Mo, `exports/`, `favicon_io/`, `.codex-repl-probe.txt`
- → déplacer vers un dossier dédié hors Git (ou Git LFS), dé-dupliquer, nettoyer

## 8. Ordre de traitement recommandé

1. **Bloquant légal** : formalités APDP + compléter Privacy/CGU (section 4).
2. **Bloquant marque** : figer nom + email + WhatsApp dans `config.ts` et corriger les incohérences (section 3).
3. **Conversion** : events de soumission + jalons produit + tableau de bord CAC/coût par course (section 2).
4. **Preuve sociale** : chiffres + témoignages (section 5).
5. **Hygiène** : nettoyage des assets (section 7).
