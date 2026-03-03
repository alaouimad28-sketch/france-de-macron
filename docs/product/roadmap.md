# Roadmap — France de Macron

> La roadmap est indicative et peut évoluer selon le feedback utilisateurs et les opportunités de données.

---

## MVP v1 — "Cooked de base" (en cours)

**Objectif** : Lancer et valider le concept, capturer les premiers emails.

| Fonctionnalité                         | Statut           |
| -------------------------------------- | ---------------- |
| Repo scaffold + docs                   | ✅               |
| Schema Supabase + migrations           | ✅               |
| Pipeline carburants J-30               | 🔲 À implémenter |
| FCI v1 (carburants uniquement)         | 🔲 À implémenter |
| Landing page (FCI hero + carburants)   | 🔲 À implémenter |
| Vote cooked/uncooked                   | 🔲 À implémenter |
| CTA Newsletter                         | 🔲 À implémenter |
| Pages About / Methodology / Disclaimer | 🔲 À implémenter |
| Déploiement Vercel                     | 🔲 À faire       |
| Vercel Cron fuel-daily                 | ✅ Route implémentée ; CRON_SECRET à configurer |

---

## v1.1 — "Peaufinage" (post-lancement immédiat)

**Objectif** : Corriger les bugs, améliorer la performance, enrichir les annotations.

- Backfill historique étendu (90 jours, puis 1 an) pour activer les filtres
- Ajout d'annotations d'événements manquants (à partir du feedback)
- OG image dynamique par défaut (`@vercel/og`)
- PostHog analytics (scroll depth, heatmap)
- Amélioration des performances (image optimization, font subset)
- Tests unitaires sur le parsing XML et le calcul FCI

---

## v1.2 — "Vote et partage"

**Objectif** : Augmenter l'engagement et la viralité.

- Vote par section (scope: fuel, etc.) en plus du vote global
- Partage Twitter/X avec capture d'écran "viral-ready"
- OG image dynamique par score FCI du jour
- Affichage du vote de la communauté dans les cartes de section

---

## v2.0 — "Cooked multi-indicateurs"

**Objectif** : Enrichir le FCI et ajouter de nouveaux modules de données.

### Nouveaux indicateurs

| Indicateur                     | Source         | Fréquence   |
| ------------------------------ | -------------- | ----------- |
| Inflation alimentaire          | INSEE (IPC)    | Mensuel     |
| Loyers (Paris + autres villes) | CLAMEUR / OLAP | Trimestriel |
| Salaires réels (vs inflation)  | DARES          | Trimestriel |
| Chômage jeunes (15-24 ans)     | Eurostat       | Trimestriel |
| Précarité étudiante            | CREDOC / OVE   | Annuel      |
| Dette publique / PIB           | Eurostat       | Trimestriel |

### FCI v2

- Pondérations révisées (consultation publique via vote)
- Décomposition interactive (quel indicateur contribue combien ?)
- Historique des changements de méthodologie (transparence totale)
- Score par catégorie (energie / logement / travail / dette)

---

## v2.1 — "Comparaison européenne"

**Objectif** : Contextualiser la situation française par rapport aux voisins.

- Comparaison France vs Allemagne, Espagne, Italie, Pays-Bas
- Source : Eurostat (API gratuite)
- FCI "comparatif" (on est à X% au-dessus de la médiane UE)
- Question "cooked" par pays ? ("Vote pour le pays le plus cooked")

---

## v3.0 — "Stories narratives"

**Objectif** : Rendre les données encore plus compréhensibles via le storytelling.

- Format "slides" scrollables (type Bloomberg Quicktake)
- "La grande hausse carburant 2022 — retour sur 6 mois de douleur"
- "Ton loyer a augmenté de X% depuis 2017"
- Générateur de "mon FCI personnel" (basé sur ville, situation logement, voiture)

---

## v4.0 — "Monétisation et durabilité"

**Objectif** : Rendre le projet autofinancé et pérenne.

- Dons Stripe (one-time + récurrent)
- Version premium (pas de pub, données avancées) — si pertinent
- Partenariats data (médias indépendants, associations)
- API publique limitée (pour les journalistes et chercheurs)

---

## Décisions techniques futures

| Décision             | Option A          | Option B  | Trigger                 |
| -------------------- | ----------------- | --------- | ----------------------- |
| Analytics            | PostHog           | Plausible | v1.1                    |
| Charts avancés       | Recharts (actuel) | ECharts   | Si besoin de zoom/brush |
| Email service        | Résend            | Brevo     | v1.1                    |
| Notifications push   | PWA + Web Push    | Non       | v2                      |
| Rate limiting avancé | Upstash Redis     | Vercel KV | Si abus détectés        |
