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

Vérifie docs/progress.md pour l'état actuel. **Phase 1 (pipeline de données) est terminée** — cron fuel-daily implémenté et testé. **Objectif : livrer toute la Phase 2 (composants UI).** Suivre l’ordre des tâches dans "PHASE 2 — Composants UI" ; cocher chaque case dès qu’elle est faite. **Mettre à jour la doc au fur et à mesure** : cocher progress.md après chaque composant ; mettre à jour docs/INDEX.md (Fichiers de code clés) si tu ajoutes des fichiers ; en fin de Phase 2, note dans "Notes de session".

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

### Supabase MCP (pour l’agent)

Quand Supabase local tourne (`pnpm run db:start`), le projet expose un serveur MCP (`.cursor/mcp.json`). L’agent peut l’utiliser pour :

- **list_tables** — lister les tables, colonnes, RLS, commentaires
- **execute_sql** — exécuter du SQL en lecture (ou écriture) sur la base locale
- **list_migrations** — lister les migrations appliquées
- **generate_typescript_types** — régénérer les types depuis le schéma
- **get_logs** — consulter les logs API / Postgres / Auth

Le serveur apparaît dans Cursor sous un nom du type `project-0-france-de-macron-supabase-local`. À privilégier pour inspecter le schéma ou valider des requêtes sans ouvrir Studio.

### Phase 2 — Par où commencer (composants UI)

Phase 1 est faite (données en base, cron OK). **Objectif : livrer toute la Phase 2** (setup shadcn, FCIGauge, FCIHero, FuelChart, PeriodChip, FuelSection, CookedVote, NewsletterForm, Header, Footer, layout). La section "PHASE 2 — Composants UI" dans `docs/progress.md` est détaillée en **tâches granulaires avec cases à cocher** : traiter les tâches dans l’ordre et cocher au fur et à mesure.

1. **Lire en priorité** (si pas déjà lu) :
   - `docs/design/design-system.md` — palette Cooked Authority, typo, specs composants
   - `docs/product/PRD.md` § 6 (spécifications fonctionnelles FCI hero, carburants, vote, newsletter)

2. **Ordre de réalisation** : Suivre strictement `docs/progress.md` section "PHASE 2 — Composants UI" : Setup shadcn → FCIGauge → FCIHero → FuelChart → PeriodChip → FuelSection → CookedVote → NewsletterForm → Layout (Header, Footer, intégration).

3. **Documentation à jour au fur et à mesure (obligatoire)** :
   - **Après chaque composant ou sous-section** : cocher dans `docs/progress.md` toutes les cases correspondantes.
   - **Dès que tu ajoutes des fichiers** (ex. `components/fci/`, `components/fuel/`) : mettre à jour `docs/INDEX.md` section "Fichiers de code clés" pour lister les nouveaux chemins.
   - **Si nouvelles commandes ou scripts** : mettre à jour `README.md` et `docs/INDEX.md` (commandes utiles).
   - **En fin de Phase 2** : vérifier `docs/design/design-system.md` vs implémentation ; ajouter une note dans "Notes de session" de progress.md (ex. "Phase 2 livrée : …").

4. **Référence** : `docs/design/design-system.md` § 5 (inventaire MVP), `apps/web/tailwind.config.ts` (couleurs surface, alert, relief, warning, republic).

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
Lis docs/progress.md. Phase 1 terminée ; objectif = livrer toute la Phase 2 (composants UI). Suivre l’ordre des sous-sections dans "PHASE 2 — Composants UI" ; cocher chaque case dès que la tâche est faite. Après chaque composant/sous-section : mettre à jour progress.md (cases) ; si nouveaux fichiers, mettre à jour docs/INDEX.md § "Fichiers de code clés". En fin de Phase 2 : note dans "Notes de session". Respecte les règles absolues (pas de service role côté client, pas d’API externe côté navigateur, mobile-first 390px).
```
