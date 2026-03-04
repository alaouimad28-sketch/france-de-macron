# Index de la documentation — France de Macron

> Vue d’ensemble de toute la documentation du projet. Utilisez cet index pour retrouver rapidement un sujet.

**Dernière mise à jour** : Mars 2025

---

## Démarrage rapide

| Document                                            | Description                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| [README.md](../README.md) (racine)                  | Setup, stack, commandes, variables d’env, structure du projet                     |
| [docs/kickoff.md](kickoff.md)                       | Brief agent / prompt de démarrage pour l’IA — ordre de lecture et règles absolues |
| [docs/progress.md](progress.md)                     | État actuel du projet (todo / done) — source de vérité pour les tâches            |
| [docs/addons-research.md](addons-research.md)       | Recherche post-Phase-7 : ajouts P0/P1/P2, sources et notes d’implémentation       |
| [docs/deployment-runbook.md](deployment-runbook.md) | Runbook lancement prod (ordre exact des commandes et checks)                      |
| [docs/addons-research.md](addons-research.md)       | Research log autonome (P0/P1) pour modules additionnels                           |

---

## Vision et produit

| Document                                      | Description                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| [docs/vision.md](vision.md)                   | Pitch, problème/solution, ton éditorial, NSM, principe non-politique   |
| [docs/product/PRD.md](product/PRD.md)         | PRD MVP v1 — périmètre verrouillé, objectifs, UX, specs fonctionnelles |
| [docs/product/roadmap.md](product/roadmap.md) | Roadmap produit : MVP → v1.1 → v2 → v3 → v4                            |

---

## Données et pipeline

| Document                                                                                  | Description                                                                        |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [docs/data/pipeline.md](data/pipeline.md)                                                 | Architecture du pipeline, jobs fuel-backfill / fuel-daily, calcul FCI, idempotence |
| [docs/data/methodology.md](data/methodology.md)                                           | Méthodologie French Cooked Index™ (FCI) — formule v1, labels, limites              |
| [docs/data/sources.md](data/sources.md)                                                   | Sources de données (carburants roulez-eco.fr, structure XML, contraintes)          |
| [scripts/README.md](../scripts/README.md)                                                 | Scripts d’ingestion — fuel-backfill-j30, fuel-backfill-last, fuel-daily            |
| [scripts/shared/README.md](../scripts/shared/README.md)                                   | Module partagé (download, parse, upsert) pour jobs quotidiens                      |
| [scripts/fuel-daily/README.md](../scripts/fuel-daily/README.md)                           | Détail du job quotidien fuel-daily                                                 |
| [scripts/fuel-backfill-j30/README.md](../scripts/fuel-backfill-j30/README.md)             | Détail du backfill J-30                                                            |
| [scripts/fuel-backfill-last/README.md](../scripts/fuel-backfill-last/README.md)           | Rafraîchir dernier(s) jour(s) (J-1, optionnel J-0)                                 |
| [scripts/fci-backfill/README.md](../scripts/fci-backfill/README.md)                       | Backfill FCI : calcul du score pour tous les jours depuis 2019 (série temporelle)  |
| [scripts/insee-ipc-food-backfill/README.md](../scripts/insee-ipc-food-backfill/README.md) | Ingestion IPC alimentaire INSEE (P0)                                               |
| [scripts/deploy/README.md](../scripts/deploy/README.md)                                   | Préflight production, vérification artefacts et endpoint cron sécurisé             |
| [scripts/qa/README.md](../scripts/qa/README.md)                                           | Automatisation QA Phase 7 (smoke, reduced motion, headers sécurité)                |

---

## Design et UX

| Document                                                | Description                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| [docs/design/design-system.md](design/design-system.md) | Design system « Cooked Authority » — palette, typo, composants, animations |

---

## Sécurité

| Document                                                  | Description                                                             |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| [docs/security/threat-model.md](security/threat-model.md) | Modèle de menaces — newsletter, votes, RLS, clé service role, checklist |

---

## SEO et partage

| Document                                            | Description                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| [docs/seo/social-sharing.md](seo/social-sharing.md) | Stratégie SEO, metadata, OG, robots.txt, sitemap, partage social |

---

## Arborescence des docs

```
docs/
├── INDEX.md              ← Vous êtes ici
├── kickoff.md            Brief agent / ordre de lecture
├── progress.md           État du projet (todo / done)
├── addons-research.md    Ajouts post-Phase-7 (priorités + implémentation)
├── vision.md             Vision, pitch, ton
├── product/
│   ├── PRD.md            Périmètre MVP
│   └── roadmap.md        Roadmap produit
├── data/
│   ├── pipeline.md       Pipeline de données, jobs, FCI
│   ├── methodology.md    Formule FCI, labels
│   └── sources.md        Sources (carburants, XML)
├── design/
│   └── design-system.md  Design system Cooked Authority
├── security/
│   └── threat-model.md   Menaces et mitigations
└── seo/
    └── social-sharing.md SEO et partage
```

---

## Fichiers de code clés (référence)

| Fichier                                                 | Rôle                                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/web/src/types/index.ts`                           | Types métier (FuelCode, FCIDaily, VoteCounts…)                          |
| `apps/web/src/lib/supabase/database.types.ts`           | Types générés Supabase                                                  |
| `apps/web/src/lib/supabase/server.ts`                   | createReadClient() / createServiceClient()                              |
| `apps/web/src/lib/supabase/client.ts`                   | Client navigateur (anon key)                                            |
| `apps/web/src/lib/utils.ts`                             | Helpers (formatFuelPrice, getFCILabel, hashString)                      |
| `apps/web/src/app/layout.tsx`                           | Metadata OG, structure HTML, Header/Footer/Toaster                      |
| `apps/web/src/app/page.tsx`                             | Page home — assemblage FCIHero + sections + JSON-LD WebSite             |
| `apps/web/src/app/sitemap.ts`                           | Sitemap XML généré via MetadataRoute                                    |
| `apps/web/public/robots.txt`                            | Directives robots (Allow `/`, Disallow `/api/`) + lien sitemap          |
| `apps/web/public/og-image.png`                          | OG image statique (placeholder MVP)                                     |
| `apps/web/src/app/api/votes/route.ts`                   | GET/POST votes (comptage, fingerprint, ip_hash)                         |
| `apps/web/src/app/api/newsletter/route.ts`              | POST newsletter (honeypot, email, dedup)                                |
| `apps/web/src/components/fci/FCIGauge.tsx`              | Jauge arc 180° (SVG + HTML), bleu/rouge, « depuis hier »                |
| `apps/web/src/components/fci/FCIHero.tsx`               | Server Component hero — fetch fci_daily                                 |
| `apps/web/src/components/fuel/FuelChart.tsx`            | Recharts LineChart 3 carburants, spikes, events                         |
| `apps/web/src/components/fuel/PeriodChip.tsx`           | Sélecteur de période (7j/30j/…)                                         |
| `apps/web/src/components/fuel/FuelSection.tsx`          | Server Component carburants — fetch + pivot                             |
| `apps/web/src/components/vote/CookedVote.tsx`           | Votes cooked/uncooked, fingerprint, localStorage                        |
| `apps/web/src/components/newsletter/NewsletterForm.tsx` | Formulaire newsletter avec honeypot                                     |
| `apps/web/src/components/layout/Header.tsx`             | Header blanc, masqué au scroll down / réapparaît au scroll up           |
| `apps/web/src/components/layout/Footer.tsx`             | Footer thème clair (surface-100), liens, copyright                      |
| `apps/web/src/components/layout/ScrollReveal.tsx`       | Reveal `fade-in-up` au scroll (IntersectionObserver + reduced motion)   |
| `apps/web/src/hooks/use-toast.ts`                       | shadcn toast hook (exactOptionalPropertyTypes fix)                      |
| `apps/web/tailwind.config.ts`                           | Design tokens                                                           |
| `apps/web/eslint.config.mjs`                            | Config ESLint 9 (flat config)                                           |
| `scripts/insee-ipc-food-backfill/index.ts`              | Ingestion INSEE IPC alimentaire (fetch/normalize/store idempotent)      |
| `scripts/insee-ipc-food-backfill/README.md`             | Détails d'exécution (env, dry-run, parsing BDM) du module IPC           |
| `scripts/deploy/preflight.ts`                           | Vérifie présence env vars critiques + cohérence configuration           |
| `scripts/deploy/verify-cron-endpoint.ts`                | Vérifie 401/200 + payload du cron endpoint sécurisé                     |
| `scripts/deploy/verify-production.ts`                   | Vérifie artefacts production (`robots.txt`, `sitemap.ts`)               |
| `scripts/deploy/check-vercel-setup.ts`                  | Vérifie config cron dans `apps/web/vercel.json`                         |
| `scripts/security/check-headers.ts`                     | Vérification des headers de sécurité (CSP, XFO, nosniff, permissions)   |
| `scripts/qa/smoke-checks.ts`                            | Smoke checks CI des routes/pages + APIs clés                            |
| `scripts/qa/check-reduced-motion.ts`                    | Vérification couverture reduced motion                                  |
| `scripts/qa/check-security-headers.ts`                  | Vérification headers de sécurité sur app démarrée localement            |
| `scripts/qa/check-meta-descriptions.ts`                 | Vérification SEO: meta descriptions présentes et <= 155 caractères      |
| `scripts/qa/check-fci-intuition.ts`                     | Validation intuition FCI (benchmarks synthétiques + fenêtres 2020/2022) |
| `supabase/migrations/*.sql`                             | Schéma DB et RLS                                                        |

---

## Commandes utiles

| Commande                            | Description                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm install`                      | Installer les dépendances                                                                    |
| `pnpm dev`                          | Lancer le serveur de dev (Next.js)                                                           |
| `pnpm build`                        | Build production                                                                             |
| `pnpm lint`                         | Linter (ESLint)                                                                              |
| `pnpm run db:start`                 | Démarrer Supabase local (ignore health checks)                                               |
| `pnpm run db:push:local`            | Appliquer les migrations sur la base **locale** (après db:start)                             |
| `pnpm run db:push`                  | Appliquer les migrations sur le projet **lié** (nécessite supabase link)                     |
| `pnpm run db:types`                 | Régénérer les types TypeScript depuis le schéma                                              |
| `pnpm run fuel:backfill`            | Backfill carburants J-30 (one-shot)                                                          |
| `pnpm run fuel:backfill:annees`     | Backfill par archives annuelles (2007 → aujourd’hui)                                         |
| `pnpm run fuel:backfill:last`       | Rafraîchir uniquement hier (et optionnellement aujourd’hui avec `BACKFILL_INCLUDE_TODAY=1`)  |
| `pnpm run fuel:daily`               | Job quotidien J-1 (ou replay avec `FUEL_DATE=YYYYMMDD`, cron `/api/cron/fuel-daily`)         |
| `pnpm run fci:backfill`             | Backfill FCI : calcul du score pour tous les jours depuis 2019 (série temporelle)            |
| `pnpm run insee:ipc:food:backfill`  | Ingestion INSEE IPC alimentaire (fetch/normalize/store idempotent, mode DRY_RUN)             |
| `pnpm run deploy:preflight`         | Vérifier les env vars critiques et la cohérence de config (sans révéler de secrets)          |
| `pnpm run deploy:verify-production` | Vérifier les artefacts production requis (`robots.txt`, `sitemap.ts`)                        |
| `pnpm run deploy:verify-cron`       | Vérifier l’endpoint cron sécurisé (401 sans token, 200 avec token)                           |
| `pnpm run deploy:verify`            | Enchaîner preflight + artefacts + vérification endpoint cron                                 |
| `pnpm run qa:reduced-motion`        | Vérifier la couverture reduced motion                                                        |
| `pnpm run qa:smoke`                 | Smoke checks routes/pages + APIs (home/about/methodology/votes/newsletter validation)        |
| `pnpm run qa:security-headers`      | Vérifier les headers de sécurité en local sur l’app buildée                                  |
| `pnpm run qa:meta-descriptions`     | Vérifier les meta descriptions SEO (présence + longueur <= 155)                              |
| `pnpm run qa:fci-intuition`         | Valider l’intuition FCI (scénarios synthétiques, et live 2020/2022 si env Supabase présents) |
| `pnpm run qa:phase7`                | Exécuter toute l’automatisation QA Phase 7                                                   |
| `pnpm run validate`                 | Vérifier avant commit (typecheck web + scripts, lint, format)                                |

**Supabase local** : après `pnpm run db:start`, Studio = http://127.0.0.1:54323, API = http://127.0.0.1:54321, **MCP** = http://127.0.0.1:54321/mcp (pour Cursor / requêtes IA sur la base). Voir [README](../README.md#référence-supabase-local-après-supabase-start) et [TESTER-LE-SITE.md](TESTER-LE-SITE.md).
