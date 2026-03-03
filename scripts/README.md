# Scripts d'ingestion de données

Ce dossier contient les jobs d'ingestion de données pour France de Macron.

> ⚠️ **Ces scripts ne s'exécutent jamais côté client.** Ils tournent uniquement en contexte serveur (cron Vercel, GitHub Actions, ou manuellement en local).

## Structure

```
scripts/
├── shared/              # Module partagé : download, parse, upsert (utilisé par j30, last, daily)
├── fuel-backfill-j30/   # Backfill initial : 30 derniers jours de données carburant
├── fuel-backfill-annee/ # Backfill par archives annuelles (2007 → aujourd'hui)
├── fuel-backfill-last/  # Rafraîchir uniquement hier (et optionnellement aujourd'hui)
└── fuel-daily/          # Job quotidien : ingestion J-1 (ou replay avec FUEL_DATE)
```

## Jobs disponibles

### `fuel:backfill` — Backfill J-30

**À lancer une seule fois** après le déploiement initial (ou pour réinitialiser les données).

Télécharge les 30 derniers jours de données carburant depuis l'API officielle.

```bash
pnpm fuel:backfill
# ou depuis la racine :
pnpm --filter scripts fuel:backfill
```

Voir [fuel-backfill-j30/README.md](fuel-backfill-j30/README.md) pour le détail.

### `fuel:backfill:last` — Rafraîchir dernier(s) jour(s)

Quand l’historique est déjà en base : rafraîchit uniquement **hier (J-1)** (et optionnellement **aujourd’hui** avec `BACKFILL_INCLUDE_TODAY=1`). Évite de relancer J30 ou annuel.

```bash
pnpm run fuel:backfill:last
BACKFILL_INCLUDE_TODAY=1 pnpm run fuel:backfill:last
```

Voir [fuel-backfill-last/README.md](fuel-backfill-last/README.md) pour le détail.

### `fuel:backfill:annees` — Backfill par archives annuelles

Remplit `fuel_daily_agg` depuis 2007 jusqu'à l'année courante (ou une plage `START_YEAR` / `END_YEAR`). Utilise les ZIP annuels de donnees.roulez-eco.fr.

```bash
pnpm run fuel:backfill:annees
START_YEAR=2015 END_YEAR=2020 pnpm run fuel:backfill:annees
```

Voir [fuel-backfill-annee/README.md](fuel-backfill-annee/README.md) pour le détail.

### `fuel:daily` — Cron quotidien

**Déclenché automatiquement** par Vercel Cron à 02:30 UTC via `/api/cron/fuel-daily`.

Peut aussi être lancé manuellement pour rejouer un jour spécifique :

```bash
pnpm fuel:daily
# Pour rejouer une date spécifique :
FUEL_DATE=20241115 pnpm fuel:daily
```

Voir [fuel-daily/README.md](fuel-daily/README.md) pour le détail.

## Variables d'environnement requises

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FUEL_API_BASE_URL=https://donnees.roulez-eco.fr/opendata
FUEL_API_TIMEOUT_MS=30000
```

## Idempotence

Tous les scripts utilisent des **upsert** (INSERT ... ON CONFLICT DO UPDATE) pour garantir qu'ils peuvent être relancés sans créer de doublons. Un job qui échoue à mi-chemin peut être relancé sans risque.

## Documentation complète

- [docs/data/pipeline.md](../docs/data/pipeline.md) — Architecture complète du pipeline
- [docs/data/sources.md](../docs/data/sources.md) — Sources et licences
- [docs/data/methodology.md](../docs/data/methodology.md) — Calcul FCI
