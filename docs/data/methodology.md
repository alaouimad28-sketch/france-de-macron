# Méthodologie — French Cooked Index™

> Ce document est la référence de la méthodologie du FCI. Il est affiché publiquement sur la page `/methodology` de l'application.

---

## État actuel (Mars 2026) — en bref

- **Le score FCI affiché (0–100) est toujours calculé en v1** : **uniquement** Gazole + E10 (niveau vs baseline + variation 30j). Aucun autre indicateur n’entre dans la formule aujourd’hui.
- **Les autres indicateurs (alimentation IPC, chômage jeunes, électricité TRVE)** sont **ingérés et affichés sur le site** en tant que **modules séparés** (sections « Panier alimentaire », « Chômage jeunes », « Électricité TRVE »). Ils **ne modifient pas le chiffre FCI** ; ils sont là pour le contexte et pour préparer une future **FCI v2** multi-composantes.
- **Décomposition FCI** : l’API `/api/fci/decomposition` et la section « Décomposition » décrivent **comment le score v1 (carburant seul) est obtenu** (contributions niveau / variation), pas encore un agrégat de plusieurs indicateurs.
- **FCI v2** (pondération Énergie + Alimentation + Logement + Travail + Pouvoir d’achat) est **planifiée**, pas encore implémentée. La méthodologie v2 sera documentée ici et versionnée lors du passage en production.

---

## 1. Définition

Le **French Cooked Index™ (FCI)** est un indicateur composite semi-scientifique qui mesure "à quel point l'économie française est difficile pour le quotidien des ménages ordinaires".

**Score** : entier de 0 à 100.

- **0** : "On vit dans le meilleur des mondes" (situation idéale vs baseline)
- **50** : "Ça commence à piquer sérieusement"
- **100** : "On est complètement cooked" (situation extrêmement dégradée)

---

## 2. Principes de conception

### 2.1 Ce que le FCI cherche à mesurer

- L'écart entre le coût de la vie actuel et un niveau de référence historique "normal"
- La vitesse de dégradation (variation récente, pas seulement le niveau absolu)
- L'impact ressenti par un ménage ordinaire (pas le PIB, pas les marchés financiers)

### 2.2 Limites assumées et documentées

- **Ce n'est pas un indicateur officiel**. Il est maison, construit pour la vulgarisation.
- **Les baselines sont arbitraires** (2010–2019 comme "normale" — discutable).
- **Les pondérations v1 sont simplistes** (tout carburants en v1 — à améliorer).
- **Il ne prédit pas l'avenir**. C'est un snapshot du présent vs le passé.
- **Il ne tient pas compte des inégalités**. La situation varie selon les revenus et le lieu de vie.

Ces limites sont affichées clairement sur la page Méthodologie du site.

---

## 3. FCI Version 1 (MVP)

### 3.1 Composantes

En v1, le FCI est calculé sur **une seule composante** : les carburants.

| Composante | Poids      | Indicateurs inclus                |
| ---------- | ---------- | --------------------------------- |
| Carburant  | 1.0 (100%) | Prix Gazole + Prix E10 (SP95-E10) |

_Pourquoi uniquement les carburants en v1 ?_

- Données officielles disponibles quotidiennement (J-1)
- Impact direct sur le budget des ménages
- Données historiques disponibles depuis 2007

### 3.2 Calcul de la composante carburant

**Étape 1 : Score de niveau absolu**

Mesure l'écart du prix actuel par rapport à la baseline historique (2010–2019).

```
baseline_gazole = 1.380 €/L  (moyenne nationale 2010–2019)
baseline_e10    = 1.450 €/L  (estimé — à recalibrer avec les archives)

delta_gazole = prix_gazole_today - baseline_gazole
delta_e10    = prix_e10_today    - baseline_e10

gazole_level_score = normalize(delta_gazole, 0, 0.80, 0, 100)
e10_level_score    = normalize(delta_e10,    0, 0.80, 0, 100)

level_score = (gazole_level_score + e10_level_score) / 2

→ normalize(x, inMin, inMax, outMin, outMax) :
    = (x - inMin) / (inMax - inMin) × (outMax - outMin) + outMin
    = clamped à [0, 100]
```

_Interprétation_ :

- delta = 0 → level_score = 0 (on est à la baseline, pas de stress)
- delta = +0.80 €/L → level_score = 100 (prix 58% au-dessus de la baseline)

**Étape 2 : Score de variation 30 jours**

Mesure si les prix accélèrent ou décélèrent récemment.

```
var30_gazole = (prix_today - prix_J-30) / prix_J-30
var30_e10    = (prix_today - prix_J-30) / prix_J-30

variation_brute = max(var30_gazole, var30_e10)
variation_score = normalize(variation_brute, -0.10, +0.20, 0, 100)
```

_Interprétation_ :

- -10% sur 30j → variation_score = 0 (les prix baissent, soulagement)
- 0% → variation_score = 33 (stable)
- +20% sur 30j → variation_score = 100 (hausse rapide, stress)

**Étape 3 : Score carburant composite**

```
fuel_score = 0.6 × level_score + 0.4 × variation_score
```

_Pondération interne_ : le niveau absolu (60%) est plus important que la dynamique récente (40%), car même une stabilisation à niveau élevé reste problématique.

**Étape 4 : FCI v1**

```
FCI = round(fuel_score)
FCI = clamp(FCI, 0, 100)
```

### 3.3 Labels interprétatifs

| Score  | Label           | Couleur |
| ------ | --------------- | ------- |
| 0–24   | "On respire"    | Vert    |
| 25–49  | "Ça chauffe"    | Jaune   |
| 50–74  | "Ça pique"      | Orange  |
| 75–100 | "On est cooked" | Rouge   |

---

## 4. FCI Version 2 (planifié)

### 4.1 Nouvelles composantes prévues

| Composante      | Indicateur                | Source        | Fréquence   |
| --------------- | ------------------------- | ------------- | ----------- |
| Énergie         | Prix carburants (actuel)  | roulez-eco.fr | Quotidien   |
| Alimentation    | IPC alimentaire           | INSEE         | Mensuel     |
| Logement        | Loyers (grandes villes)   | CLAMEUR       | Trimestriel |
| Travail         | Chômage 15–24 ans         | Eurostat      | Trimestriel |
| Pouvoir d'achat | Salaire réel vs inflation | DARES/INSEE   | Trimestriel |

### 4.2 Pondérations v2 (proposées)

```
Énergie      : 25%
Alimentation : 30%
Logement     : 25%
Travail      : 10%
Pouvoir d'achat : 10%
```

_Ces pondérations seront soumises à consultation publique via le mécanisme de vote._

### 4.3 Fréquence de mise à jour v2

En v2, le FCI sera mis à jour :

- Quotidiennement pour la composante énergie
- Mensuellement ou trimestriellement pour les autres (interpolation entre deux valeurs si nécessaire)

---

## 5. Transparence et reproductibilité

Chaque entrée dans `fci_daily` stocke :

- `score` : le score final
- `methodology_version` : la version de la formule utilisée
- `components` : les scores de chaque composante (JSONB)
- `weights` : les pondérations utilisées (JSONB)

Dans l’API d’explicabilité (`/api/fci/decomposition`), la version exposée est résolue avec fallback sûr : `fci_method_version` (si présent) → `methodology_version` → `components.fci_method_version` → `v1`.

Cela permet de :

- Retracer comment un score a été calculé à n'importe quelle date
- Détecter les changements de méthodologie dans l'historique
- Permettre à n'importe qui de reproduire le calcul

---

## 6. Ce que le FCI ne mesure PAS

- **La pauvreté** : le FCI mesure la dégradation relative, pas la pauvreté absolue
- **Les inégalités** : un prix carburant à 2€/L n'a pas le même impact pour tout le monde
- **La qualité des services publics** : hors scope
- **Le bonheur** : evidemment
- **La responsabilité politique** : le FCI mesure des faits économiques, pas leurs causes

---

## 7. Historique des versions

| Version | Date      | Changements                               |
| ------- | --------- | ----------------------------------------- |
| v1      | Mars 2025 | Carburants uniquement (Gazole + E10)      |
| v2      | Planifié  | Multi-indicateurs + pondérations révisées |
