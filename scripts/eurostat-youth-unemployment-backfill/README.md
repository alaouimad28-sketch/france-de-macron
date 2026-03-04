# eurostat-youth-unemployment-backfill

Ingestion idempotente du chômage jeunes 15–24 (Eurostat), FR vs UE-27.

## Commande

```bash
pnpm run eurostat:youth:backfill
DRY_RUN=1 pnpm run eurostat:youth:backfill
```

## Variables

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
EUROSTAT_API_BASE_URL=https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data
EUROSTAT_DATASET=une_rt_m
EUROSTAT_GEOS=FR,EU27_2020
EUROSTAT_AGE=Y_LT25
EUROSTAT_SEX=T
EUROSTAT_UNIT=PC_ACT
EUROSTAT_S_ADJ=SA
```
