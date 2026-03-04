# France de Macron 🇫🇷

> Dashboard satirique & data-driven — _"Jusqu'où on est cooked ?"_

Landing page Gen Z, mobile-first, qui quantifie l'état économique de la France via le **French Cooked Index™ (FCI)** et des modules de données ouvertes (carburants, inflation…).

---

## Table des matières

- [Vision](#vision)
- [Stack technique](#stack-technique)
- [Lancer en local](#lancer-en-local)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données Supabase](#base-de-données-supabase)
- [Pipeline de données](#pipeline-de-données)
- [Scripts](#scripts)
- [Structure du projet](#structure-du-projet)
- [Documentation](#documentation)
- [Contribuer](#contribuer)

---

## Vision

France de Macron est un outil d'information satirique et factuel, pas un manifeste politique. Il vise à rendre les données économiques accessibles, compréhensibles et virales pour les 15–35 ans. Voir [docs/vision.md](docs/vision.md).

---

## Stack technique

| Couche                  | Choix                                       |
| ----------------------- | ------------------------------------------- |
| Framework               | Next.js 16 (App Router) + TypeScript strict |
| Styles                  | Tailwind CSS + shadcn/ui                    |
| Data viz                | Recharts (extensible → ECharts v2)          |
| Backend / DB            | Supabase (Postgres + RLS)                   |
| Auth                    | Aucune (MVP sans compte utilisateur)        |
| Hosting                 | Vercel (cible production)                   |
| Gestionnaire de paquets | pnpm ≥ 10 (workspace monorepo)              |
| Linting / Format        | ESLint 9 (flat config) + Prettier           |
| Commits                 | Conventional Commits                        |

---

## Lancer en local

### Prérequis

- Node.js ≥ 20
- pnpm ≥ 10
- Supabase CLI (fourni via le projet : `pnpm exec supabase` ou `pnpm dlx supabase` si le binaire local ne fonctionne pas)
- Un projet Supabase (local ou cloud)

### Installation

```bash
# 1. Cloner le repo
git clone https://github.com/your-org/france-de-macron.git
cd france-de-macron

# 2. Installer les dépendances
pnpm install

# 3. Copier les variables d'environnement
cp .env.example apps/web/.env.local
# → Remplir les valeurs (voir section ci-dessous)

# 4. Démarrer Supabase en local (optionnel)
pnpm run db:start
# ou : pnpm exec supabase start

# 5. Appliquer les migrations sur la base LOCALE (Supabase local doit être démarré)
pnpm run db:push:local
# Pour pousser vers un projet Supabase distant (nécessite supabase link) : pnpm run db:push

# 6. Lancer le serveur de développement
pnpm dev
```

L'application sera disponible sur [http://localhost:3040](http://localhost:3040).

---

## Variables d'environnement

Copier `.env.example` vers `apps/web/.env.local` et renseigner :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # JAMAIS exposé côté client

# App
NEXT_PUBLIC_APP_URL=http://localhost:3040
NODE_ENV=development

# Cron (optionnel en local ; requis en prod dans Vercel Secrets)
CRON_SECRET=   # pour sécuriser /api/cron/fuel-daily — ex. openssl rand -hex 32
```

> ⚠️ **`SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être préfixé `NEXT_PUBLIC_`.**
> Il est uniquement utilisé dans les Server Actions et Route Handlers.

---

## Base de données Supabase

### Migrations

Les migrations SQL se trouvent dans `supabase/migrations/`. Elles sont **idempotentes** (safe to replay).

```bash
# Supabase LOCAL (sans supabase link) — appliquer les migrations sur la base locale
pnpm run db:start    # démarrer Supabase local (une fois)
pnpm run db:push:local   # appliquer les migrations

# Supabase DISTANT (projet lié via supabase link) — pousser les migrations
pnpm run db:push

# Générer les types TypeScript depuis le schéma (local doit être démarré)
pnpm run db:types
```

**Régénération des types** (`pnpm run db:types`) : nécessite Supabase local démarré (`supabase start`). Si le projet est lié à un projet Supabase distant, utiliser `pnpm run db:types:linked` à la place (sans Docker).

**Après `supabase start` (local)** : pour que l’app utilise la stack locale, dans `apps/web/.env.local` mets :

- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la clé **Publishable** (anon) affichée au start
- `SUPABASE_SERVICE_ROLE_KEY` = la clé **Secret** (service_role) affichée au start  
  Puis `pnpm run db:types` (déjà fait si tu viens de start), et `pnpm dev` pour lancer l’app sur http://localhost:3040.

**Conflit Docker** (erreur « container name already in use ») : arrêter et nettoyer les conteneurs puis relancer :

```bash
pnpm dlx supabase@latest stop --no-backup
pnpm dlx supabase@latest start
```

**Démarrage malgré services « unhealthy »** (pg_meta, studio, etc.) : pour avoir la DB + l’API quand même (et pouvoir lancer `pnpm run db:types`) :

```bash
pnpm run db:start
```

(utilise `supabase start --ignore-health-check` ; Studio peut être indisponible.)

**Conteneurs « unhealthy »** (storage / pg_meta / studio) : souvent dû au projet lié (versions différentes). Lancer Supabase en mode local seul puis redémarrer :

```bash
pnpm dlx supabase@latest unlink
pnpm dlx supabase@latest stop --no-backup
pnpm dlx supabase@latest start
```

Pour régénérer les types sans Docker, utiliser `pnpm run db:types:linked` (après avoir relink avec `supabase link` si besoin).

**Postgres « database files are incompatible »** (ex. initialisé en 17, config en 15) : un ancien volume Docker contient des données d’une autre version. Supprimer les volumes Supabase du projet puis redémarrer :

```bash
pnpm dlx supabase@latest stop --no-backup
docker volume ls -q | grep supabase
# Supprimer le(s) volume(s) listé(s), ex. :
#   docker volume rm supabase_db_france-de-macron
# ou tous d’un coup : docker volume rm $(docker volume ls -q | grep supabase)
pnpm dlx supabase@latest start
```

**Démarrage bloqué ou « context canceled »** : le premier `supabase start` télécharge l’image Postgres (~650 Mo) et peut prendre plusieurs minutes. Laisser le pull aller au bout sans interrompre. Si Docker timeout ou annule : redémarrer le daemon Docker, relancer `supabase start`. Alternative : utiliser uniquement le projet Supabase hébergé (`.env` avec l’URL du projet) et `pnpm run db:types:linked` pour les types — pas besoin de Supabase local.

### Référence Supabase local (après `supabase start`)

| Service              | URL                                                       |
| -------------------- | --------------------------------------------------------- |
| **Project / API**    | http://127.0.0.1:54321                                    |
| **REST**             | http://127.0.0.1:54321/rest/v1                            |
| **Studio**           | http://127.0.0.1:54323                                    |
| **Mailpit** (emails) | http://127.0.0.1:54324                                    |
| **Database**         | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

**MCP (Model Context Protocol)** : http://127.0.0.1:54321/mcp  
Le projet contient `.cursor/mcp.json` : Cursor utilise ce serveur automatiquement quand Supabase local est démarré (`pnpm run db:start`). Redémarre Cursor si besoin. Permet à Cursor de discuter avec ta base locale : exécuter du SQL, lister les tables, générer les types, récupérer les clés, consulter les logs. Utile en dev pour demander à l’IA « liste les tables », « exécute cette requête », etc. Pour l’activer dans Cursor : Settings → Tools & MCP → Add server → URL `http://127.0.0.1:54321/mcp` (Supabase doit être démarré).

### Tables principales

| Table                | Description                                      |
| -------------------- | ------------------------------------------------ |
| `data_sources`       | Inventaire des sources de données (URL, licence) |
| `fuel_daily_agg`     | Agrégats quotidiens carburants (national)        |
| `events`             | Annotations d'événements sur les graphiques      |
| `newsletter_signups` | Emails collectés (NSM)                           |
| `votes`              | Votes cooked/uncooked par section                |
| `fci_daily`          | Score French Cooked Index™ quotidien             |

Voir [docs/data/pipeline.md](docs/data/pipeline.md) pour le détail du schéma et les règles RLS.

---

## Pipeline de données

Le client ne contacte **jamais** les APIs externes. Le flux est :

```
API officielle (roulez-eco.fr)
    ↓ (job backend)
Supabase Postgres
    ↓ (SSR Next.js)
Client navigateur
```

### Backfill initial (J-30)

```bash
# À lancer une seule fois après le déploiement initial
pnpm --filter scripts fuel:backfill
```

### Cron quotidien

Géré par Vercel Cron (voir `apps/web/vercel.json`). Déclenche le job `fuel-daily` chaque jour à 02:30 UTC. L’endpoint `/api/cron/fuel-daily` est implémenté (download → parse → upsert → FCI) ; test manuel : `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3040/api/cron/fuel-daily`.

Voir [docs/data/pipeline.md](docs/data/pipeline.md) pour le détail.

---

## Scripts

```
scripts/
├── shared/              # Module partagé (download, parse, upsert, FCI)
├── fuel-backfill-j30/   # Backfill 30 derniers jours
├── fuel-backfill-annee/ # Backfill par archives annuelles (2007 → aujourd'hui)
├── fuel-backfill-last/  # Rafraîchir hier (et optionnellement aujourd'hui)
├── fuel-daily/          # Job quotidien J-1 (ou FUEL_DATE=YYYYMMDD pour replay)
├── fci-backfill/            # Backfill FCI : score pour tous les jours depuis 2019 (série temporelle)
├── insee-ipc-food-backfill/ # Ingestion P0 IPC alimentaire INSEE (fetch/normalize/store)
├── deploy/                  # Vérifications prod (preflight, artefacts, cron endpoint)
└── qa/                      # Automatisation QA
```

Voir [scripts/README.md](scripts/README.md). Commandes : `pnpm run fuel:backfill` (J-30), `pnpm run fuel:backfill:last` (dernier jour), `pnpm run fuel:backfill:annees` (archives), `pnpm run fuel:daily` (quotidien ou replay), `pnpm run fci:backfill` (historique FCI depuis 2019), `pnpm run insee:ipc:food:backfill` (ingestion IPC alimentaire), `pnpm run eurostat:youth:backfill` (chômage jeunes FR + UE-27), `pnpm run electricity:trve:backfill` (historique TRVE électricité), `pnpm run deploy:verify` (préflight + artefacts + cron).

---

## Documentation

Toute la documentation détaillée est dans le dossier `docs/`. Un **index** liste chaque document et son rôle :

- **[docs/INDEX.md](docs/INDEX.md)** — Index de la documentation (où tout se trouve)

Voir aussi : [docs/vision.md](docs/vision.md), [docs/data/pipeline.md](docs/data/pipeline.md), [docs/progress.md](docs/progress.md).

---

## Structure du projet

```
france-de-macron/
├── apps/
│   └── web/                    # Application Next.js
│       ├── src/
│       │   ├── app/            # App Router (pages + layouts)
│       │   ├── components/     # Composants React (ui/ + modules/)
│       │   ├── lib/            # Supabase client, utils
│       │   └── types/          # Types TypeScript partagés
│       └── public/
├── supabase/
│   ├── config.toml
│   └── migrations/             # Migrations SQL versionnées
├── scripts/                    # Jobs d'ingestion de données
├── docs/                       # Documentation complète
│   ├── INDEX.md                 # Index de la doc (point d'entrée)
│   ├── vision.md
│   ├── kickoff.md
│   ├── progress.md
│   ├── product/
│   ├── design/
│   ├── data/
│   ├── security/
│   └── seo/
├── .env.example
├── package.json                # Workspace root
└── pnpm-workspace.yaml
```

---

## Validation avant commit

Depuis la racine du projet, lancer les checks suivants avant de committer :

```bash
# Tout en un (typecheck web + scripts, lint, format)
pnpm run validate

# QA Phase 7 (nécessite un build)
pnpm run build
pnpm run qa:phase7

# Audit SEO/perf reproductible + Core Web Vitals (proxy labo)
pnpm run qa:lighthouse-cwv

# Validation intuition FCI (synthetic + live si env Supabase dispo)
pnpm run qa:fci-intuition
```

Ou étape par étape :

```bash
pnpm run typecheck        # App web
pnpm run typecheck:scripts # Scripts (shared, backfill, fuel-daily)
pnpm run lint
pnpm run format:check     # ou pnpm run format pour corriger
```

**Tests manuels des scripts** (Supabase local démarré + `apps/web/.env.local` configuré) :

```bash
# Rafraîchir uniquement hier
pnpm run fuel:backfill:last

# Job quotidien (replay d’une date)
FUEL_DATE=20250302 pnpm run fuel:daily
```

Voir [docs/TESTER-LE-SITE.md](docs/TESTER-LE-SITE.md) pour le setup Supabase local.

---

## Contribuer

- Lire [CONTRIBUTING.md](CONTRIBUTING.md) (à créer)
- Suivre [Conventional Commits](https://www.conventionalcommits.org/)
- Ouvrir une issue avant toute PR non triviale
- Langue du code : TypeScript strict, pas de `any` non justifié
- Langue de la documentation : Français (avec termes techniques en anglais)

---

## Licence

À définir — projet open source satirique, contributions bienvenues.

> _"On est cooked, mais au moins on a des données."_ 🥐
