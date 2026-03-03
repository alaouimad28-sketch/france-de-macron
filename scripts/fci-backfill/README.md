# Script : fci-backfill

Calcule le **French Cooked Index™ (FCI) v1** pour tous les jours sur une période donnée et upsert dans `fci_daily`, afin d’avoir l’historique du score pour graphiques et analyse.

## Prérequis

- **fuel_daily_agg** déjà peuplé (backfill carburants : `pnpm run fuel:backfill` et/ou `pnpm run fuel:backfill:annees`).
- Variables d’environnement : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (ex. via `apps/web/.env.local`).

## Objectif

Permettre de visualiser **l’évolution du FCI dans le temps** (courbe depuis 2019, pics 2022, etc.) en remplissant la table `fci_daily` pour chaque jour où les données carburant (gazole + e10 sur 30 jours) sont disponibles.

## Algorithme

1. Déterminer la plage : `START_DATE` (défaut `2019-01-01`) à `END_DATE` (défaut = dernier jour présent dans `fuel_daily_agg`).
2. Pour chaque jour à partir de `START_DATE + 29` (il faut 30 jours d’historique) jusqu’à `END_DATE` :
   - Lire les 30 derniers jours de `fuel_daily_agg` (gazole + e10).
   - Calculer le score FCI v1 via `calcFCIv1` (voir `docs/data/methodology.md`).
   - Upsert dans `fci_daily` (day, score, methodology_version, components, weights).
3. Logger le nombre de jours calculés et skippés.

## Usage

```bash
# Depuis la racine du repo
pnpm run fci:backfill
```

### Variables d’environnement optionnelles

| Variable     | Description                           | Défaut               |
| ------------ | ------------------------------------- | -------------------- |
| `START_DATE` | Premier jour de la plage (YYYY-MM-DD) | `2019-01-01`         |
| `END_DATE`   | Dernier jour de la plage (YYYY-MM-DD) | Dernier jour en base |

Exemples :

```bash
# Depuis 2020 uniquement
START_DATE=2020-01-01 pnpm run fci:backfill

# Plage précise
START_DATE=2019-01-01 END_DATE=2024-12-31 pnpm run fci:backfill
```

## Idempotence

Chaque jour est upserté (ON CONFLICT day DO UPDATE). Relancer le script ne crée pas de doublons et met à jour les scores si la méthodologie ou les données ont changé.

## Voir aussi

- `docs/data/methodology.md` — formule FCI v1
- `docs/data/pipeline.md` — architecture et jobs
- `scripts/shared/fci.ts` — `calcFCIv1`, `normalize`
- `scripts/shared/calc-and-upsert-fci.ts` — `calcAndUpsertFCI` (réutilisé par fuel-daily)
