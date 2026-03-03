# Progress — France de Macron

> Dernière mise à jour : Mars 2025
> Utiliser ce fichier comme source de vérité pour l'état du projet.
> Cocher les cases au fur et à mesure. Déplacer les items entre colonnes quand nécessaire.

---

## Légende

- `[ ]` À faire
- `[x]` Terminé
- `[~]` En cours
- `[-]` Bloqué / dépendance externe
- `[s]` Skippé / hors scope MVP

---

## PHASE 0 — Scaffold & Architecture

> Objectif : repo prêt à développer, aucune feature réelle.

### Infrastructure repo

- [x] Monorepo pnpm ≥ 10 (apps/web + scripts)
- [x] TypeScript strict configuré (tsconfig.json)
- [x] ESLint 9 (flat config) + Prettier configurés
- [x] .gitignore (secrets, .next, node_modules)
- [x] .env.example avec toutes les variables documentées
- [x] Conventional Commits documentés dans README

### Next.js app scaffold

- [x] App Router Next.js 16 initialisé (`apps/web/`)
- [x] Tailwind CSS configuré (design system "Cooked Authority" complet)
- [x] shadcn/ui configuré (`components.json`)
- [x] Globals CSS (CSS vars, dark mode, grain, utilitaires)
- [x] Layout root (`layout.tsx`) — metadata OG + viewport
- [x] Pages squelette : Home, About, Methodology, Disclaimer
- [x] Route Handlers squelette : `/api/cron/fuel-daily`, `/api/newsletter`, `/api/votes`
- [x] `vercel.json` avec cron 02:30 UTC
- [x] ESLint 9 flat config (`eslint.config.mjs`), lint via `pnpm lint` (ESLint CLI)
- [x] Installer les fonts (Space Grotesk + Inter + JetBrains Mono via `next/font/google`)

### Supabase & DB

- [x] `supabase/config.toml` configuré
- [x] Migration 0000 : `data_sources` + seed sources
- [x] Migration 0001 : `fuel_daily_agg` + contraintes + index
- [x] Migration 0002 : `events` + seed 4 événements historiques
- [x] Migration 0003 : `newsletter_signups` + contraintes anti-spam
- [x] Migration 0004 : `votes` + index unique `(scope, day, fingerprint)`
- [x] Migration 0005 : `fci_daily` + JSONB components/weights
- [x] Migration 0006 : RLS policies complètes (lecture publique / NO insert anon)
- [x] `database.types.ts` — types TypeScript manuels (à régénérer après migrations)
- [x] Appliquer les migrations sur le projet Supabase (local + prod)
- [x] Régénérer `database.types.ts` depuis le vrai schéma : `pnpm run db:types`
- [ ] Ajouter index de performance sur `votes(scope, vote)` pour les agrégats fréquents

### Lib & types

- [x] `src/lib/supabase/client.ts` — createClient() navigateur
- [x] `src/lib/supabase/server.ts` — createReadClient() + createServiceClient()
- [x] `src/lib/utils.ts` — cn(), formatFuelPrice(), getFCILabel(), hashString()
- [x] `src/types/index.ts` — types métier complets

### Documentation

- [x] `README.md` complet
- [x] `docs/INDEX.md` — index de toute la documentation
- [x] `docs/vision.md`
- [x] `docs/product/PRD.md`
- [x] `docs/product/roadmap.md`
- [x] `docs/design/design-system.md`
- [x] `docs/data/sources.md`
- [x] `docs/data/pipeline.md`
- [x] `docs/data/methodology.md`
- [x] `docs/security/threat-model.md`
- [x] `docs/seo/social-sharing.md`
- [x] `docs/kickoff.md`
- [x] `docs/progress.md` (ce fichier)

---

## PHASE 1 — Pipeline de données

> Objectif : avoir des données réelles en base. Prérequis pour tout le reste.

### Script fuel-backfill-j30

- [x] Interface et types définis (`scripts/fuel-backfill-j30/index.ts` placeholder)
- [x] README avec algorithme complet
- [ ] **Implémenter `downloadDayXml(date)`**
  - Fetch `https://donnees.roulez-eco.fr/opendata/jour/YYYYMMDD`
  - Unzip le ZIP (package `adm-zip` ou `yauzl`)
  - Convertir ISO-8859-1 → UTF-8
  - Retry × 3 avec backoff (1s → 5s → 30s)
- [ ] **Implémenter `parseAndAggregate(xml, day)`**
  - Parser XML (`fast-xml-parser`)
  - Filtrer stations en rupture (`<rupture>` sans `fin`)
  - Convertir valeur ÷ 1000 → €/L
  - Filtrer prix aberrants (< 0.5 ou > 5.0 €/L)
  - Calculer avg / min / max / count par `fuel_code`
- [ ] **Implémenter `upsertAggregates(results)`**
  - `INSERT INTO fuel_daily_agg ... ON CONFLICT DO UPDATE`
  - Utiliser `createClient()` de `@supabase/supabase-js` avec service role
- [ ] **Implémenter la boucle principale** (30 jours, gestion des erreurs, skip sur 404)
- [ ] Logger un résumé final (jours traités, agrégats, erreurs)
- [ ] Tester le script en local contre Supabase local

### Script fuel-daily

- [x] Interface et types définis (`scripts/fuel-daily/index.ts` placeholder)
- [x] README avec pseudo-code FCI v1
- [ ] **Extraire le code commun** en `scripts/shared/` (download, parse, upsert)
- [ ] Implémenter le job complet (utiliser le code partagé)
- [ ] Ajouter `FUEL_DATE` env var pour le replay manuel
- [ ] Tester le replay d'une date spécifique

### Calcul FCI v1

- [ ] **Implémenter `calcFCIv1(gazole30j, e10_30j)`** (voir `docs/data/methodology.md`)
  - Score niveau absolu : normalize(prix - baseline, 0, 0.80, 0, 100)
  - Score variation 30j : normalize(var30, -0.10, 0.20, 0, 100)
  - Composition : 0.6 × niveau + 0.4 × variation
- [ ] **Implémenter `calcAndUpsertFCI(day)`**
  - Lire les 30 derniers jours depuis `fuel_daily_agg`
  - Calculer le score
  - Upsert dans `fci_daily` avec `components` et `weights` JSONB
- [ ] Valider les scores calculés vs intuition (pic 2022 ≈ 80+, COVID-2020 ≈ 20)

### Endpoint cron (Vercel)

- [x] Route `/api/cron/fuel-daily` créée avec vérification `CRON_SECRET`
- [ ] **Implémenter la logique réelle** dans la route (appel au job fuel-daily)
- [ ] Configurer `CRON_SECRET` dans Vercel Secrets
- [ ] Tester le cron manuellement via `curl -H "Authorization: Bearer $CRON_SECRET" ...`

---

## PHASE 2 — Composants UI

> Prérequis : Phase 1 complète (données en base). Peuvent être développés en parallèle avec des données mock.

### Setup shadcn/ui

- [ ] Installer les composants de base nécessaires :
  ```bash
  pnpm dlx shadcn@latest add button badge card separator skeleton toast
  ```
- [ ] Créer `src/components/ui/` avec les composants shadcn installés
- [ ] Installer les fonts via `next/font/google` dans `layout.tsx`

### Composant FCIGauge (hero)

- [ ] **`src/components/fci/FCIGauge.tsx`** (Client Component)
  - Ring gauge SVG (arc 270°, sens horaire)
  - Animation `stroke-dashoffset` au montage (1.2s, spring)
  - Couleur selon score : vert/jaune/orange/rouge (seuils 25/50/75)
  - Pulse rouge si score > 75
  - Score central + label microcopy (via `getFCILabel()`)
  - Variation J-1 avec flèche ↑↓
  - Skeleton de chargement (`animate-shimmer`)
  - `aria-label` pour l'accessibilité
  - Props : `score`, `previousScore?`, `updatedAt`, `isLoading?`

### Section Hero (home)

- [ ] **`src/components/fci/FCIHero.tsx`** (Server Component outer, Client inner)
  - Fetch `fci_daily` (dernière entrée) dans le Server Component
  - Passer les données à `FCIGauge`
  - Tagline ironique selon le score
  - Date "Mis à jour le JJ MMM"

### Composant FuelChart

- [ ] **`src/components/fuel/FuelChart.tsx`** (Client Component — Recharts)
  - `LineChart` multi-carburant (gazole, e10, sp98 minimum)
  - Axe X : dates format "dd MMM"
  - Axe Y : prix €/L (3 décimales)
  - Tooltip custom (prix par carburant + variation J/J)
  - Points de spike mis en évidence (circle rouge si Δ > 3% J/J)
  - Annotations événements (ligne verticale + label au hover)
  - Animation d'entrée progressive
  - Responsive (ResponsiveContainer)
  - Props : `data: FuelChartDataPoint[]`, `events: ChartEvent[]`, `activePeriod`

### Composant PeriodChip

- [ ] **`src/components/fuel/PeriodChip.tsx`** (Client Component)
  - Variants : default | active | disabled
  - Labels : "7j" / "30j" / "90j" / "1 an" / "5 ans"
  - Badge "Bientôt" sur 90j+ en MVP
  - Feedback tactile (scale 0.95 au press)

### Section Carburants

- [ ] **`src/components/fuel/FuelSection.tsx`** (Server Component outer)
  - Fetch `fuel_daily_agg` (30 derniers jours) + `events` (scope: fuel)
  - Prix actuels sous forme de badges (avec variation vs J-7)
  - Label microcopy selon tendance ("Ça pique depuis 6 mois")
  - Passer données au `FuelChart`

### Composant CookedVote

- [ ] **`src/components/vote/CookedVote.tsx`** (Client Component)
  - Deux boutons : 🔥 Cooked / 🌱 Pas du tout
  - Fetch initial du comptage (`GET /api/votes?scope=global`)
  - Submit vers `POST /api/votes`
  - États : idle → voted (stockage localStorage) → barre de ratio
  - Animation "pop" du compteur après vote
  - Gestion erreur (toast)
  - Props : `scope: VoteScope`

### Composant NewsletterForm

- [ ] **`src/components/newsletter/NewsletterForm.tsx`** (Client Component)
  - Champ email visible
  - Champ `website` caché (honeypot — CSS display trick, pas display:none)
  - États : idle | loading | success | error
  - Submit vers `POST /api/newsletter`
  - Message de confirmation
  - Props : `source?: string` (pour tracking)

### Layout & Navigation

- [ ] **`src/components/layout/Header.tsx`**
  - Logo + nom du site
  - Nav : Accueil / À propos / Méthodo
  - Sticky, transparent → opaque au scroll
- [ ] **`src/components/layout/Footer.tsx`**
  - Liens : À propos / Méthodologie / Disclaimer / Sources
  - Copyright + disclaimer court
  - Lien GitHub (si repo public)
- [ ] Intégrer Header + Footer dans `layout.tsx`

---

## PHASE 3 — Page Home complète

> Prérequis : Phase 1 + Phase 2 (composants prêts).

- [ ] **`src/app/page.tsx`** — Fetch réel des données Supabase
  - `fci_daily` (dernière entrée + J-1 pour variation)
  - `fuel_daily_agg` (30 derniers jours, gazole + e10 + sp98)
  - `events` (scope: fuel, plage visible)
  - `votes` comptage global
- [ ] Assembler les sections : FCIHero + FuelSection + CookedVote + NewsletterForm
- [ ] Smooth scroll entre sections (liens d'ancre)
- [ ] Animations `fade-in-up` au scroll (IntersectionObserver)
- [ ] Tester rendu SSR (pas de hydration mismatch)
- [ ] Tester mobile 390px

---

## PHASE 4 — APIs backend

### Route Handler : newsletter

- [x] Route créée (`/api/newsletter`) avec placeholder
- [ ] Ajouter validation Zod du body (`email`, `locale`, `source`, `honeypot`)
- [ ] Vérifier honeypot vide côté serveur
- [ ] Valider format email (regex)
- [ ] Rate limit par IP (via `request.headers.get('x-forwarded-for')` + compteur Supabase ou Upstash)
- [ ] Insérer via `createServiceClient()`
- [ ] Gérer le conflit `unique(email)` → retourner 200 sans message d'erreur (pas d'enum harvesting)
- [ ] Retourner `{ success: true }` ou `{ error: string }`

### Route Handler : votes

- [x] Route créée (`/api/votes`) avec placeholder GET + POST
- [ ] **GET** : agréger `votes` par scope → `{ cooked, uncooked, total, ratio_cooked }`
- [ ] **POST** : valider body (scope, vote, fingerprint_hash)
- [ ] Générer `ip_hash` côté serveur (`hashString(request.ip)`)
- [ ] Insérer via `createServiceClient()` avec gestion du conflit unique (409 si déjà voté)
- [ ] Rate limit : max 10 votes / IP / heure
- [ ] Retourner les nouveaux comptages après vote

---

## PHASE 5 — SEO & Production

- [ ] Générer OG image statique (`public/og-image.png`) — 1200×630px design Cooked Authority
- [ ] `src/app/sitemap.ts` — sitemap XML Next.js
- [ ] `public/robots.txt` — Allow: /, Disallow: /api/
- [ ] JSON-LD structured data sur la landing page
- [ ] Vérifier meta descriptions < 155 caractères sur toutes les pages
- [ ] Audit Lighthouse (objectif > 90 sur perf + SEO + accessibilité)
- [ ] Vérifier Core Web Vitals : LCP < 2.5s, CLS < 0.1

---

## PHASE 6 — Déploiement & Monitoring

- [ ] Configurer projet Vercel
  - [ ] Connecter le repo GitHub
  - [ ] Configurer toutes les variables d'env dans Vercel Secrets
  - [ ] Activer le cron Vercel (`vercel.json`)
- [ ] Déployer Supabase en production
  - [ ] Appliquer les migrations : `pnpm exec supabase db push --linked` (ou `pnpm run db:push` en local)
  - [ ] Vérifier RLS activé sur toutes les tables (dashboard Supabase)
  - [ ] Configurer les domaines autorisés dans Supabase Auth (CORS)
- [ ] Lancer le backfill initial en production : `pnpm fuel:backfill`
- [ ] Vérifier que le premier cron s'est bien exécuté
- [ ] Configurer les alertes Vercel (email sur build fail)
- [ ] Tester `/api/cron/fuel-daily` en prod avec le `CRON_SECRET`

---

## PHASE 7 — QA & Lancement

- [ ] Tester le flux complet : pipeline → données → affichage graphique
- [ ] Tester inscription newsletter (vrai email)
- [ ] Tester vote cooked/uncooked + contrainte 1 vote/jour
- [ ] Tester sur mobile réel (iOS Safari + Android Chrome)
- [ ] Tester avec `prefers-reduced-motion: reduce` (animations désactivées)
- [ ] Vérifier CSP headers (securityheaders.com)
- [ ] Vérifier qu'aucun secret n'est dans les logs Vercel
- [ ] Checklist sécurité complète (`docs/security/threat-model.md#checklist`)
- [ ] Soft launch (partage en privé)
- [ ] Public launch

---

## BACKLOG POST-MVP (v1.1+)

> Ne pas implémenter avant le lancement. Documenter ici pour ne pas perdre les idées.

### v1.1 — Peaufinage

- [ ] Installer PostHog analytics (scroll depth, heatmap)
- [ ] OG image dynamique via `@vercel/og` (`/api/og?score=74`)
- [ ] Backfill 90 jours pour activer les filtres 90j
- [ ] Backfill 1 an via archives annuelles (`/opendata/annee/YYYY`)
- [ ] Tests unitaires : parsing XML, calcul FCI, hashString
- [ ] Ajouter plus d'annotations événements historiques

### v1.2 — Engagement & viralité

- [ ] Vote par section (scope: fuel, etc.)
- [ ] Bouton "Partager" avec Web Share API (fallback Twitter)
- [ ] Texte de partage pré-rempli avec le score FCI du jour
- [ ] Service email (Resend) pour la newsletter

### v2.0 — Multi-indicateurs

- [ ] Module inflation alimentaire (INSEE IPC)
- [ ] Module loyers
- [ ] FCI v2 (multi-composantes + pondérations révisées)
- [ ] Décomposition interactive du score FCI

### v2.1 — Comparaison européenne

- [ ] Intégration Eurostat API
- [ ] Comparatif France vs UE

### v3.0 — Stories narratives

- [ ] Format slides scrollables
- [ ] "Mon FCI personnel" (basé sur profil)

### v4.0 — Monétisation

- [ ] Dons Stripe
- [ ] API publique limitée (journalistes)

---

## Notes de session

> Utiliser cette section pour noter les décisions prises en cours de route, les bugs bloquants, et les déviations par rapport au plan.

### Mars 2025 — Session initiale

- Scaffold complet livré (Phase 0 entièrement ✅)
- Stack confirmée : Next.js 16 + TypeScript strict + pnpm ≥ 10 + Supabase + Recharts
- ESLint 9 flat config (eslint.config.mjs), Supabase CLI v2 en devDependencies
- Design system "Cooked Authority" défini dans `tailwind.config.ts`
- Décision : dark-only en MVP (pas de toggle mode clair)
- Décision : Vercel Cron (pas GitHub Actions) pour le job quotidien
- Décision : Recharts en MVP, migration ECharts possible en v2 si besoin zoom/brush
- Migration `fuel_daily_agg` : constraint `chk_fuel_code` → à étendre si nouveau carburant ajouté

---

## Métriques à suivre

| Métrique | Objectif MVP | Actuel |
|---|---|---|
| Emails collectés (NSM) | > 500 au lancement | 0 |
| Taux de conversion visiteur → email | > 3% | — |
| Score Lighthouse Performance | > 90 | — |
| Score Lighthouse SEO | > 95 | — |
| LCP | < 2.5s | — |
| CLS | < 0.1 | — |
| Sample count moyen carburant | > 1000 stations | — |
| Uptime cron quotidien | > 99% | — |
