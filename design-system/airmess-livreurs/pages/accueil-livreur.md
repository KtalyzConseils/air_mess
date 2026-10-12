# Page — Accueil livreur (`src/app/(tabs)/index.tsx`)

> Override de page pour `design-system/airmess-livreurs/MASTER.md`.
> Prioritaire sur le MASTER pour cet écran uniquement.

## 1. Objectif

Répondre, sans scroller, à trois questions du livreur :

1. **Suis-je en ligne ?** → bloc statut (hero sombre) + bascule Dispo / Pause / Off.
2. **Y a-t-il une course pour moi ?** → flux de propositions, avec la fraîcheur du scan.
3. **Combien j'ai gagné ?** → bandeau « Aujourd'hui ».

Si une course est en cours, l'accueil passe en mode « reprise » : la course prend la main (modale) et
une barre collante permet de la rouvrir.

## 2. Structure (haut → bas)

| # | Bloc | Contenu | Règles |
|---|---|---|---|
| 0 | Écrans bloquants | Validation en attente · Compte banni | Remplacent tout l'écran ; expliquent la situation + sortie (support, déconnexion) |
| 1 | En-tête | Avatar (initiales) + « Salut » + prénom, bouton notifications | Cibles 44 pt, `accessibilityLabel` sur les deux, aucun emoji |
| 2 | Statut | « Statut » + badge « En ligne » (si `available`) + libellé géant + 3 boutons segmentés | Le badge « En ligne » n'apparaît que si la donnée est fraîche ; verrouillé et expliqué si `busy` |
| 3 | Aujourd'hui | 3 tuiles : gains du jour, courses livrées, semaine | Hero sombre, chiffres ≥ 20 px, unité toujours affichée |
| 4 | Caution wallet | Rappel si solde ≤ 0 | Ton `info`, cliquable vers le wallet, `accessibilityRole="button"` |
| 5 | Propositions | En-tête + fraîcheur du scan, bloc « course en cours » si `acceptBlocked`, groupes Express puis Standard | Express d'abord ; taper une carte ouvre la modale de détail (jamais d'acceptation au tap direct) |
| 6 | Hors ligne | Recherche en cours / En pause / Hors-service | Toujours une action implicite : « passe en Disponible » |
| 7 | Barre collante | « Course active — reprendre » | Uniquement si une course est en cours et la modale fermée ; au-dessus de la tab bar |

Ordre des blocs **volontairement** : statut → argent → propositions. Le livreur décide d'abord de sa
disponibilité ; il ne peut pas accepter une course s'il n'est pas en ligne.

## 3. Le bloc « Propositions »

| Élément | Contenu | Contrainte |
|---|---|---|
| Titre | « Courses proposées » | — |
| Fraîcheur | point vert + « Scan à l'instant » / « Scan il y a 12 s » ; point orange + « Scan en attente » au-delà de 30 s | Jamais « 8 s » figé : le libellé suit le dernier scan réussi |
| Garde-fou | Si une course est déjà en cours : rappel « tu peux consulter, pas accepter » | Explique l'état au lieu de laisser les cartes échouer |
| Groupe Express | badge rouge + compte | En premier |
| Groupe Standard | libellé + compte | En second |
| Carte | Voir `OfferedCourseItem` : gain en grand, tags, trajet, distance, estimation | Le tap ouvre le détail |
| Vide | « Aucune proposition » + « on scanne la zone » | Rassurant, sans promettre de délai |

## 4. États

| État | Rendu |
|---|---|
| Chargement initial | Carte neutre avec squelette/libellé de chargement (pas d'écran vide) |
| Compte non validé | Écran dédié : confirmation + explication + déconnexion (boutons désactivés sur l'accueil) |
| Compte banni | Écran dédié + support + déconnexion |
| Hors ligne / en pause | Carte explicative, jamais une liste vide muette |
| Scan périmé | Point orange + « Scan en attente » |
| Course active | Modale prioritaire + barre collante |

## 5. Contraintes d'implémentation

- Chaque couleur passée en prop native vient de `src/constants/theme.ts` (`BrandColors`) — jamais un hex.
- Le polling reste celui existant (propositions 8 s, course active 10 s, wallet 15 s, `['me']` 15 s via
  le layout) : **ne pas ajouter un second polling** dans l'accueil.
- `useNewCourseAlert` continue de piloter l'alerte de nouvelle course.
- Le statut verrouillé (`busy`) et le compte non validé désactivent l'action, ils ne la laissent pas échouer.
- Aucune animation décorative ; le seul mouvement autorisé est le feedback de pression.

## 6. Critères d'acceptation

- [ ] Aucun emoji, aucun hex en dur dans l'écran
- [ ] « En ligne » et « Scan » ne s'affichent que sur données fraîches (< 30 s)
- [ ] Les 3 boutons de statut ont `accessibilityLabel` + `accessibilityState.selected`
- [ ] Le bouton notifications et l'avatar ont un `accessibilityLabel`
- [ ] Le flux Express est groupé et priorisé, l'acceptation passe toujours par la modale
- [ ] Écrans bloquants explicites (validation, bannissement) avec sortie
- [ ] Testé : écran en plein soleil, une main, texte agrandi, réseau coupé puis rétabli
