# Page — Tableau de bord marchand (`/dashboard`)

> Override de page pour `design-system/airmess-commercants/MASTER.md`.
> Ce fichier est prioritaire sur le MASTER pour cet écran uniquement.

## 1. Objectif de l'écran

Répondre, sans scroller ni cliquer, à trois questions du marchand :

1. **Où sont mes colis ?** → bande de KPI + liste des livraisons actives avec statut lisible.
2. **Y a-t-il un problème qui m'attend ?** → bandeau « en attente d'attribution », alerte wallet bas.
3. **Puis-je lancer une nouvelle course ?** → CTA principal unique.

## 2. Structure (haut → bas)

| # | Bloc | Contenu | Règles |
|---|---|---|---|
| 0 | Modales | Validation de compte, bonus, CGU, onboarding | Bloquantes si nécessaire ; le contenu reste lisible derrière |
| 1 | Bandeau d'état | Compte en attente (warning) · bon de bienvenue (brand) | Un seul bandeau visible à la fois |
| 2 | En-tête | `PageEyebrow` + « Bonjour, <raison sociale>. » + sous-titre avec un mot `Highlight` | Un seul `Highlight`, un seul `PageEyebrow` |
| 3 | État des données | Pastille `live` ou `warning` (périmé) + « Actualisé à HH:MM » + bouton pause/reprise | Voir MASTER §6 |
| 4 | Wallet + CTA | Solde disponible, réservé en cours, badge « wallet bas », `Card elevated` + CTA `primary` | Un seul CTA `primary` de l'écran |
| 5 | Bande de KPI | 5 tuiles : Aujourd'hui · En cours · En attribution · Livrées (mois) · CA du mois | `KpiCard`, icône SVG, `tabular-nums`, tuile « En cours » en accent `brand` |
| 6 | Livraisons actives | Titre + « Voir tout », lignes cliquables, squelette au chargement, état vide avec action | 5 lignes max, tri par récence |
| 7 | Région de statut | Phrase complète annonçant le nombre de livraisons actives et la dernière action | `role="status"`, `aria-atomic`, invisible à l'œil |

## 3. Une ligne de livraison

| Zone | Contenu | Contrainte |
|---|---|---|
| Gauche | `StatusBadge` | Variant issu de la table MASTER §2.3 |
| Milieu haut | Référence `AMS-…` en `font-mono` | `tabular-nums` |
| Milieu | `origine → destination` | Tronquée sur mobile, valeur complète en `title` |
| Milieu bas | Destinataire · nom du livreur, ou **« Livreur en recherche »** si aucun livreur | Pas de ligne vide : toujours un état explicite |
| Droite | Montant `delivery_fee` + mention « + collecte N FCFA » si `has_collection` | `tabular-nums`, unité FCFA lisible |
| Droite | Bouton copier le lien de suivi | ≥ 44 px, `aria-label` explicite, ✓ + annonce après copie |

Toute la ligne est un `<button>` unique (clavier : Entrée/Espace). Le bouton « copier » est imbriqué
et stoppe la propagation du clic.

## 4. États

| État | Rendu |
|---|---|
| Chargement | 3 lignes squelettes (`animate-pulse motion-reduce:animate-none`), bande de KPI en tirets |
| Vide | « Aucune course en cours. » + bouton « Créer ma première course » si l'historique est vide, sinon « Créer une course » |
| Erreur | Carte `danger` + « Réessayer » |
| Périmé | Pastille `warning` + « Données en retard » ; le reste de l'écran reste lisible |
| Actualisation en pause | Bouton en état `aria-pressed="false"`, libellé « Reprendre » |

## 5. Textes (clés i18n `dashboard.*`)

`eyebrow`, `greeting`, `subtitleStart|subtitleHighlight|subtitleEnd`, `liveLabel`, `updatedAt`,
`staleLabel`, `pauseRefresh`, `resumeRefresh`, `refreshPaused`, `kpiLabel`, `walletLabel`,
`activeDeliveries`, `seeAll`, `searchingDriver`, `collectInline`, `copyTracking`, `copiedNotice`,
`loadingRows`, `loadError`, `noActive`, `createFirst`, `createNew`, `retry`,
`activeCountOne|activeCountMany`, `kpiToday|kpiTodayHint`, `kpiInProgress`, `kpiAwaiting|kpiAwaitingHint`,
`kpiDeliveredMonth`, `kpiRevenueMonth|kpiRevenueHint`.

Aucune chaîne en dur dans le composant. Aucun emoji dans une valeur i18n utilisée comme icône
(les anciens libellés `createCourse` / `collect` sont nettoyés).

## 6. Critères d'acceptation

- [ ] Aucun emoji visible sur l'écran
- [ ] L'heure de mise à jour est affichée et l'état périmé est visible après ~90 s sans succès
- [ ] Le bouton pause/reprise coupe réellement l'actualisation automatique
- [ ] Le nombre de livraisons actives est annoncé par une phrase complète
- [ ] Squelettes au chargement, action proposée en cas de vide, « Réessayer » en cas d'erreur
- [ ] Copie du lien de suivi : ✓ immédiat + annonce
- [ ] Testé à 375 / 768 / 1024 / 1440, clavier seul, `prefers-reduced-motion`
- [ ] Un seul CTA `primary`
