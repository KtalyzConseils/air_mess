# Design System — Application livreur AIRMESS

> **Portée** : `apps/driver-app` — application **React Native (Expo Router) stylée avec NativeWind
> (Tailwind CSS)**, destinée au livreur en tournée.
>
> **Source de vérité** : couleurs de marque, police, rayons, ombres et motion restent définis par
> `docs/AIRMESS_DESIGN_SYSTEM.md`. Ce fichier ajoute les règles **d'application** propres au terrain.
> En cas de conflit sur un token de marque, le document canonique gagne.
>
> **Implémentation des tokens** : `apps/driver-app/tailwind.config.js` (classes NativeWind) et
> `apps/driver-app/src/constants/theme.ts` (couleurs passées en props : Ionicons, `RefreshControl`,
> styles inline). Ces deux fichiers doivent rester synchronisés sur les valeurs canoniques.

## 0. Entrées de la skill

| Paramètre | Valeur |
|---|---|
| Requêtes | `courier driver on-demand delivery mobile app shift earnings offers` puis, après recalibrage, `driver mobile app jobs availability operations field` |
| Dials | `--density 6` (standard mobile) · `--variance 3` (sobre) · `--motion 2` (minimal) |
| Style résolu | *Minimalism & Swiss Style* — contraste élevé, hiérarchie nette, zéro décoration |
| Guidelines de stack | `--stack react-native` : `Pressable` plutôt que `TouchableOpacity`, `hitSlop` sur les petites cibles, `accessibilityLabel` sur tout élément interactif |
| Motion résolue | *Scroll Reveal* (300–400 ms, offset 8–16 px) |

**Écarts assumés vis-à-vis de la sortie brute**

| Proposition de la skill | Décision | Raison |
|---|---|---|
| Pattern *Funnel (3-Step Conversion)* | **Écartée** | Pattern marketing. L'accueil livreur est une console d'état, pas un tunnel de conversion. |
| Pattern *Hero-Centric* (1re requête) | **Écartée** | Le hero est le **statut de disponibilité**, pas une promesse commerciale. |
| Palette `#EA580C` / `#2563EB`, polices `Russo One` / `Chakra Petch` | **Écartée** | Marque verrouillée + police unique `Plus Jakarta Sans`, déjà embarquée dans l'app. |
| *Scroll Reveal* GSAP | **Écartée** | GSAP n'existe pas en React Native, et toute animation décorative est proscrite ici (§6). |
| Densité 7 puis 6 | Retenue **6** | Lisibilité à bout de bras, sur un guidon, en plein soleil. |

## 1. Profil d'usage — ce qui contraint tout le reste

Le livreur consulte l'app **debout, une main, souvent gantée, en plein soleil, à côté d'une moto**,
avec une batterie et un forfait data limités. Conséquences non négociables :

1. **Décision en 2 secondes** : l'information vitale (suis-je en ligne ? ai-je une course ? combien
   je gagne ?) doit être lisible sans lire de phrase.
2. **Cibles larges** : 44 pt minimum partout, **56 pt** pour toute action terrain (accepter, étape
   de course, SOS, navigation).
3. **Une seule action principale par écran** : le reste est secondaire et visuellement subordonné.
4. **Contraste renforcé** : jamais de texte gris clair, jamais d'information portée par la couleur seule.
5. **Sobriété énergétique** : aucune animation décorative, aucun polling redondant.

## 2. Couleurs

### 2.1 Règles

- **Classes** : uniquement les tokens du `tailwind.config.js` (`bg-airmess-yellow`, `text-warm-500`,
  `bg-success-bg`, …). Aucune couleur de la palette Tailwind par défaut.
- **Props natives** (`color` d'Ionicons, `tintColor`, `placeholderTextColor`, styles inline) :
  uniquement `BrandColors` / `StatusTone` / `StatusToneOnDark` de `src/constants/theme.ts`.
- **Aucun hex en dur dans un écran ou un composant.** C'était la cause principale de la dérive
  corrigée ici (`#8A7E68`, `#0284C7`, `#6E6558`, `#1A1614`…).
- **`ink` ≠ `airmess-dark`** : `ink` `#0A0908` est la couleur de **texte**, `airmess-dark` `#1A1614`
  est une **surface**. L'app livreur les avait confondus.

### 2.2 Sur surfaces claires

| Rôle | Token | Valeur |
|---|---|---|
| Action principale | `airmess-yellow` | `#FFCC00` |
| Alerte / danger / identité « live » | `airmess-red` | `#D40511` |
| Texte principal | `ink` | `#0A0908` |
| Texte secondaire | `warm-500` / `warm-600` | `#6B675E` / `#4A463E` |
| Succès | `success` sur `success-bg` | `#15803D` sur `#DCFCE7` |
| Information | `info` sur `info-bg` | `#0369A1` sur `#DBEAFE` |
| Alerte (texte) | **`warning-strong`** sur `warning-bg` | `#9A3412` sur `#FFEDD5` |

> **Nouveau token `warning-strong`** : `warning` `#EA580C` ne tient que 3.1:1 sur `warning-bg` — sous
> le seuil AA. Tout **texte** posé sur un fond `warning-bg` doit utiliser `warning-strong`. `warning`
> reste réservé aux bordures, points et icônes (seuil 3:1).

### 2.3 Sur surfaces sombres (`airmess-dark`)

Les teintes canoniques sont calibrées pour un fond clair : sur fond sombre, utiliser
`StatusToneOnDark` (`success` `#4ADE80`, `warning` `#FBBF24`, `neutral` `#9B968A`, `highlight` jaune brand).

### 2.4 Sémantique de disponibilité

| Statut API | Libellé | Ton |
|---|---|---|
| `available` | Disponible | succès (clair sur fond sombre) |
| `busy` | En course | jaune brand — verrouillé par le système |
| `on_break` | En pause | alerte |
| `offline` | Hors-service | neutre |

Le mot « En ligne » n'apparaît **que** pour `available`, et uniquement si la donnée est fraîche (§5).

## 3. Typographie

- **Police unique** : `Plus Jakarta Sans` (`font-jk`, `font-jk-medium|semibold|bold|extrabold`) —
  une famille par graisse, pour un rendu net sur Android (pas de faux gras).
- Valeur monétaire ou compteur : `font-jk-extrabold`, taille ≥ 20 px, jamais de chiffres fins.
- Le libellé générique reste en `font-jk` ; **les titres et les chiffres portent la hiérarchie**.
- Aucun libellé en dessous de 10 px, aucune phrase de plus de deux lignes dans une carte.
- `numberOfLines={1}` uniquement sur les libellés tronquables, jamais sur un montant.

## 4. Densité, espacement, structure

- Échelle 4/8 dp. Métriques de référence de l'app : `h-11` (44) minimum, `h-12`/`h-14` pour les
  actions principales, `h-14` pour les boutons de statut.
- Rayons : `rounded-2xl` pour les cartes et boutons, `rounded-3xl` pour les blocs hero, `rounded-full`
  pour les pastilles et avatars.
- Ombres : `shadow-card` / `shadow-cta` uniquement (la bordure porte le contour).
- Safe areas : `SafeAreaView` avec les bords réellement utilisés ; la barre d'onglets réserve
  `BottomTabInset`. La barre collante « Course active » se place **au-dessus** de la tab bar
  (`bottom-4`), jamais dessous.
- Un écran = une colonne qui défile, pas de double défilement imbriqué.

## 5. Temps réel : ce qui a le droit de s'appeler « en ligne » ou « scan »

Le livreur prend des décisions financières et physiques sur ces libellés : ils doivent être exacts.

| Flux | Cadence | Libellé autorisé |
|---|---|---|
| Statut / profil (`['me']`) | 15 s (layout) | « En ligne » seulement si `available` **et** donnée fraîche |
| Course active (`['my-active']`) | 10 s | « s'actualise automatiquement » |
| Propositions (`['offered-courses']`) | 8 s | « Scan à l'instant » / « Scan il y a 12 s » |
| Wallet / gains | 15 s / 60 s | aucun libellé « live » |

Règles :

1. **Pas de faux direct** : au-delà de **30 s** sans rafraîchissement réussi, le point vert devient
   orange et le libellé devient explicite (« Scan en attente »). C'est le rôle de `OFFER_SCAN_STALE_MS`.
2. **Le polling s'arrête quand l'app n'est plus au premier plan** (déjà porté par le layout : `['me']`
   au retour au premier plan, jamais de second polling dans l'accueil).
3. **Statut verrouillé** pendant une course : on explique pourquoi, on ne laisse pas un bouton échouer.
4. Aucun compteur n'est inventé : `formatK` (« 14.8k ») est assumé pour la **glanceabilité** des gains ;
   tout montant exact à manipuler (encaissement, total à collecter) est affiché **en entier**.

## 6. Mouvement

- Budget motion 2/10 : **aucune animation décorative**.
- Feedback de pression : opacité ou teinte, ≤ 150 ms, sans déplacer la mise en page.
- Aucune animation ne bloque une action ; un tap annule l'animation en cours.
- Respect de `prefers-reduced-motion` / réglage système « réduire les animations ».

## 7. Accessibilité (obligatoire)

- `accessibilityLabel` sur **tout** élément interactif ; libellé = verbe + objet (« Accepter la course »,
  pas « OK »).
- `accessibilityRole="button"` sur les `Pressable` d'action ; `accessibilityState={{ selected }}` sur
  les boutons de statut segmentés (Dispo / Pause / Off).
- `hitSlop` (≥ 8) sur les icônes seules et les cibles < 44 pt.
- Un statut n'est jamais porté par la seule couleur : icône ou libellé toujours présent.
- Le texte système agrandi ne doit pas casser une ligne de montant : prévoir `flexShrink` et le retour
  à la ligne plutôt qu'un tronquage.
- Les écrans bloquants (validation en attente, compte banni) expliquent la situation et offrent une
  sortie (support, déconnexion).

## 8. Anti-patterns à refuser en revue

- Un emoji utilisé comme icône (`👋`, `💰`) : rendu variable selon la plateforme, non colorable.
- Un hex écrit dans un écran au lieu d'un token.
- « En ligne », « Scan zone · 8 s » affichés alors que le dernier appel a échoué.
- Un bouton qui échoue en silence (statut imposé, compte non validé) au lieu d'être expliqué/désactivé.
- Deux pastilles de statut concurrentes sans convention de ton.
- Animation décorative, `Scroll Reveal`, parallaxe sur un écran de terrain.
- Action destructive au tap direct dans une liste (passer par la modale de détail).

## 9. Carte des écrans

| Écran | Fichier | Rôle |
|---|---|---|
| Accueil | `src/app/(tabs)/index.tsx` | Statut, gains du jour, propositions, course active |
| Course active | `ActiveCourseCard` + `ActiveCourseModal` | Étapes, navigation, encaissement, SOS |
| Historique | `src/app/(tabs)/history.tsx` | Courses terminées |
| Wallet | `src/app/(tabs)/wallet.tsx` | Caution, recharge, retrait |
| Notifications | `src/app/(tabs)/notifications.tsx` | Journal des événements |
| Profil | `src/app/(tabs)/profile.tsx` | Compte, documents, disponibilité |
| Connexion / inscription | `login.tsx`, `register.tsx` | Accès et dossier livreur |
| Bloquants | écrans internes de l'accueil | Validation en attente, compte banni |

Spécification de l'écran de référence : `design-system/airmess-livreurs/pages/accueil-livreur.md`.

## 10. Dette identifiée

| Zone | Constat | Action proposée |
|---|---|---|
| `ActiveCourseCard.tsx`, `CourseDetailModal.tsx`, autres modales | Hex encore en dur (`#D40511`, `#F59E0B`, `#78716C`, `#FFFFFF`…) | Passe unique vers `BrandColors` |
| `TodayKpiBanner.tsx` | `formatK` arrondit les gains (« 14.8k ») | Assumé ; à revoir si le livreur demande le montant exact |
| `apps/AirMess` (seconde app RN) | Le doc canonique §5.3 demande d'aligner **les deux** `tailwind.config.js` | À traiter dans la même passe |
| `docs/AIRMESS_DESIGN_SYSTEM.md` §3.1 | Police non tranchée (Manrope web vs Plus Jakarta Sans app) | Décision produit |
| Vérification | `node_modules` absent dans `apps/driver-app` : pas de `tsc`/`expo lint` local possible | Installer les dépendances avant de valider en CI/appareil |

## 11. Checklist de livraison

- [ ] Aucun emoji comme icône
- [ ] Aucun hex en dur : classes NativeWind ou `constants/theme.ts`
- [ ] `ink` réservé au texte, `airmess-dark` aux surfaces
- [ ] Texte sur `warning-bg` en `warning-strong`
- [ ] Cibles ≥ 44 pt (≥ 56 pt pour les actions terrain), `hitSlop` sur les icônes seules
- [ ] `accessibilityLabel` sur tout interactif, `accessibilityState` sur les segments
- [ ] « En ligne » / « Scan » uniquement si la donnée est fraîche (< 30 s)
- [ ] Un seul CTA principal par écran
- [ ] Aucune animation décorative
- [ ] Testé en plein soleil, à une main, texte système agrandi, réseau coupé
