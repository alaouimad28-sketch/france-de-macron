# rent-backfill

Seed script for the `rent_monthly` table — average rent per m² for 5 French cities.

## Source

- **CLAMEUR** (Connaître les Loyers et Analyser les Marchés sur les Espaces Urbains et Ruraux) — annual reports
- **OLAP / Observatoire des Loyers** via [data.gouv.fr](https://www.data.gouv.fr/fr/datasets/resultats-des-observatoires-des-loyers/)
- License: Licence Ouverte / Open License

## Cities

| City      | Code      |
| --------- | --------- |
| Paris     | paris     |
| Lyon      | lyon      |
| Marseille | marseille |
| Lille     | lille     |
| Toulouse  | toulouse  |

## Data

Annual average rent per m² (unfurnished, private sector, all apartment types combined, charges excluded).
Period: 2018–2024 — one monthly row per year-month (annual snapshot repeated across 12 months).

## Usage

```bash
# Dry run (no DB write)
DRY_RUN=1 pnpm run rent:backfill

# Live upsert into Supabase
pnpm run rent:backfill
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

## Idempotence

Upsert on `(month, city)` — safe to re-run at any time.
