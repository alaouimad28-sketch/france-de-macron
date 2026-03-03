# Backfill par archives annuelles (depuis 2007)

Remplit `fuel_daily_agg` avec les agrégats quotidiens (moyenne, min, max, nombre de stations) par carburant, à partir des ZIP annuels de [donnees.roulez-eco.fr](https://donnees.roulez-eco.fr/opendata/annee/YYYY).

## Prérequis

- Variables d’environnement (ex. dans `apps/web/.env.local`) :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Supabase accessible (local ou cloud) et migrations appliquées (`pnpm run db:push:local` en local, `pnpm run db:push` si projet lié).

## Commandes (à exécuter depuis la racine du repo)

```bash
# Installer les dépendances (une fois)
pnpm install

# Toutes les années disponibles (2007 → année courante)
pnpm run fuel:backfill:annees

# Plage d’années personnalisée
START_YEAR=2015 END_YEAR=2020 pnpm run fuel:backfill:annees

# Exemple : uniquement 2022 et 2023
START_YEAR=2022 END_YEAR=2023 pnpm run fuel:backfill:annees
```

## Durée et volume

- ~15–30 Mo en ZIP par année, ~300+ Mo décompressé par an.
- Une vingtaine d’années (2007–2025) : téléchargement + parsing peut prendre **plusieurs dizaines de minutes** selon le réseau et la machine.
- En cas de manque de mémoire sur de gros XML : `NODE_OPTIONS=--max-old-space-size=4096 pnpm run fuel:backfill:annees`

## Idempotence

Les upserts utilisent `ON CONFLICT (day, fuel_code) DO UPDATE`. Relancer la commande ne crée pas de doublons. Si des données existent déjà (en totalité ou en partie), les lignes manquantes sont insérées et les existantes mises à jour.
