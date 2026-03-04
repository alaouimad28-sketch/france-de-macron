# insee-ipc-food-backfill (scaffold P0)

Scaffold d’ingestion pour l’IPC alimentaire INSEE.

## Commande

```bash
pnpm run insee:ipc:food:backfill
```

## Variables d’environnement

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
INSEE_API_TOKEN=... # TODO: confirmer mode d'auth et scope exacts
INSEE_BDM_API_BASE_URL=https://api.insee.fr/series/BDM/V1/data/SERIES_BDM
INSEE_IPC_FOOD_SERIES_ID=001767226
```

## Pipeline visé

1. **Fetch** : appeler l’API INSEE BDM pour la série IPC alimentaire.
2. **Normalize** : convertir les observations en `{ month, indexValue }`.
3. **Store** : upsert dans `public.ipc_food_monthly` (clé unique `month + source_series_id`).

## TODO ouverts

- Valider le format exact du payload INSEE BDM (path des observations, champs période/valeur).
- Confirmer stratégie d’auth INSEE en production (token statique vs refresh automatique).
- Ajouter un mode `DRY_RUN=1` si besoin pour QA avant écriture.
- Ajouter un script de backfill plage mensuelle (`START_MONTH`, `END_MONTH`).
