# France de Macron 🇫🇷

> Dashboard satirique & data-driven — *"Jusqu'où on est cooked ?"*

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
- [Contribuer](#contribuer)

---

## Vision

France de Macron est un outil d'information satirique et factuel, pas un manifeste politique. Il vise à rendre les données économiques accessibles, compréhensibles et virales pour les 15–35 ans. Voir [docs/vision.md](docs/vision.md).

---

## Stack technique

| Couche | Choix |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| Styles | Tailwind CSS + shadcn/ui |
| Data viz | Recharts (extensible → ECharts v2) |
| Backend / DB | Supabase (Postgres + RLS) |
| Auth | Aucune (MVP sans compte utilisateur) |
| Hosting | Vercel (cible production) |
| Gestionnaire de paquets | pnpm (workspace monorepo) |
| Linting / Format | ESLint + Prettier |
| Commits | Conventional Commits |

---

## Lancer en local

### Prérequis

- Node.js ≥ 20
- pnpm ≥ 9
- Supabase CLI (`npm i -g supabase`)
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

# 4. Initialiser Supabase en local (optionnel)
supabase start

# 5. Appliquer les migrations
supabase db push
# ou en local :
supabase migration up

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
```

> ⚠️ **`SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être préfixé `NEXT_PUBLIC_`.**
> Il est uniquement utilisé dans les Server Actions et Route Handlers.

---

## Base de données Supabase

### Migrations

Les migrations SQL se trouvent dans `supabase/migrations/`. Elles sont **idempotentes** (safe to replay).

```bash
# Appliquer toutes les migrations
supabase db push

# Générer les types TypeScript depuis le schéma
supabase gen types typescript --local > apps/web/src/lib/supabase/database.types.ts
```

### Tables principales

| Table | Description |
|---|---|
| `data_sources` | Inventaire des sources de données (URL, licence) |
| `fuel_daily_agg` | Agrégats quotidiens carburants (national) |
| `events` | Annotations d'événements sur les graphiques |
| `newsletter_signups` | Emails collectés (NSM) |
| `votes` | Votes cooked/uncooked par section |
| `fci_daily` | Score French Cooked Index™ quotidien |

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

Géré par Vercel Cron (voir `apps/web/vercel.json`). Déclenche le job `fuel-daily` chaque jour à 02:30 UTC.

Voir [docs/data/pipeline.md](docs/data/pipeline.md) pour le détail.

---

## Scripts

```
scripts/
├── fuel-backfill-j30/   # Backfill 30 derniers jours
└── fuel-daily/          # Job quotidien (J-1)
```

Voir [scripts/README.md](scripts/README.md).

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
│   ├── vision.md
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

## Contribuer

- Lire [CONTRIBUTING.md](CONTRIBUTING.md) (à créer)
- Suivre [Conventional Commits](https://www.conventionalcommits.org/)
- Ouvrir une issue avant toute PR non triviale
- Langue du code : TypeScript strict, pas de `any` non justifié
- Langue de la documentation : Français (avec termes techniques en anglais)

---

## Licence

À définir — projet open source satirique, contributions bienvenues.

> *"On est cooked, mais au moins on a des données."* 🥐
