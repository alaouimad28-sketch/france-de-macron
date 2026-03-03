# Script : fuel-daily

Job quotidien d'ingestion des données carburant (J-1).

## Objectif

Télécharger les données du jour précédent (J-1), calculer les agrégats nationaux,
et mettre à jour le French Cooked Index™.

Déclenché **automatiquement par Vercel Cron** à 02:30 UTC via `/api/cron/fuel-daily`.
Peut aussi être lancé manuellement.

## Source

Même source que le backfill : `https://donnees.roulez-eco.fr/opendata/jour/AAAAMMJJ`

Les données J-1 sont en général disponibles dès 01:00 UTC le lendemain.

## Algorithme

```
1. Déterminer la date cible : yesterday (UTC)
   (ou FUEL_DATE depuis les env vars pour un replay manuel)

2. Télécharger le ZIP du jour J-1
   → Retry max 3 fois avec backoff 1s, 5s, 30s si echec

3. Parser + agréger (identique au backfill)

4. Upsert dans fuel_daily_agg

5. Calculer FCI(J-1) :
   a. Récupérer les données des 30 derniers jours (pour la normalisation)
   b. Calculer fuel_stress_score (voir methodology.md)
   c. Composer le score FCI v1
   d. Upsert dans fci_daily

6. Logger le résumé complet
```

## FCI v1 — Calcul du fuel_stress_score

```typescript
// Pseudo-code du calcul (voir docs/data/methodology.md pour la formule complète)

const BASELINE_GAZOLE = 1.38 // Prix moyen Gazole 2010–2019 (€/L)
const BASELINE_E10 = 1.45 // Prix moyen E10 2010–2019 (€/L)

// 1. Niveau absolu : écart par rapport à la baseline
const gazoleLevelScore = normalize(avgGazole - BASELINE_GAZOLE, 0, 0.8, 0, 100)
const e10LevelScore = normalize(avgE10 - BASELINE_E10, 0, 0.8, 0, 100)

// 2. Variation 30j : variation relative
const gazolevVar30 = (avgGazole - avgGazole30jAgo) / avgGazole30jAgo
const e10Var30 = (avgE10 - avgE10_30jAgo) / avgE10_30jAgo
const variationScore = normalize(Math.max(gazolevVar30, e10Var30), -0.1, 0.2, 0, 100)

// 3. Score carburant (pondération interne)
const fuelScore = 0.6 * ((gazoleLevelScore + e10LevelScore) / 2) + 0.4 * variationScore

// 4. FCI v1 = fuel uniquement
const fci = Math.round(fuelScore)
```

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FUEL_API_BASE_URL=https://donnees.roulez-eco.fr/opendata
FUEL_API_TIMEOUT_MS=30000
FUEL_DATE=               # optionnel, format YYYYMMDD, replay manuel
CRON_SECRET=             # pour sécuriser le endpoint Vercel Cron
```

## Gestion des erreurs et alertes

| Scénario                           | Action                                           |
| ---------------------------------- | ------------------------------------------------ |
| Données J-1 indisponibles à 02:30  | Retry à 06:00 via second cron                    |
| Données J-1 toujours indisponibles | Conserver J-2, logger l'absence                  |
| Supabase indisponible              | Retry + alerte (webhook v2)                      |
| FCI incalculable (< 7j de données) | Score null, page affiche "Données insuffisantes" |

## Implémentation

- [x] Réutilisation du module partagé `scripts/shared/` (downloadDayXml, parseDayXmlToAggregates, upsertFuelAggregates)
- [x] Route HTTP `/api/cron/fuel-daily` implémentée (même logique que le script CLI, via import `scripts/shared`)
- [x] Replay manuel avec `FUEL_DATE=YYYYMMDD`
- [x] Retry avec backoff (dans le module partagé)
- [x] Implémenter le calcul FCI v1 (calcAndUpsertFCI) — lecture 30j depuis `fuel_daily_agg`, `calcFCIv1` (shared), upsert `fci_daily`
- [ ] Ajouter des métriques (durée, sample_count moyen)
- [ ] Tests unitaires sur le calcul FCI
