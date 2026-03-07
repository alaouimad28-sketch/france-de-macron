# Scripts d'ingestion de données

Ce dossier contient les jobs d'ingestion de données pour France de Macron.

> ⚠️ **Ces scripts ne s'exécutent jamais côté client.** Ils tournent uniquement en contexte serveur (cron Vercel, GitHub Actions, ou manuellement en local).

## Structure

```
scripts/
├── shared/                  # Module partagé : download, parse, upsert, FCI (utilisé par j30, last, daily, fci-backfill)
├── fuel-backfill-j30/       # Backfill initial : 30 derniers jours de données carburant
├── fuel-backfill-annee/     # Backfill par archives annuelles (2007 → aujourd'hui)
├── fuel-backfill-last/      # Rafraîchir uniquement hier (et optionnellement aujourd'hui)
├── fuel-daily/              # Job quotidien : ingestion J-1 (ou replay avec FUEL_DATE)
├── fci-backfill/            # Backfill FCI : calcul du score pour tous les jours depuis 2019 (série temporelle)
├── insee-ipc-food-backfill/ # Ingestion IPC alimentaire INSEE (fetch/normalize/store)
├── eurostat-youth-unemployment-backfill/ # Ingestion chômage jeunes Eurostat (FR vs UE-27)
├── electricity-trve-backfill/ # Ingestion historique TRVE électricité (CRE/data.gouv)
├── rent-backfill/           # Seed loyers 5 villes (Paris/Lyon/Marseille/Lille/Toulouse, CLAMEUR/OLAP)
├── deploy/                  # Vérifications production (preflight, cron endpoint, artefacts)
├── qa/                      # Automatisation QA Phase 7
└── seo/                     # Audits Lighthouse + Core Web Vitals (proxy labo)
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

### `fci:backfill` — Historique FCI (série temporelle)

Une fois `fuel_daily_agg` peuplé, calcule le **FCI v1 pour chaque jour** depuis 2019 (ou `START_DATE`) jusqu’au dernier jour en base. Remplit `fci_daily` pour afficher l’évolution du score dans le temps (graphiques, pics 2022, etc.).

```bash
pnpm run fci:backfill
START_DATE=2020-01-01 pnpm run fci:backfill
START_DATE=2019-01-01 END_DATE=2024-12-31 pnpm run fci:backfill
```

Voir [fci-backfill/README.md](fci-backfill/README.md) pour le détail.

### `insee:ipc:food:backfill` — Ingestion IPC alimentaire INSEE (P0)

Ingestion mensuelle idempotente (fetch/normalize/store) pour l’IPC alimentaire. Source : bdm.insee.fr (SDMX XML), série **011813717** (base 2025) par défaut. Token optionnel.

```bash
pnpm run insee:ipc:food:backfill
```

Voir [insee-ipc-food-backfill/README.md](insee-ipc-food-backfill/README.md) pour le détail.

### `eurostat:youth:backfill` — Chômage jeunes Eurostat (P0)

Ingestion idempotente du chômage 15–24 ans (France + UE-27) depuis l’API publique Eurostat.

```bash
pnpm run eurostat:youth:backfill
DRY_RUN=1 pnpm run eurostat:youth:backfill
```

Voir [eurostat-youth-unemployment-backfill/README.md](eurostat-youth-unemployment-backfill/README.md) pour le détail.

### `electricity:trve:backfill` — Tarifs électricité TRVE (P1)

Ingestion idempotente de l’historique TRVE résidentiel CRE/data.gouv (Option Base + HPHC), normalisé en ct€/kWh.

```bash
pnpm run electricity:trve:backfill
DRY_RUN=1 pnpm run electricity:trve:backfill
```

Voir [electricity-trve-backfill/README.md](electricity-trve-backfill/README.md) pour le détail.

### `rent:backfill` — Loyers 5 villes (P1)

Seed statique idempotent des loyers moyens au m² pour Paris, Lyon, Marseille, Lille, Toulouse (2018–2024). Source : CLAMEUR annual reports + OLAP data.gouv.fr (Licence Ouverte).

```bash
pnpm run rent:backfill
DRY_RUN=1 pnpm run rent:backfill
```

Voir [rent-backfill/README.md](rent-backfill/README.md) pour le détail.

### `deploy:*` — Vérifications production (Phase 6)

Checks vérifiables pour la mise en prod (sans afficher les secrets).

```bash
pnpm run deploy:preflight
pnpm run deploy:verify-production
pnpm run deploy:verify-cron
pnpm run deploy:verify
```

Voir [deploy/README.md](deploy/README.md) pour le détail.

### `qa:*` — Automatisation QA (Phase 7)

Checks CI-friendly pour routes clés, APIs, reduced motion, headers sécurité et audit Lighthouse/CWV.

```bash
pnpm run qa:reduced-motion
pnpm run qa:smoke
pnpm run qa:security-headers
pnpm run qa:lighthouse-cwv
pnpm run qa:phase7
```

Voir [qa/README.md](qa/README.md) pour le détail.

### `seo:lighthouse` — Audit Lighthouse + CWV (artefacts local/CI)

Audit Lighthouse reproductible avec sortie artefacts (`json`, `html`, `report.md`, `summary.json`) et seuils PASS/FAIL sur catégories + Core Web Vitals (proxy labo).

```bash
pnpm run seo:lighthouse
LIGHTHOUSE_PATHS="/,/about" pnpm run seo:lighthouse
```

Voir [seo/README.md](seo/README.md) pour le détail.

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
