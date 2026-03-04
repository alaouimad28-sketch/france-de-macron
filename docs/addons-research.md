# Addons Research — Post-Phase-7

> Objectif : prioriser des intégrations data/features à fort impact après la mise en prod MVP.
> Ce document complète `docs/product/roadmap.md` et sert d’input pour le pipeline d’exécution autonome.

---

## 1) INSEE IPC alimentaire (P0)

- **Type** : Source de données macro (inflation alimentaire)
- **Pourquoi c’est prioritaire** : ajoute immédiatement un axe “coût de la vie” lisible, complémentaire aux carburants.
- **Source** : API INSEE BDM (`SERIES_BDM`) — ex. série IPC alimentaire
- **Accès** : API key INSEE requise
- **Implémentation (notes)** :
  1. Ajouter table `food_inflation_monthly (month, value, yoy, source_meta)`.
  2. Créer script `scripts/insee-food-monthly/` (fetch + normalisation + upsert idempotent).
  3. Ajouter poids initial dans FCI v2 (ex. 20%) derrière feature flag `FCI_V2_ENABLED`.
  4. Ajouter section UI “Panier alimentaire” avec variation YoY + sparkline 24 mois.
- **Risques** : mismatch de calendrier (mensuel) vs carburants (quotidien) → interpolation/step function à documenter.

## 2) Eurostat chômage jeunes (P0)

- **Type** : Source de données socio-éco
- **Pourquoi c’est prioritaire** : renforce la crédibilité “cooked index” au-delà des prix énergie.
- **Source** : Eurostat API (dataset type `une_rt_m` / ventilation âge 15–24)
- **Accès** : gratuit, sans clé
- **Implémentation (notes)** :
  1. Table `youth_unemployment_monthly (month, country, value, unit, source_meta)`.
  2. Script `scripts/eurostat-youth-unemployment/` avec retry, cache local JSON et upsert.
  3. Ajouter mode comparatif France vs médiane UE pour préparer v2.1.
  4. Ajouter annotation auto quand variation > +1 pt sur 3 mois.
- **Risques** : séries révisées par Eurostat → conserver `source_meta.revision_date`.

## 3) Loyers (Observatoires locaux / OLL + CLAMEUR selon disponibilité) (P1)

- **Type** : Source logement
- **Pourquoi c’est prioritaire** : le logement est un poste majeur de pression budgétaire; fort impact narratif.
- **Source** :
  - Observatoires locaux des loyers (formats ouverts selon métropole)
  - CLAMEUR (à valider selon conditions d’usage)
- **Accès** : hétérogène (CSV/portails), parfois contraintes de réutilisation
- **Implémentation (notes)** :
  1. Démarrer par 5 villes (Paris, Lyon, Marseille, Lille, Toulouse).
  2. Table `rent_city_quarterly (quarter, city_code, median_rent_m2, source_meta)`.
  3. Pipeline semi-manuel initial (import contrôlé), puis automatisation par connecteur ville.
  4. Affichage carte + classement pression loyer (vs revenu médian local en v2).
- **Risques** : licences et cohérence méthodo entre villes.

## 4) Tarif réglementé électricité (CRE / data.gouv) (P1)

- **Type** : Source énergie ménage
- **Pourquoi c’est prioritaire** : complète le signal carburant par un second poste énergie structurel.
- **Source** : Publications CRE / jeux data.gouv sur TRVE
- **Accès** : open data / docs publiques
- **Implémentation (notes)** :
  1. Table `electricity_tariff_history (effective_date, option, value_ct_kwh, source_meta)`.
  2. Script d’ingestion versionné (les changements sont discrets, pas continus).
  3. Ajouter composante “énergie domestique” dans FCI v2 avec pondération progressive.
  4. Ajouter événements auto sur dates de changement tarifaire.
- **Risques** : modèles tarifaires complexes (heures pleines/creuses, options).

## 5) API “Mon Master” / Parcoursup-like pressure proxy (feature) (P2)

- **Type** : Feature “stress social” (proxy non-économique)
- **Pourquoi c’est prioritaire** : différencie le produit avec un indicateur générationnel.
- **Source** : jeux data.gouv liés à l’enseignement sup. (selon disponibilité annuelle)
- **Accès** : open data, fréquence annuelle/saisonnière
- **Implémentation (notes)** :
  1. Définir un proxy robuste (taux de tension demandes/places par filière/région).
  2. Table `education_pressure_annual (year, region, tension_score, source_meta)`.
  3. Intégration comme module annexe (pas dans score global initial).
  4. Story card dédiée (“pression orientation”).
- **Risques** : interprétation politique sensible → forte documentation méthodologique requise.

## 6) Feature “FCI Explainability” (P0)

- **Type** : Feature produit (pas une nouvelle source)
- **Pourquoi c’est prioritaire** : augmente la confiance utilisateur et réduit les critiques “score opaque”.
- **Source** : données déjà présentes (`fci_daily.components`, `weights`) + futures composantes v2.
- **Implémentation (notes)** :
  1. Ajouter endpoint `/api/fci/decomposition?day=YYYY-MM-DD`.
  2. UI waterfall “qui contribue combien” + delta vs J-30.
  3. Versionner la méthodologie (`fci_method_version`) dans la table.
  4. Ajouter tests de non-régression sur formule/poids.
- **Risques** : dette UX si trop technique → prévoir mode simplifié + mode expert.

---

## Recommandation d’exécution (ordre)

1. **P0 immédiat** : INSEE IPC alimentaire + Eurostat chômage jeunes + Explainability.
2. **P1 ensuite** : TRVE électricité + pilote loyers (5 villes).
3. **P2 exploratoire** : proxy pression éducation (module séparé, expérimental).

### Statut exécution (Mars 2026)

- ✅ INSEE IPC alimentaire : ingestion + section UI livrées.
- ✅ Eurostat chômage jeunes : ingestion FR + UE-27 (`une_rt_m`) + section UI variation 3 mois livrées.
- ⏳ Explainability FCI : restant en P0.

## Définition de done (global)

- Ingestion idempotente documentée et observée en runbook
- Source/licence documentées dans `docs/data/sources.md`
- Composant UI livré avec états loading/error/empty
- QA automatique ajoutée (`pnpm run qa:phase7`)
- Impact mesurable défini (KPI d’usage ou de compréhension)
