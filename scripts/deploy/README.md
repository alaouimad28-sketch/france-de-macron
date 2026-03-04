# Deploy helpers

Scripts de vérification production (sans exposer de secrets).

## Commandes

### `pnpm run deploy:preflight`

Vérifie la présence des variables critiques et la cohérence de configuration:

- vars requises présentes
- clés sensibles non exposées via `NEXT_PUBLIC_`
- URLs valides
- timeout API dans une plage sûre
- `CRON_SECRET` de longueur minimale

### `pnpm run deploy:verify-production`

Vérifie les artefacts statiques requis avant mise en prod:

- `apps/web/public/robots.txt`
- `apps/web/src/app/sitemap.ts`

### `pnpm run deploy:verify-cron`

Vérifie le endpoint cron (`/api/cron/fuel-daily`) avec critères stricts:

1. sans token → **401 attendu**
2. avec `Authorization: Bearer $CRON_SECRET` → **200 attendu**
3. payload JSON contient au moins `ok` et `date`

Variables utilisées:

- `NEXT_PUBLIC_APP_URL` (base URL à tester)
- `CRON_SECRET`
- `CRON_PATH` (optionnel, défaut `/api/cron/fuel-daily`)

### `pnpm run deploy:verify`

Enchaîne les vérifications:

1. `deploy:preflight`
2. `deploy:verify-production`
3. `deploy:verify-cron`

Le script échoue (`exit 1`) dès qu’un check est KO, ce qui le rend réutilisable en CI/CD.
