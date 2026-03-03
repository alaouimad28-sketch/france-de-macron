# Script : fuel-backfill-last

Rafraîchit uniquement **hier (J-1)** et optionnellement **aujourd'hui (J-0)**.

## Quand l'utiliser

- L'historique est déjà en base (J30 ou annuel déjà exécuté).
- On veut mettre à jour les derniers jours sans relancer un backfill complet.

## Usage

```bash
# Depuis la racine du monorepo
pnpm fuel:backfill:last

# Inclure aussi aujourd'hui (si disponible côté API)
BACKFILL_INCLUDE_TODAY=1 pnpm fuel:backfill:last
```

## Variables d'environnement

- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (requis)
- `FUEL_API_BASE_URL` (optionnel, défaut : https://donnees.roulez-eco.fr/opendata)
- `BACKFILL_INCLUDE_TODAY=1` ou `true` pour traiter aussi le jour courant

## Comportement

- Idempotent : upsert dans `fuel_daily_agg` (ON CONFLICT DO UPDATE).
- Si les données d'un jour sont indisponibles (404 ou HTML), le script skip ce jour et continue.
