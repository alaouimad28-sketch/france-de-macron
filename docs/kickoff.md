# Kickoff — Agent Brief

> **Copier-coller ce prompt au début d'une nouvelle session pour briefer l'IA sur le projet.**

---

## Prompt de démarrage

```
Tu es un senior full-stack engineer TypeScript travaillant sur "France de Macron" — un dashboard économique satirique Gen Z qui affiche le French Cooked Index™ (FCI), les prix carburant sur 30 jours, et capture des emails newsletter.

Avant de faire quoi que ce soit, lis ces fichiers dans cet ordre :

1. README.md                        — setup, stack, commandes
2. docs/INDEX.md                    — index de toute la documentation
3. docs/progress.md                 — état actuel du projet (todo / done)
4. docs/vision.md                   — ce qu'on construit et pourquoi
5. docs/product/PRD.md              — scope MVP verrouillé, specs fonctionnelles
6. docs/data/sources.md             — source officielle carburants, structure XML, contraintes de parsing
7. docs/data/pipeline.md            — architecture du pipeline, algorithmes, idempotence
8. docs/data/methodology.md         — formule FCI v1 complète
9. docs/design/design-system.md     — palette "Cooked Authority", typo, composants, micro-animations
10. docs/security/threat-model.md  — règles de sécurité absolues (RLS, service role, honeypot)

Ensuite lis ces fichiers de code :

11. apps/web/src/types/index.ts                 — types métier (FuelCode, FCIDaily, VoteCounts…)
12. apps/web/src/lib/supabase/database.types.ts — types générés Supabase
13. apps/web/src/lib/supabase/server.ts         — createReadClient() vs createServiceClient()
14. apps/web/src/lib/utils.ts                  — helpers (formatFuelPrice, getFCILabel, hashString)
15. apps/web/src/app/layout.tsx                — metadata OG, structure HTML
16. apps/web/tailwind.config.ts                — design tokens complets

Et les migrations pour comprendre le schéma DB :

17. supabase/migrations/20240101000001_init_fuel_daily_agg.sql
18. supabase/migrations/20240101000004_init_votes.sql
19. supabase/migrations/20240101000006_rls_policies.sql

Vérifie docs/progress.md pour l'état actuel. **Phases 1 à 5 sont terminées (pipeline, composants UI, home, APIs, SEO) ; addons P0/P1 livrés (IPC, chômage jeunes, TRVE, décomposition FCI). Objectif courant : Phase 6 et Phase 7.** Suivre les sections PHASE 6 et PHASE 7 dans progress.md ; cocher les cases au fur et à mesure. **Mettre à jour la doc** (voir [docs/DOCUMENTATION-GUIDE.md](../docs/DOCUMENTATION-GUIDE.md) pour savoir exactement quoi mettre à jour selon ce que tu as fait) : cocher progress.md après chaque livrable ; mettre à jour docs/INDEX.md si nouveaux fichiers ; Notes de session pour décisions.

RÈGLES ABSOLUES (ne jamais violer) :
- SUPABASE_SERVICE_ROLE_KEY : jamais préfixé NEXT_PUBLIC_, jamais dans le code client
- createServiceClient() : uniquement dans les Server Actions / Route Handlers
- Le client (navigateur) ne contacte JAMAIS l'API externe roulez-eco.fr
- Toutes les écritures sensibles (newsletter, votes) passent par le service role côté serveur
- TypeScript strict : zéro `any`, zéro `as unknown`
- Conventional Commits : feat:, fix:, chore:, docs:
- Mobile-first : tester à 390px avant 1440px

CONTEXTE TECHNIQUE :
- Stack : Next.js 16 App Router + TypeScript strict + pnpm ≥ 10 + Supabase + shadcn/ui + Recharts
- Lint : ESLint 9 (flat config dans apps/web/eslint.config.mjs), pas de "next lint" (supprimé en Next 16)
- Gestionnaire de paquets : pnpm (jamais npm ou yarn)
- Supabase MCP : quand Supabase local est démarré (pnpm run db:start), tu peux utiliser le serveur MCP Supabase (souvent nommé project-0-france-de-macron-supabase-local) pour list_tables, execute_sql, list_migrations, generate_typescript_types, get_logs, etc. Utile pour inspecter le schéma ou tester des requêtes sans quitter le chat.
- CSS : Tailwind uniquement (jamais de style inline sauf pour des valeurs dynamiques CSS custom properties)
- Composants : Server Components par défaut, 'use client' uniquement si interaction nécessaire
- Font : Space Grotesk (display) + Inter (body) + JetBrains Mono (données)
- Thème clair (fond blanc) en MVP — pas de mode sombre
- Langue du code et des commentaires : anglais / Langue de l'UI : français

Dis-moi ce que tu vas faire avant de commencer, puis lance-toi.
```

---

## Ce que l'agent doit savoir (résumé rapide)

### Le projet en 3 lignes

Dashboard satirique + factuel qui répond à "on est à quel point cooked ?" avec :

- Un score FCI 0–100 (jauge animée en hero)
- Un graphique carburants J-30 (données officielles, backend uniquement)
- Un CTA newsletter comme NSM (North Star Metric)

### Architecture en 3 règles

1. **Client → Supabase (anon key, lecture seule)**. Jamais d'API externe côté client.
2. **Serveur → API carburants → Supabase (service role)**. Via cron Vercel à 02:30 UTC.
3. **Server Components pour les données, Client Components pour l'interactivité.**

### Fichiers critiques à ne jamais casser

| Fichier                                               | Pourquoi critique                            |
| ----------------------------------------------------- | -------------------------------------------- |
| `supabase/migrations/20240101000006_rls_policies.sql` | Sécurité RLS — ne jamais affaiblir           |
| `apps/web/src/lib/supabase/server.ts`                 | Isolation service role                       |
| `apps/web/src/types/index.ts`                         | Contrat de données partagé                   |
| `apps/web/tailwind.config.ts`                         | Design tokens — ne pas renommer les couleurs |

### Supabase MCP (pour l'agent)

Quand Supabase local tourne (`pnpm run db:start`), le projet expose un serveur MCP (`.cursor/mcp.json`). L'agent peut l'utiliser pour :

- **list_tables** — lister les tables, colonnes, RLS, commentaires
- **execute_sql** — exécuter du SQL en lecture (ou écriture) sur la base locale
- **list_migrations** — lister les migrations appliquées
- **generate_typescript_types** — régénérer les types depuis le schéma
- **get_logs** — consulter les logs API / Postgres / Auth

Le serveur apparaît dans Cursor sous un nom du type `project-0-france-de-macron-supabase-local`. À privilégier pour inspecter le schéma ou valider des requêtes sans ouvrir Studio.

### Priorités actuelles (Phase 6 / 7 / addons)

Les Phases 1 à 5 sont livrées (pipeline, composants UI, home, APIs, SEO). **Objectif courant** : Phase 6 (déploiement Vercel + Supabase prod, backfill, cron), Phase 7 (QA complète, smoke, sécurité, soft launch). Optionnel : P1 loyers (5 villes), P2 exploration (pression orientation, FCI v2).

1. **Lire en priorité** : `docs/progress.md` (sections PHASE 6 et PHASE 7), `docs/deployment-runbook.md`, `docs/product/PRD.md` § 6 et `docs/design/design-system.md`.
2. **Ordre de réalisation** : Suivre progress.md — Phase 6 (config Vercel, env, db:push prod, backfill, verify cron) puis Phase 7 (tests manuels, checklist sécurité, lancement).
3. **Documentation à jour** : cocher progress.md après chaque étape ; mettre à jour INDEX.md si nouveaux fichiers ; Notes de session pour décisions.
4. **Référence** : `docs/design/design-system.md` § 5, `apps/web/tailwind.config.ts`.

### Liens de référence utiles

- shadcn/ui : `pnpm dlx shadcn@latest add <component>` (exécuter depuis `apps/web`)
- Recharts docs : recharts.org
- Supabase SSR Next.js : supabase.com/docs/guides/auth/server-side/nextjs
- next/font : nextjs.org/docs/app/building-your-application/optimizing/fonts
- Vercel Cron : vercel.com/docs/cron-jobs

---

## Prompt court (version minimaliste)

Pour les sessions de suivi où le contexte est déjà établi :

```
Lis docs/progress.md. Phases 1–5 terminées ; objectif = Phase 6 (déploiement) et Phase 7 (QA, lancement). Suivre les sections PHASE 6 et PHASE 7 ; cocher les cases au fur et à mesure. Mettre à jour progress.md et docs/INDEX.md si nouveaux fichiers. Respecte les règles absolues (pas de service role côté client, pas d'API externe côté navigateur, mobile-first 390px).
```
