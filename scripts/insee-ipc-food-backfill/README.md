# insee-ipc-food-backfill

Ingestion mensuelle de l’IPC alimentaire INSEE (API BDM) vers `public.ipc_food_monthly`.

## Commande

```bash
pnpm run insee:ipc:food:backfill
```

## Variables d’environnement

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
INSEE_API_TOKEN=... # Bearer token INSEE obligatoire
INSEE_BDM_API_BASE_URL=https://api.insee.fr/series/BDM/V1/data/SERIES_BDM
INSEE_IPC_FOOD_SERIES_ID=001767226
INSEE_API_TIMEOUT_MS=30000
DRY_RUN=0 # mettre 1 pour tester sans écrire en base
```

## Pipeline

1. **Fetch** : appel `GET /SERIES_BDM/{seriesId}` avec Bearer token.
2. **Normalize** : extraction d’observations mensuelles depuis le JSON (formats `TIME_PERIOD` / `OBS_VALUE` + variantes).
3. **Store** : upsert idempotent dans `public.ipc_food_monthly` (clé unique `month + source_series_id`).

## Notes

- Le parser est volontairement robuste au shape JSON (traversée récursive + clés supportées).
- En cas de payload non reconnu (0 observation), le script échoue explicitement pour éviter un faux positif silencieux.
- `raw_payload` conserve l’observation brute pour audit / évolution parser.
