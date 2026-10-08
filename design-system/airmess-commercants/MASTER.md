# Design System — Plateforme commerçants AIRMESS

> **Portée** : couche *application* de l'espace marchand (`apps/marchant-web`) — les écrans
> d'exploitation quotidienne du marchand : tableau de bord, courses, carnet d'adresses, wallet,
> notifications, profil.
>
> **Source de vérité** : ce fichier est généré avec la skill `ui-ux-pro-max`, puis **réconcilié** avec
> `docs/AIRMESS_DESIGN_SYSTEM.md` (doc canonique du dépôt) et avec les tokens réellement compilés dans
> `apps/marchant-web/src/index.css` (`@theme` Tailwind v4).
>
> **En cas de conflit** sur une couleur de marque, une police, un rayon ou une ombre : le doc canonique
> gagne. Ce fichier n'ajoute que les règles propres aux écrans d'exploitation marchand.

## 0. Entrées de la skill

| Paramètre | Valeur |
|---|---|
| Requête design system | `logistics merchant back-office dashboard operations packages delivery` |
| Dials | `--density 8` (dense / dashboard) |
| Pattern résolu | *Real-Time / Operations* — **adapté** en *console d'exploitation* (pas de section marketing, uniquement de l'état opérationnel) |
| Style résolu | *Minimalism & Swiss Style* — contraste élevé, grille, hiérarchie par la taille et l'espace, zéro décoration |
| Effets résolus | Hover sobre 150–250 ms, transitions douces, ombres discrètes, hiérarchie typographique nette |

**Écarts assumés vis-à-vis de la sortie brute de la skill**

| Proposition de la skill | Décision | Raison |
|---|---|---|
| Primaire `#2563EB` (tracking blue) + accent `#EA580C` | **Écartée** | Marque verrouillée (`#FFCC00` / `#D40511` / `#1A1614`). Le jaune porte le CTA, le rouge porte le « live » et le danger. |
| Polices `Fira Sans` / `Fira Code` | **Écartée** | Une seule police de marque : `Manrope` (décision `Plus Jakarta Sans` en attente — doc canonique §3.1). |
| Fond `#EFF6FF` (bleu très clair) | **Écartée** | Les neutres chauds (`cream` / `off-white` / `warm-*`) portent l'identité. |
| « Dark mode support » | **Reporté** | Doc canonique §4 : ouvrir le dark mode après stabilisation du light, avec paires de tokens vérifiées. |

## 1. Profil produit

- **Utilisateur** : commerçant (boutique, restaurant, pharmacie, e-commerce local) ou particulier qui
  expédie régulièrement. Souvent en mobilité, connexion instable, téléphone Android d'entrée de gamme.
- **Tâches principales**, par fréquence : créer une course · suivre les courses en cours · savoir si un
  livreur a été trouvé · vérifier le solde wallet · retrouver une course passée.
- **Charge cognitive** : les chiffres et les statuts dominent. Objectif = **lecture en 3 secondes** :
  où sont mes colis, y a-t-il un problème, ai-je assez d'argent.
- **Conséquence** : densité élevée assumée (density 8), chiffres en `tabular-nums`, statuts jamais portés
  par la seule couleur, aucun graphique décoratif.

## 2. Couleurs

Tokens = ceux de `apps/marchant-web/src/index.css`. Aucune couleur brute (palette Tailwind par défaut)
dans un composant marchand.

### 2.1 Rôles

| Rôle | Token | Usage dans l'espace marchand |
|---|---|---|
| Action principale | `airmess-yellow` `#FFCC00` | CTA « Créer une course », tuile KPI mise en avant |
| Live / danger / alerte | `airmess-red` `#D40511` | Pastille « live » des courses en cours, erreurs, actions destructives |
| Chrome | `airmess-dark` `#1A1614` | Barre d'en-tête, sections d'ancrage |
| Texte | `ink` `#0A0908` sur clair, `cream` / `off-white` sur sombre | Valeurs, titres, libellés |
| Surface de page | `cream` `#FAF7F0` | Fond d'écran |
| Surface de contenu | `off-white` `#FDFCF9` | Cartes, listes, modales |
| Séparateurs | `warm-200` / `warm-300` | Bordures de cartes, séparateurs de listes |
| Texte secondaire | `warm-500` / `warm-600` | Indices, métadonnées (jamais sous 4.5:1) |

### 2.2 Sémantique d'état

| État | Texte | Fond | Sens produit |
|---|---|---|---|
| `success` | `#15803D` | `#DCFCE7` | Livré, encaissé, validé |
| `warning` | `#EA580C` | `#FFEDD5` | En préparation, compte à valider, wallet bas |
| `info` | `#0369A1` | `#DBEAFE` | En attente d'un livreur |
| `danger` | `#D40511` | `#FEE2E2` | Échec, litige, incident |
| `neutral` | `warm-600` | `warm-100` | Annulé, inactif, terminé sans suite |

### 2.3 Table statut de course → variant

Source unique : `apps/marchant-web/src/components/StatusBadge.tsx` (qui délègue à `ui/Badge`).

| Statut API | Variant | Motif |
|---|---|---|
| `pending_preparation` | `warning` | Rien n'est encore parti |
| `awaiting_assignment` | `info` | File d'attribution |
| `assigned` | `brand` | Un livreur est engagé |
| `driver_to_pickup` · `at_pickup` · `picked_up` · `at_dropoff` | `live` | Colis en mouvement — pastille qui pulse |
| `delivered` | `success` | Terminé |
| `cancelled` | `neutral` | Terminé sans livraison |
| `failed` · `disputed` | `danger` | Problème |

> Règle : `live` est **réservé aux courses physiquement en cours**. Jamais sur un statut immobile,
> sinon « live » ne veut plus rien dire.

## 3. Typographie

- **Police** : `Manrope` (`--font-sans`, `--font-display`), graisses 400/500/700/800.
- **Chiffres** : `tabular-nums` **obligatoire** pour tout montant, compteur, heure, référence.
- **Échelle utilisée dans l'espace marchand** :

| Rôle | Token | Où |
|---|---|---|
| Titre de page | `text-h1` | « Bonjour, <raison sociale>. » |
| Titre de section | `text-h2` | « Vos livraisons actives » |
| Valeur KPI | `text-h2` | Tuiles KPI (36 px débordent en grille 5 colonnes avec un CA à 7 chiffres) |
| Corps | `text-body` / `text-body-s` | Lignes de course, indices |
| Libellés | `text-eyebrow` / `text-caption` | Étiquettes majuscules, pastilles |
| Référence de course | `text-caption` + `font-mono` | `AMS-2F8K1` |

Longueur de ligne : 60–75 caractères sur desktop, jamais un paragraphe pleine largeur.
Pas de troncature silencieuse : toute valeur coupée reste accessible via `title` ou l'écran de détail.

## 4. Densité, grille, espacement

- Échelle d'espacement 4/8 : `4 · 8 · 12 · 16 · 24 · 32 · 48`.
- Conteneur : `max-w-7xl` + `px-4 md:px-6`, `py-8 md:py-12`.
- Grille du tableau de bord : `md:grid-cols-3` (bandeau), `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`
  (bande de KPI), `lg:grid-cols-3` en 2/1 (corps).
- Ruptures : 375 / 768 / 1024 / 1440.
- Une ligne de course est un seul `<button>` plein, hauteur **≥ 44 px**.
- Pas de double barre de défilement : la page défile, pas les cadres.

## 5. Composants

| Composant | Fichier | Règle |
|---|---|---|
| `Card` | `components/ui/Card.tsx` | `default` = listes/sections · `elevated` = wallet, bloc focus · `signature` = 1 par écran max |
| `Button` | `components/ui/Button.tsx` | **Un seul CTA `primary` par écran.** Secondaires en `secondary`/`ghost`, destructif en `danger` |
| `Badge` | `components/ui/Badge.tsx` | Pastille d'état. `dot` = indicateur non coloré. `live` = pulse coupé sous `prefers-reduced-motion` |
| `StatusBadge` | `components/StatusBadge.tsx` | Statut de course → `Badge`. Aucun statut stylé ailleurs |
| `KpiCard` | `components/KpiCard.tsx` | Tuile de chiffre clé : `label` + `value` + `hint` + `icon` + `accent` |
| `PageEyebrow` | `components/ui/PageEyebrow.tsx` | Une fois par page, en haut |
| `Highlight` | `components/Highlight.tsx` | Un mot surligné par titre, jamais dans le corps |
| Icônes | `components/ui/icons.tsx` | SVG inline `strokeWidth 1.75`, `currentColor`, `aria-hidden` par défaut |

**Interdits de composition**

- Aucun emoji comme icône structurelle (navigation, statut, action, titre) : ils ne se colorent pas, ne
  s'alignent pas et varient selon la plateforme.
- Aucune palette Tailwind par défaut (`text-gray-500`, `bg-blue-100`, `border-gray-200`) : uniquement les
  tokens `ink` / `warm-*` / brand / sémantiques.
- Aucun statut porté par la couleur seule : couleur **+** texte (+ point ou icône).

## 6. Temps réel : ce qui a le droit de s'appeler « live »

Une donnée ne peut être présentée comme « live » que si trois conditions sont réunies :

1. **Source fraîche** : la requête qui l'alimente tourne réellement (aucune valeur figée).
2. **Heure de mise à jour visible** : « Actualisé à 14:32 ».
3. **État périmé explicite** : au-delà de ~90 s sans succès, le badge passe de `live` à `warning` avec
   « Données en retard ».

Compléments obligatoires :

- **Contrôle de fréquence** : bouton pause/reprise de l'actualisation automatique (`aria-pressed`).
- **Annonce contextuelle** : les compteurs qui changent sont annoncés par une phrase complète dans une
  seule région `role="status"` `aria-atomic` (« 3 livraisons actives »), sans déplacer le focus.
- **Aucun travail hors écran** : l'actualisation s'arrête quand l'onglet est masqué.
- **Mouvement réduit** : sous `prefers-reduced-motion`, la pastille `live` ne pulse plus.

## 7. États, retour et accessibilité

- **Chargement** : squelette de la forme finale (`animate-pulse motion-reduce:animate-none`), jamais un
  écran vide ni un spinner seul au-delà de 1 s.
- **Vide** : une phrase + l'action qui débloque la situation.
- **Erreur** : message lisible + bouton « Réessayer », jamais un code seul.
- **Copie** : retour visuel immédiat (icône ✓) **et** annonce dans la région de statut.
- Contraste : texte ≥ 4.5:1, bordures et icônes porteuses de sens ≥ 3:1.
- Focus : anneau jaune global (`*:focus-visible`) conservé, jamais supprimé.
- Toute action est atteignable au clavier ; une ligne de liste est un vrai `<button>`.

## 8. Anti-patterns à refuser en revue

- Un statut « en direct » sans heure de mise à jour ni état périmé.
- Une carte KPI sans unité ni période (« CA » tout court).
- Un graphique dont l'information n'existe qu'en couleur.
- Un écran qui recharge en boucle sans indication.
- Deux implémentations de la même pastille de statut.
- Une animation décorative sur un écran d'exploitation.

## 9. Carte des écrans de l'espace marchand

| Écran | Route | Rôle |
|---|---|---|
| Tableau de bord | `/dashboard` | Vue d'ensemble : à faire maintenant, chiffres du jour, wallet |
| Nouvelle course | `/courses/new` | Formulaire de commande |
| Mes courses | `/courses` | Historique filtrable |
| Détail de course | `/courses/:id` | Suivi, code de remise, incident |
| Carnet d'adresses | `/addresses` | Réexpédition en deux clics |
| Wallet | `/wallet` | Solde, recharge, retrait, historique |
| Notifications | `/notifications` | Journal des événements |
| Profil | `/profile` | Compte, sécurité, langue |

Le tableau de bord est l'écran de référence : toute règle de ce fichier doit y être démontrée.
Spécification : `design-system/airmess-commercants/pages/tableau-de-bord-marchand.md`.

## 10. Dette identifiée (hors périmètre de cette itération)

| Zone | Constat | Action proposée |
|---|---|---|
| `components/AppHeader.tsx` | Emojis utilisés comme icônes (cloche, wallet, profil) dans le drawer mobile | Remplacer par `BellIcon` / `WalletIcon` / `UserIcon` |
| `components/UserMenu.tsx` | Palette Tailwind brute (`bg-white`, `text-gray-500`, `border-gray-100`) | Migrer sur `off-white` / `warm-*` |
| `pages/CourseDetailPage.tsx`, `TrackingPage.tsx` | Idem, ponctuellement | Passe unique de tokenisation |
| `docs/AIRMESS_DESIGN_SYSTEM.md` §3.1 | Police non tranchée (Manrope vs Plus Jakarta Sans) | Décision produit, puis bascule en une passe |

## 11. Checklist de livraison

- [ ] Aucun emoji comme icône
- [ ] Aucune couleur hors tokens
- [ ] `tabular-nums` sur tous les chiffres
- [ ] Cibles ≥ 44 px, focus visible, ordre clavier = ordre visuel
- [ ] Statut = couleur + texte (+ point)
- [ ] « Live » accompagné de l'heure et d'un état périmé
- [ ] Pause/reprise de l'actualisation disponible
- [ ] Annonce `role="status"` sur les compteurs qui changent
- [ ] `prefers-reduced-motion` respecté
- [ ] Vérifié à 375 / 768 / 1024 / 1440
