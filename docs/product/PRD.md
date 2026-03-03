# PRD — France de Macron (MVP v1)

Version : 1.0 — Mars 2025
Statut : Verrouillé pour le MVP

---

## 1. Résumé exécutif

France de Macron est une landing page satirique Gen Z, data-driven, mobile-first.
Elle montre "à quel point on est cooked" via le **French Cooked Index™ (FCI)** + un module prix des carburants sur 30 jours, avec filtres, annotations d'événements, et un CTA newsletter.

---

## 2. Objectifs

### North Star Metric (NSM)

**Nombre d'emails collectés** (newsletter signups)

### Métriques secondaires

- Taux de conversion : visiteur → email
- Engagement : scroll depth, interactions modules, votes cooked/uncooked
- Partage social (OG screenshots) — architecture prête en v1

---

## 3. Public cible

**Primaire** : Gen Z / Alpha, 15–35 ans, actifs ou étudiants, francophones
**Secondaire** : grand public curieux (sans exclure)

**Persona principal** : Alexia, 24 ans, alternante RH à Lyon. Elle voit passer les prix à la pompe, elle ressent l'inflation, mais elle n'a pas le temps ni l'envie de lire les rapports INSEE. Elle partage des mèmes économiques sur Twitter/X. Elle vote parfois, est déçue souvent.

---

## 4. Périmètre MVP (verrouillé)

### ✅ In scope

| Fonctionnalité              | Description                                                   |
| --------------------------- | ------------------------------------------------------------- |
| Landing page                | Page principale avec toutes les sections                      |
| French Cooked Index™ (héro) | Gauge ring + score + microcopy ironique                       |
| Module carburants J-30      | Line chart avec spikes, filtres, annotations                  |
| Filtres temporels           | UI 7j / 30j / 90j / 1an / 5ans (données J-30 obligatoirement) |
| Annotations événements      | Markers verticaux sur le graphique                            |
| Vote cooked/uncooked        | Boutons + compteur global + par section                       |
| CTA Newsletter              | Formulaire email avec honeypot anti-bot                       |
| Page À propos               | Présentation du projet                                        |
| Page Méthodologie           | Formule FCI + sources + limites                               |
| Page Disclaimer             | Avertissement satirique + données                             |

### ❌ Non-goals MVP

- Dons Stripe
- Affichage publicitaire
- Stories narratives
- Autres indicateurs (inflation, loyers, salaires...)
- Export PNG / CSV
- Comparaisons avec d'autres pays
- Auth utilisateur
- Mode sombre

---

## 5. Expérience utilisateur

### Structure de la page (scroll vertical)

```
┌─────────────────────────────────┐
│  Header (logo + nav sticky)     │
├─────────────────────────────────┤
│  HERO : FCI Gauge               │
│  Score 74/100 • "On est cooked" │
│  ↕ variation J-1 : +2 pts       │
├─────────────────────────────────┤
│  MODULE CARBURANTS              │
│  Gazole : 1,879 €/L ▲ +3,2%    │
│  [Chips : 7j 30j 90j 1an 5ans]  │
│  [Line Chart interactif]        │
│  [Annotations : 24 fév 2022...] │
│  "Ça pique depuis 6 mois"       │
├─────────────────────────────────┤
│  VOTE COOKED / UNCOOKED         │
│  🔥 Cooked (72%) | 🌱 Pas (28%) │
├─────────────────────────────────┤
│  CTA NEWSLETTER                 │
│  "Reste informé, sans drama"    │
│  [Email input] [Subscribe]      │
├─────────────────────────────────┤
│  FOOTER                         │
│  À propos • Méthodologie        │
│  Disclaimer • Sources           │
└─────────────────────────────────┘
```

### Principes UX

- **Mobile-first** : conçu pour 390px, responsive jusqu'à 1440px
- **Thème clair** (MVP) : fond blanc, palette Cooked Authority, dégradés bleu→rouge (FCI)
- **Screenshot-friendly** : chaque section a des dimensions propres pour le partage
- **Performance** : LCP < 2.5s, CLS < 0.1, FID < 100ms (objectifs Core Web Vitals)
- **Smooth scrolling** : liens d'ancre animés, pas de saut brutal
- **Micro-interactions** : gauge animation au load, hover sur les chips, fade-in des sections

---

## 6. Spécifications fonctionnelles

### 6.1 French Cooked Index™ (FCI Hero)

**Affichage** :

- Jauge semicirculaire (arc 180°) : SVG pour l’arc + aiguille, HTML pour le score et la variation (sans chevauchement)
- Score bold + « / 100 » sous l’arc
- Variation avec flèche (ex. « ▲ +2 pts depuis hier »)
- Dernière mise à jour (ex. « Mis à jour le 15 nov. »)

**Couleurs selon le score** :

- 0–24 : bleu (`republic-500`) — « On respire »
- 25–100 : rouge (`alert-500`) — « Ça chauffe », « Ça pique », « On est cooked » ; pulse si score ≥ 75

**Source** : table `fci_daily`, dernière entrée disponible.

### 6.2 Module Carburants J-30

**Graphique** :

- Line chart multi-carburant (Recharts `LineChart`)
- Axe X : dates (format "dd MMM")
- Axe Y : prix en €/L (format "1,XXX €")
- Tooltip custom : date + prix par carburant + variation
- Lignes colorées par carburant (voir design system)
- Points de spike mis en évidence (cercle rouge si variation > 3% J/J)
- Annotations : ligne verticale + label au hover sur les événements

**Filtres** :

- Chips 7j / 30j / 90j / 1an / 5ans
- MVP : données fiables sur 30j, 7j calculé dessus
- 90j / 1an / 5ans : UI présente mais data indisponible → badge "bientôt"

**Labels** : mini-texte ironique généré selon tendance (voir `utils.ts`)

### 6.3 Vote Cooked / Uncooked

**UI** :

- Deux boutons : 🔥 Cooked / 🌱 Pas du tout
- Compteur global en temps réel (ou quasi)
- Barre de progression bicolore (ratio)
- Désactivé après vote (feedback visuel + stockage localStorage)
- Scope MVP : "global" uniquement

**Anti-abus** :

- 1 vote par scope/jour/empreinte navigateur (contrainte DB)
- Fingerprint = hash SHA-256(userAgent + timezone + screenSize)
- Pas d'auth, pas de cookie de tracking

### 6.4 CTA Newsletter

**Formulaire** :

- Champ email visible
- Champ `website` caché (honeypot, doit rester vide)
- Bouton submit avec état loading
- Message de confirmation ou erreur

**Anti-spam** :

- Honeypot côté serveur
- Rate limit par IP (10 tentatives/heure en MVP via Supabase policy)
- Contrainte unique email côté DB

---

## 7. Contraintes techniques

| Contrainte    | Règle                                                                |
| ------------- | -------------------------------------------------------------------- |
| Sécurité      | Le client ne contacte JAMAIS l'API carburants externe                |
| Sécurité      | La service role key Supabase n'est JAMAIS exposée côté client        |
| Performance   | Server Components pour tout le fetch de données                      |
| Données       | Toute donnée externe passe par le pipeline backend → Supabase → SSR  |
| Accessibilité | WCAG AA minimum (contraste, focus, labels ARIA)                      |
| SEO           | Pages publiques indexables (Landing, About, Methodology, Disclaimer) |

---

## 8. Non-goals explicites (pour éviter le scope creep)

- Pas de mode sombre en MVP
- Pas de notifications push
- Pas de compte utilisateur / profil
- Pas de commentaires / forum
- Pas de données temps réel (J-0) — tout est J-1 minimum
- Pas d'i18n active (architecture prête, pas de traductions)
- Pas de tests E2E en MVP (tests unitaires uniquement sur les fonctions critiques)
