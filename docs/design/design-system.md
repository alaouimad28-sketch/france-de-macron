# Design System — Cooked Authority

> Le design system de France de Macron. Nom de code : **Cooked Authority**.
> Concept : l'autorité institutionnelle française — distordue, légèrement en feu, mais toujours lisible.

---

## 1. Principes de design

### 1.1 Identité visuelle

**Concept** : Dashboard gouvernemental / analytique × mème Gen Z

- **Autorité** : police sans-serif bold, données bien présentées, chiffres précis
- **Ironie** : microcopy, labels incisifs, gauge "qui pique"
- **Énergie** : contrastes forts, animations légères, grain textural
- **Confiance** : sources citées, méthodologie exposée, données vérifiables

### 1.2 Ce que le design doit transmettre

| Émotion             | Mécanisme                                    |
| ------------------- | -------------------------------------------- |
| "C'est sérieux"     | Typo analytique, chiffres précis, sources    |
| "C'est fun"         | Microcopy ironique, emojis rares, labels     |
| "C'est lisible"     | Contraste élevé, hiérarchie claire           |
| "C'est partageable" | Sections avec dimensions screenshot-friendly |

---

## 2. Palette de couleurs

### 2.1 Couleurs primaires "Cooked Authority"

Inspirées du drapeau français — désaturées, légèrement distordues, pour un look de dashboard (thème clair en MVP).

```
Bleu Républicain (republic)
  #2355EE  republic-500  → Actions primaires, liens, FCI gauge (gauche)
  #4D85FF  republic-400  → Hover states, accents
  #1430B0  republic-700  → Fond bouton primaire

Rouge Alerte (alert)
  #F43F5E  alert-500     → Spikes carburant, FCI élevé, erreurs
  #FB7185  alert-400     → Variations modérées
  #E11D48  alert-600     → FCI critique

Vert Soulagement (relief)
  #22C55E  relief-500    → Baisse de prix, FCI bas, succès
  #4ADE80  relief-400    → Hover sur soulagement

Ambre Avertissement (warning)
  #F59E0B  warning-500   → FCI modéré, variations normales

Surface (surface) — thème clair MVP
  #0E1018  surface-950   → (réservé si mode sombre ultérieur)
  #1A1E2E  surface-900   → Texte titres
  #2D3349  surface-800   → (sections alternées en dark)
  #3E4861  surface-700   → Borders subtils
  #6B7594  surface-500   → Texte secondaire / muted
  #CED3E3  surface-300   → (texte principal en dark)
  Fond body MVP : blanc ; cartes : surface-100 / blanc
```

### 2.2 Couleurs sémantiques carburant

| Carburant      | Couleur       | Hex       |
| -------------- | ------------- | --------- |
| Gazole         | Bleu acier    | `#60A5FA` |
| E10 (SP95-E10) | Vert émeraude | `#34D399` |
| SP98           | Or            | `#FBBF24` |
| E85            | Vert lime     | `#A3E635` |
| GPLc           | Violet        | `#A78BFA` |

### 2.3 Règles d'utilisation

- Fond : blanc / `surface-50` (thème clair en MVP)
- Cartes : `surface-100` / blanc + border `surface-200`
- Texte principal : `surface-900` (titres), `surface-600` (corps)
- Accent rouge : réservé aux alertes et aux pics de données
- Bleu : réservé aux actions et aux éléments interactifs
- **Spectre FCI (jauge hero)** : bleu et rouge uniquement — dégradé de l’arc bleu → rouge ; couleur d’accent (titre, label, aiguille) = bleu si score &lt; 25, rouge si score ≥ 25. Dégradé page (wrapper) = bleu → blanc → rouge ; header blanc (masqué au scroll down, réapparaît au scroll up) ; footer surface-100

---

## 3. Typographie

### 3.1 Polices

```
Headlines / Display : Space Grotesk
  Poids : 700 (Bold), 600 (SemiBold)
  Usages : titres de section, score FCI, labels forts
  Caractère : géométrique, modern, légèrement tech

Corps / Body : Inter
  Poids : 400 (Regular), 500 (Medium)
  Usages : paragraphes, labels, descriptions
  Caractère : ultra-lisible, neutre, analytique

Données / Monospace : JetBrains Mono
  Poids : 400, 600
  Usages : prix (1,879 €/L), dates, codes, valeurs numériques
  Caractère : précis, technique, crédible
```

### 3.2 Échelle typographique (mobile)

```
display-xl  : 48px / 56px lh / Space Grotesk 700  → Score FCI hero
display-lg  : 36px / 44px lh / Space Grotesk 700  → Titres de module
display-md  : 24px / 32px lh / Space Grotesk 600  → Sous-titres
body-lg     : 18px / 28px lh / Inter 400           → Texte intro
body-md     : 16px / 24px lh / Inter 400           → Corps standard
body-sm     : 14px / 20px lh / Inter 400           → Labels, captions
mono-lg     : 18px / 24px lh / JetBrains Mono 600 → Prix carburant
mono-sm     : 12px / 16px lh / JetBrains Mono 400 → Dates axe graphique
```

---

## 4. Espacement et layout

### 4.1 Grille

- **Mobile** (< 768px) : 1 colonne, padding 16px
- **Tablet** (768–1024px) : 2 colonnes, padding 24px
- **Desktop** (> 1024px) : max-width 1200px centré, padding 32px

### 4.2 Échelle d'espacement (Tailwind)

```
Section gap  : 64px (gap-16) entre les grandes sections
Card padding : 24px (p-6) intérieur des cartes
Chip gap     : 8px (gap-2) entre les filtres
```

### 4.3 Border radius

```
--radius : 12px (cards, modals)
md       : 10px (inputs, badges)
sm       : 8px (chips, petits éléments)
full     : boutons CTA principaux
```

---

## 5. Composants (inventaire MVP)

### 5.1 FCIGauge

Jauge semicirculaire (arc 180°) pour le score FCI. Hybride SVG + HTML : l’arc et l’aiguille sont en SVG ; le score, « / 100 » et la variation sont en HTML en dessous pour éviter tout chevauchement.

```
Props :
  score: number (0-100)
  previousScore?: number
  updatedAt: string
  isLoading?: boolean

Comportement :
  - Arc 180° bleu → rouge (dégradé), track gris, ticks majeurs (0, 25, 50, 75, 100)
  - Aiguille + pivot colorés selon le score (bleu si &lt; 25, rouge sinon)
  - Score et « / 100 » affichés sous l’arc (HTML)
  - Variation « ▲ +X pts depuis hier » sous le score (bleu/rouge selon sens)
  - Animation stroke-dasharray 1.2s au montage ; pulse rouge si score ≥ 75
  - Skeleton pendant le chargement
```

### 5.2 FuelChart

Line chart multi-carburant avec annotations.

```
Props :
  data: FuelChartDataPoint[]
  events: ChartEvent[]
  activePeriod: FuelPeriodFilter
  onPeriodChange: (p: FuelPeriodFilter) => void

Comportement :
  - Tooltip custom au hover (prix par carburant + variation J/J)
  - Lignes d'événements verticales avec label
  - Spikes mis en évidence (cercles sur les pics)
  - Animation d'entrée (draw progressif)
```

### 5.3 PeriodChip

Chip de filtre temporel.

```
Variants : default | active | disabled
Labels : "7j" | "30j" | "90j" | "1 an" | "5 ans"
Note : "90j" et plus affichent un badge "Bientôt" en MVP
```

### 5.4 CookedVote

Module de vote cooked/uncooked.

```
States :
  idle      → Deux boutons visibles
  voted     → Bouton choisi mis en évidence, barre de ratio visible
  loading   → Spinner sur le bouton cliqué
  error     → Message d'erreur toast
```

### 5.5 NewsletterForm

Formulaire d'inscription newsletter.

```
Fields :
  email (visible, required)
  website (honeypot, caché via CSS, jamais via display:none pour les vrais bots)

States :
  idle | loading | success | error
```

---

## 6. Micro-interactions

### 6.1 Règles générales

- **Durée** : 200–400ms pour les interactions directes, 800–1200ms pour les animations d'état
- **Easing** : `ease-out` pour les apparitions, `ease-in-out` pour les transformations
- **Principe** : chaque interaction donne du feedback immédiat (max 100ms latence perçue)

### 6.2 Catalogue d'animations

```
fade-in-up    : Apparition section au scroll (opacity 0→1, translateY 8px→0)
               Durée : 400ms, ease-out
               Trigger : IntersectionObserver (threshold: 0.1)

gauge-fill    : Remplissage de la jauge FCI
               Durée : 1200ms, cubic-bezier(0.34, 1.56, 0.64, 1) (spring)
               Trigger : composant monté

shimmer       : Skeleton de chargement
               Durée : 2s, linear, infini
               Trigger : isLoading = true

event-pulse   : Pulsation des markers d'événements sur le graphique
               Durée : 2s, ease-in-out, infini
               Trigger : marker affiché

chip-press    : Feedback tactile sur les chips de filtre
               Scale : 0.95 → 1.0, durée : 150ms
               Trigger : mousedown / touchstart

vote-pop      : Animation du compteur de votes après un vote
               Scale : 1.0 → 1.15 → 1.0, durée : 300ms
               Trigger : vote enregistré avec succès
```

### 6.3 Directives "ne pas faire"

- Pas d'animations sur les données (les chiffres ne doivent pas "rouler")
- Pas de parallax agressif (lisibilité mobile)
- Pas d'animations bloquantes (tout `animation-play-state` peut être `paused` si `prefers-reduced-motion`)

---

## 7. Texture et grain

Le fond a un grain subtil (SVG noise, `opacity: 0.04`) pour ajouter de la profondeur
sans nuire à la lisibilité. Applicable sur le body uniquement.

```css
background-image: url('data:image/svg+xml,[SVG noise filter]');
```

Pas de grain sur les cartes ou les composants (trop chargé).

---

## 8. Accessibilité

- Contrastes WCAG AA minimum : rapport ≥ 4.5:1 pour le texte normal, ≥ 3:1 pour le large
- Focus visible sur tous les éléments interactifs (outline republic-500 2px)
- Tous les graphiques ont un `aria-label` et une description textuelle alternative
- `prefers-reduced-motion` : désactiver toutes les animations
- Les couleurs sémantiques ne sont pas le seul vecteur d'information (icônes + texte aussi)
