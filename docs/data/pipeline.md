# Pipeline de données — France de Macron

## Architecture générale

```
                    ┌─────────────────────────────────┐
                    │   API officielle roulez-eco.fr   │
                    │   https://donnees.roulez-eco.fr  │
                    └──────────────┬──────────────────┘
                                   │ ZIP (XML) quotidien
                                   ▼
                    ┌─────────────────────────────────┐
                    │   Job backend (Node.js/tsx)      │
                    │   - Téléchargement               │
                    │   - Parsing XML (ISO-8859-1)     │
                    │   - Calcul agrégats              │
                    │   - Calcul FCI                   │
                    └──────────────┬──────────────────┘
                                   │ Upsert (service role)
                                   ▼
                    ┌─────────────────────────────────┐
                    │        Supabase Postgres          │
                    │   fuel_daily_agg + fci_daily     │
                    │   (RLS : lecture publique)        │
                    └──────────────┬──────────────────┘
                                   │ Select (anon key via SSR)
                                   ▼
                    ┌─────────────────────────────────┐
                    │     Next.js Server Component     │
                    │   (fetch + render côté serveur)  │
                    └──────────────┬──────────────────┘
                                   │ HTML hydraté
                                   ▼
                    ┌─────────────────────────────────┐
                    │        Navigateur client         │
                    │  (chart interactif = Client Cmp) │
                    └─────────────────────────────────┘
```

**Règle absolue** : le navigateur ne contacte jamais l'API externe. Toute donnée
passe par Supabase avant d'atteindre le client.

---

## Module partagé (`scripts/shared/`)

Les jobs quotidiens (J-30, dernier jour, fuel-daily) s’appuient sur le module `scripts/shared/` qui fournit :

- `downloadDayXml(date)` — télécharge le ZIP du jour, retourne le XML (lance `DayDataUnavailableError` si 404/HTML)
- `parseDayXmlToAggregates(xml, day)` — parse en streaming, agrège par carburant, retourne `FuelDayAggregate[]`
- `upsertFuelAggregates(supabase, rows)` — upsert dans `fuel_daily_agg` (idempotent)

Voir [scripts/shared/README.md](../../scripts/shared/README.md).

---

## Jobs d'ingestion

### Job 1 : fuel-backfill-j30 (one-shot)

**Déclenchement** : manuel, une seule fois après le déploiement initial
**Fichier** : `scripts/fuel-backfill-j30/index.ts` (utilise `scripts/shared/` pour download, parse, upsert)

```
Pour D dans [aujourd'hui − 30j, hier] :
  1. URL = /opendata/jour/YYYYMMDD
  2. GET URL → ZIP
     - Timeout : 30s
     - Retry : max 3 fois (backoff : 1s, 5s, 30s)
     - 404 → skip + log "données indisponibles pour D"
     - Autres erreurs → log + skip

  3. Unzip → XML string (encodage ISO-8859-1 → UTF-8)

  4. Parse XML → liste de stations
     Pour chaque station :
       - Si rupture sans fin → exclure le carburant
       - Prix valeur / 1000 → prix €/L
       - Filtre : prix ∈ [0.5, 5.0] €/L (valeurs aberrantes exclues)

  5. Agréger par carburant :
       avg_price = mean(prix valides)
       min_price = min(prix valides)
       max_price = max(prix valides)
       sample_count = count(prix valides)

  6. Upsert fuel_daily_agg :
       INSERT ... ON CONFLICT (day, fuel_code) DO UPDATE
       (idempotent, safe à relancer)

  7. Calculer FCI(D) si sample_count > 0 pour gazole et e10

Fin du backfill :
  - Logger le résumé (jours traités, agrégats créés, erreurs)
  - Calculer FCI pour tous les jours backfillés
```

### Job 2 : fuel-backfill-last (rafraîchissement dernier jour)

**Déclenchement** : manuel, quand l’historique est déjà en base
**Fichier** : `scripts/fuel-backfill-last/index.ts`

Rafraîchit uniquement **hier (J-1)** et optionnellement **aujourd’hui (J-0)** avec `BACKFILL_INCLUDE_TODAY=1`.
Réutilise le module partagé `scripts/shared/` (download, parse, upsert). Commande : `pnpm run fuel:backfill:last`.

### Job 3 : fuel-daily (cron quotidien)

**Déclenchement** : Vercel Cron, tous les jours à 02:30 UTC
**Endpoint** : `GET /api/cron/fuel-daily` (sécurisé par `CRON_SECRET`)
**Fichier** : `scripts/fuel-daily/index.ts` + `apps/web/src/app/api/cron/fuel-daily/route.ts`

```
1. Vérifier header Authorization: Bearer {CRON_SECRET}
2. Déterminer date cible = hier (UTC)
3. Exécuter le même algorithme que le backfill pour 1 seul jour
4. Calculer FCI(J-1)
5. Retourner { ok: true, date, fci, duration }
```

**Configuration Vercel** (`apps/web/vercel.json`) :

```json
{
  "crons": [{ "path": "/api/cron/fuel-daily", "schedule": "30 2 * * *" }]
}
```

### Job 4 : fci-backfill (historique FCI)

**Déclenchement** : manuel, une fois que `fuel_daily_agg` est peuplé (après backfill carburants)
**Fichier** : `scripts/fci-backfill/index.ts`

Calcule le **FCI v1 pour chaque jour** sur une plage (défaut : depuis 2019-01-01 jusqu’au dernier jour en base) et upsert dans `fci_daily`. Permet d’obtenir la **série temporelle du FCI** pour graphiques et analyse (évolution, pics 2022, etc.).

```
1. Lire START_DATE (défaut 2019-01-01) et END_DATE (défaut = max(day) en base)
2. Pour chaque jour de (START_DATE + 29j) à END_DATE :
   - Récupérer les 30 derniers jours gazole + e10 depuis fuel_daily_agg
   - calcFCIv1() → score
   - Upsert fci_daily (day, score, methodology_version, components, weights)
3. Logger le nombre de jours calculés / skippés
```

Commande : `pnpm run fci:backfill`. Variables optionnelles : `START_DATE`, `END_DATE` (format YYYY-MM-DD). Idempotent (upsert par jour).

Voir [scripts/fci-backfill/README.md](../../scripts/fci-backfill/README.md).

---

## Calcul des agrégats

### Formule de la moyenne

Moyenne arithmétique simple sur toutes les stations actives :

```
avg_price = Σ(prix_i) / n
  où prix_i : prix valides (non-nul, non-rupture, ∈ [0.5, 5.0])
  n = sample_count
```

**Pourquoi simple et pas pondérée ?**

- Les données sources ne fournissent pas de volume de vente par station
- La moyenne simple est robuste et transparente (v1)
- En v2 : pondération par zone géographique (région) si pertinent

### Filtres appliqués lors du parsing

```
Exclure une station/carburant si :
  - Rupture actuelle (attribut <rupture> sans fin)
  - Station fermée (si disponible dans les données)
  - Prix nul ou manquant
  - Prix < 0.500 €/L (valeur aberrante basse)
  - Prix > 5.000 €/L (valeur aberrante haute)
  - Timestamp de mise à jour > 7 jours avant la date du flux (donnée obsolète)
```

---

## Calcul du French Cooked Index™ (FCI v1)

### Inputs requis

- `avg_price_eur_per_l` pour `gazole` et `e10` sur les 30 derniers jours
- Baselines historiques (constantes hardcodées en v1)

### Constantes baselines (prix moyens 2010–2019)

```typescript
const BASELINE = {
  gazole: 1.38, // €/L moyenne 2010–2019
  e10: 1.45, // €/L moyenne 2010–2019 (estimé — à affiner avec données réelles)
}
```

### Algorithme v1

```typescript
function calcFCIv1(
  gazole30j: number[], // 30 derniers prix gazole (du plus récent au plus ancien)
  e10_30j: number[], // 30 derniers prix e10
): number {
  const gazoLe_today = gazole30j[0] ?? 0
  const e10_today = e10_30j[0] ?? 0
  const gazole_30j_ago = gazole30j[29] ?? gazole30j[gazole30j.length - 1] ?? gazoLe_today
  const e10_30j_ago = e10_30j[29] ?? e10_30j[e10_30j.length - 1] ?? e10_today

  // 1. Score de niveau absolu (écart par rapport à la baseline 2010-2019)
  const gazoLe_level = normalize(gazoLe_today - BASELINE.gazole, 0, 0.8, 0, 100)
  const e10_level = normalize(e10_today - BASELINE.e10, 0, 0.8, 0, 100)
  const level_score = (gazoLe_level + e10_level) / 2

  // 2. Score de variation 30j (variation relative)
  const gazole_var30 = (gazoLe_today - gazole_30j_ago) / (gazole_30j_ago || 1)
  const e10_var30 = (e10_today - e10_30j_ago) / (e10_30j_ago || 1)
  const var_score = normalize(Math.max(gazole_var30, e10_var30), -0.1, 0.2, 0, 100)

  // 3. Score carburant composite
  const fuel_score = 0.6 * level_score + 0.4 * var_score

  // 4. FCI v1 = carburant uniquement (poids = 1.0)
  return Math.round(Math.max(0, Math.min(100, fuel_score)))
}

function normalize(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
}
```

---

## Idempotence et gestion des erreurs

### Idempotence

Toutes les écritures utilisent `INSERT ... ON CONFLICT (day, fuel_code) DO UPDATE`.
Un job peut être relancé autant de fois que nécessaire sans créer de doublons.
Si des données existent déjà partiellement, l’upsert ajoute les lignes manquantes et met à jour les existantes (aucun skip automatique : on retélécharge et on upsert à chaque run).

### Stratégie de retry

```
Tentative 1 : immédiate
Tentative 2 : après 1 seconde
Tentative 3 : après 5 secondes

Si 3 tentatives échouent : log l'erreur + skip le jour
(le job ne bloque pas sur un jour problématique)
```

### Modes de défaillance et comportements

| Scénario                           | Comportement                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| API carburants indisponible        | Retry × 3, log, skip. Données J-1 absent du front.                           |
| Fichier ZIP corrompu               | Log, skip le jour                                                            |
| Supabase indisponible              | Retry × 3, job échoue. Retry automatique par Vercel Cron le lendemain.       |
| Prix aberrant (< 0.5 ou > 5.0 €)   | Station exclue de l'agrégat, log warning                                     |
| Moins de 50 stations disponibles   | Log warning (représentativité faible), données quand même stockées avec flag |
| FCI incalculable (< 7j de données) | Upsert avec `score = null` (affiché "N/A" dans le front)                     |

### Logging

Chaque job log :

- Début / fin avec timestamp
- Nombre de jours traités / skippés / en erreur
- Nombre d'agrégats upsertés
- Score FCI calculé
- Durée totale

---

## Modes de déploiement

### Développement local

```bash
# Option 1 : lancer directement (depuis la racine du repo)
pnpm run fuel:backfill
pnpm run fuel:daily

# Option 2 : simuler le cron via curl
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3040/api/cron/fuel-daily
```

Migrations : en local `pnpm run db:push:local` (après `db:start`) ; projet lié `pnpm run db:push`. Supabase CLI : `pnpm exec supabase` (ou `pnpm dlx supabase` si le binaire local ne fonctionne pas).

### Production (Vercel)

- Le cron est défini dans `apps/web/vercel.json`
- Vercel appelle `/api/cron/fuel-daily` avec `Authorization: Bearer {CRON_SECRET}`
- La variable `CRON_SECRET` est configurée dans les settings Vercel (jamais dans le code)

### Alternative GitHub Actions (si Vercel Hobby)

> Note : Vercel Cron est disponible sur tous les plans depuis 2024. Préférer Vercel Cron.
> Si besoin de GitHub Actions (CI/CD existant) :

```yaml
# .github/workflows/fuel-daily.yml
name: Fuel Daily Job
on:
  schedule:
    - cron: '30 2 * * *'
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm fuel:daily
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```
