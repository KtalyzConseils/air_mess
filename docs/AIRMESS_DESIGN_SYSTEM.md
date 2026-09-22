# AirMess — Design System canonique

> Objectif : une **seule** source de vérité de marque pour les 4 surfaces (landing, marchant-web, AirMess, driver-app) et l'admin embarqué. Source de vérité des couleurs : le logo SVG officiel (`apps/marchant-web/src/assets/logo/`).

## 1. Principe

1. **Les couleurs de marque sont déjà convergées en code** (`#FFCC00` / `#D40511` / `#1A1614`). On les verrouille, on ne les change pas.
2. **Une seule police de marque** est adoptée (voir décision §5).
3. **Les tokens legacy** (cahier, refonte HTML) sont retirés au profit des tokens canoniques.
4. Chaque app référence les mêmes valeurs, via sa propre mécanique (Tailwind v4 `@theme` côté web, `nativewind` `theme.extend` côté apps).

## 2. Couleurs canoniques

### 2.1 Marque

| Token | Hex | Rôle |
|---|---|---|
| `airmess-yellow` | `#FFCC00` | Primaire : CTA, highlight, focus ring, badge de statut |
| `airmess-yellow-light` / `-hi` | `#FFD633` | Jaune vif — lisibilité plein soleil, CTA critique |
| `airmess-red` | `#D40511` | Accent / danger / « live » |
| `airmess-red-light` | `#E2231A` | Rouge clair (hover, illustrations) |
| `airmess-dark` | `#1A1614` | Surfaces sombres, fond d'app, footer |
| `ink` | `#0A0908` | Texte principal (noir chaud, pas gris froid) |

### 2.2 Neutres chauds

| Token | Hex | Usage |
|---|---|---|
| `cream` | `#FAF7F0` | Fond de page (web) |
| `off-white` | `#FDFCF9` | Cartes / surfaces surélevées |
| `warm-100` | `#F2EFE8` | Fond de section |
| `warm-200` | `#E8E4DA` | Bordures douces |
| `warm-300` | `#D4CFC2` | Bordures, séparateurs |
| `warm-400` | `#9B968A` | Texte tertiaire, placeholders |
| `warm-500` | `#6B675E` | Texte secondaire |
| `warm-600` | `#4A463E` | Texte fort sur fond clair |

### 2.3 États sémantiques

| Token | Foreground | Background |
|---|---|---|
| `success` | `#15803D` | `#DCFCE7` |
| `warning` | `#EA580C` | `#FFEDD5` |
| `info` | `#0369A1` | `#DBEAFE` |
| `danger` | `#D40511` (= `airmess-red`) | `#FEE2E2` |

## 3. Typographie

### 3.1 Décision (à valider) — `Plus Jakarta Sans`

**Recommandation : unifier sur `Plus Jakarta Sans`** (graisses 400/500/600/700/800) sur toutes les surfaces.

Rationale :

- déjà chargée et utilisée dans les **deux apps mobiles** (`@expo-google-fonts/plus-jakarta-sans`) ;
- excellente lisibilité sur données denses (dashboards marchand/livreur) ;
- disponible sur Google Fonts → bascule web en une ligne ;
- chaleureuse et distinctive, adaptée à une marque « service de proximité ».

Alternative documentée si l'on veut limiter le changement web : conserver **Manrope** sur marchant-web et Plus Jakarta Sans sur apps, mais c'est la situation actuelle et c'est précisément la divergence à éliminer.

### 3.2 Échelle

| Token | Taille / line-height / poids |
|---|---|
| `eyebrow` | 11 / 1 / 700 · letter-spacing 0.12em |
| `caption` | 12 / 1.4 / 500 |
| `body-s` | 14 / 1.5 |
| `body` | 16 / 1.55 |
| `body-l` | 18 / 1.55 |
| `h3` | 22 / 1.3 / 700 |
| `h2` | 28 / 1.2 / 700 · -0.005em |
| `h1` | 36 / 1.15 / 700 · -0.01em |
| `display-2` | 48 / 1.1 / 800 · -0.015em |
| `display-1` | 64 / 1.05 / 800 · -0.02em |

**Conserver `JetBrains Mono`** pour les data-labels « tracking » de la landing (`.data-label`) — c'est une signature, pas une incohérence.

## 4. Rayons, ombres, motion

- Rayons : `sm` 6px · `md` 10px · `lg` 16px · `xl` 20px · `2xl` 28px · `pill` 9999px.
- Ombres (basées sur `#1A1614`, pas du gris froid) : `xs` 0 1px 2px /5% · `sm` 0 2px 8px /6% · `md` 0 6px 24px /8% · `lg` 0 12px 40px /12%.
- Glow focus : `glow-yellow` 0 0 0 4px `rgba(255,204,0,.25)` · `glow-red` 0 0 0 4px `rgba(212,5,17,.20)`.
- Motion : `ease-out-soft` `cubic-bezier(0.16,1,0.3,1)` · `ease-spring` `cubic-bezier(0.34,1.56,0.64,1)`. Respecter `prefers-reduced-motion`.

## 5. Table de correspondance

### 5.1 Docs (cahier / refonte) → canonique

| Ancien (cahier des charges) | Ancien (refonte HTML) | Canonique |
|---|---|---|
| Jaune `#FFC300` | Jaune `#FFC400` | `airmess-yellow #FFCC00` |
| Rouge `#CC0000` | Rouge `#E4241A` | `airmess-red #D40511` |
| Anthracite `#2C2C2C` | Noir `#141414` | `airmess-dark #1A1614` |
| — | Fond clair `#F7F6F2` | `cream #FAF7F0` |
| Bebas Neue (titres) + Barlow (corps) | Inter + Barlow Condensed | `Plus Jakarta Sans` |

### 5.2 Tokens legacy landing → canonique

Dans `apps/landing/src/index.css`, retirer/remplacer :

| Token legacy | Valeur | Remplacé par |
|---|---|---|
| `--color-yellow` | `#ffc300` | `--color-airmess-yellow` |
| `--color-yellow-deep` | `#d99f00` | `#E6B800` (nouveau token optionnel) |
| `--color-red` | `#cc0000` | `--color-airmess-red` |
| `--color-bg` | `#f6f5f1` | `--color-cream` |
| `--color-ink` | `#161514` | `--color-ink` |
| `--color-paper` | `#ffffff` | `--color-off-white` |
| `--color-muted` | `#6b6760` | `--color-warm-500` |
| `--color-faint` | `#e9e7e1` | `--color-warm-200` |
| `--color-asphalt` / `--color-asphalt-line` | `#211f1d` / `#322f2b` | `--color-airmess-dark` / `--color-warm-600` |

### 5.3 Dérive neutres & sémantiques (apps vs web) → canonique

| Token | Web (marchant-web) | Apps (RN) | Canonique retenu |
|---|---|---|---|
| `warm-100` | `#F2EFE8` | `#F4EFE4` | `#F2EFE8` |
| `warm-200` | `#E8E4DA` | `#EEE8DC` | `#E8E4DA` |
| `warm-300` | `#D4CFC2` | `#D9D2C4` | `#D4CFC2` |
| `warm-400` | `#9B968A` | `#B8AF9F` | `#9B968A` |
| `warm-500` | `#6B675E` | `#8A7E68` | `#6B675E` |
| `warm-600` | `#4A463E` | `#6B6250` | `#4A463E` |
| `success` | `#15803D` | `#16A34A` | `#15803D` |
| `warning` | `#EA580C` | `#F59E0B` | `#EA580C` |
| `warning-bg` | `#FFEDD5` | `#FEF3C7` | `#FFEDD5` |
| `info` | `#0369A1` | `#0284C7` | `#0369A1` |
| `info-bg` | `#DBEAFE` | `#E0F2FE` | `#DBEAFE` |

> Le web (`apps/marchant-web/src/index.css`) est retenu comme **référence des neutres/sémantiques** : c'est la source la plus complète et la plus cohérente. Les apps RN doivent s'aligner dessus.

## 6. Implémentation minimale

1. **Web** : conserver le `@theme` de `marchant-web/index.css`, ajouter `--font-sans: "Plus Jakarta Sans"` + le lien Google Fonts.
2. **Landing** : supprimer les tokens legacy (§5.2), réutiliser les tokens partagés déjà présents.
3. **Apps RN** : aligner `warm-*` et les sémantiques sur la colonne « canonique » de §5.3 (une seule passe dans les deux `tailwind.config.js`, déjà quasi identiques).
4. **Admin** : hérite automatiquement de marchant-web (même bundle).

## 7. À valider avant application

- [ ] Adopter `Plus Jakarta Sans` partout (vs conserver Manrope web). Décision §3.1.
- [ ] Conserver le token `#E6B800` (jaune profond) ou le supprimer.
- [ ] Acter la source de vérité des neutres/sémantiques = `marchant-web/index.css`.
