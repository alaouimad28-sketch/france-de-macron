# Deployment Runbook — Launch Day (Phase 6/7)

> Objectif : exécuter le lancement production **dans un ordre strict** (Vercel + Supabase + backfills + cron + QA smoke).
> Pré-requis : accès maintainer au repo GitHub, Vercel project admin, Supabase project admin, `gh` + `supabase` CLI installés.

---

## 0) Variables et conventions

```bash
# À adapter
export PROD_URL="https://france-de-macron.vercel.app"
export CRON_PATH="/api/cron/fuel-daily"
```

Secrets requis (Vercel env vars):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `FUEL_API_BASE_URL`
- `FUEL_API_TIMEOUT_MS`

---

## 1) Preflight local (sur la branche release)

```bash
git fetch origin
git checkout orchestrator/autonomous-dev-base
git pull --ff-only
pnpm install
pnpm run validate
pnpm run deploy:preflight
pnpm run deploy:check-vercel
```

**Pass/Fail (bloquant)**

- ✅ PASS: `validate`, `deploy:preflight` et `deploy:check-vercel` retournent exit code `0`
- ❌ FAIL: au moins une commande retourne non-zero → **stop release**

---

## 2) Vérifier config Vercel (repo + build + cron)

- Repo connecté à Vercel project
- Build command: `pnpm --filter web build`
- Install command: `pnpm install`
- Root directory cohérente avec le monorepo
- Cron présent dans `apps/web/vercel.json`:
  - `path: /api/cron/fuel-daily`
  - `schedule: 30 2 * * *`

---

## 3) Injecter / vérifier les variables d’environnement Vercel

Configurer les variables pour **Production** (et Preview si souhaité).

Checklist minimale:

- `NEXT_PUBLIC_SUPABASE_URL` = URL projet Supabase prod
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key prod
- `SUPABASE_SERVICE_ROLE_KEY` = service role prod
- `CRON_SECRET` = secret aléatoire fort
- `NEXT_PUBLIC_APP_URL` = `$PROD_URL`
- `FUEL_API_BASE_URL` = `https://donnees.roulez-eco.fr/opendata`
- `FUEL_API_TIMEOUT_MS` = `30000`

Génération CRON secret si besoin:

```bash
openssl rand -hex 32
```

---

## 4) Déployer Supabase production (schéma)

Depuis la racine du repo:

```bash
# 1) Lier la CLI au projet Supabase de prod
supabase link

# 2) Appliquer migrations en prod
pnpm run db:push
```

Validation SQL rapide (via Supabase SQL editor ou MCP):

- tables attendues présentes (`fuel_daily_agg`, `fci_daily`, `votes`, `newsletter_signups`)
- RLS activé sur toutes les tables critiques
- `votes` / `newsletter_signups` non-insérables en anon

---

## 5) Déploiement application (Vercel)

- Merge de la branche release vers branche de prod configurée Vercel
- Lancer/revérifier le déploiement production
- Ouvrir `$PROD_URL` et vérifier qu’aucune erreur runtime immédiate n’apparaît

---

## 6) Backfill data post-deploy (ordre exact)

Exécuter depuis un shell avec env prod valides (`.env` pointant sur Supabase prod):

```bash
# 1) Backfill carburants
pnpm run fuel:backfill

# 2) Backfill FCI historique
pnpm run fci:backfill
```

Validation attendue:

- `fuel_daily_agg` peuplée
- `fci_daily` peuplée
- Home affiche score FCI + séries carburants

---

## 7) Vérification cron sécurisé (helper automatisé)

```bash
# Variables requises: NEXT_PUBLIC_APP_URL, CRON_SECRET
export NEXT_PUBLIC_APP_URL="$PROD_URL"
pnpm run deploy:verify-cron
```

**Pass/Fail (bloquant)**

- ✅ PASS: check 1 retourne 401 sans token, check 2 retourne 200 avec token, JSON contient `ok` + `date`
- ❌ FAIL: tout autre status/payload → **stop release**

---

## 8) Smoke QA (release gate)

| Check                          | PASS                                                 | FAIL                                        |
| ------------------------------ | ---------------------------------------------------- | ------------------------------------------- |
| Home charge (desktop + mobile) | Page rendue sans erreur runtime/hydration            | Crash, écran blanc, erreur runtime          |
| Graph carburants visible       | 3 séries visibles + tooltip fonctionnel              | Graph manquant ou données invalides         |
| Vote                           | 1er vote accepté, 2e vote même jour refusé           | Double vote accepté ou erreur serveur       |
| Newsletter                     | Email valide accepté, doublon géré sans fuite d’info | Erreur non gérée, fuite d’info, endpoint KO |
| Cron endpoint                  | `pnpm run deploy:verify-cron` passe                  | Vérification cron en échec                  |
| Security headers               | Pas de régression majeure sur `securityheaders.com`  | Régression notable (CSP/headers manquants)  |
| Logs                           | Aucun secret exposé (Vercel/Supabase)                | Secret visible en clair                     |

**Règle de release**: tous les checks doivent être PASS avant lancement public.

---

## 9) Monitoring J+0 / J+1

- Vérifier alertes build/runtime actives
- Contrôler exécution du premier cron automatique (02:30 UTC)
- Contrôler que de nouvelles lignes arrivent dans `fuel_daily_agg` et `fci_daily`

---

## Rollback rapide

1. Promouvoir le dernier déploiement Vercel sain
2. Désactiver temporairement le cron si incident data
3. Tourner `CRON_SECRET` si suspicion de fuite
4. Ouvrir incident doc dans `docs/progress.md` (Notes de session)
