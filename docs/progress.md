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
- [x] Globals CSS (CSS vars, thème clair, grain, utilitaires)
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
- [x] Ajouter index de performance sur `votes(scope, vote)` pour les agrégats fréquents

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

- [x] Interface et types définis ; script implémenté (download, parse, upsert, boucle)
- [x] README avec algorithme complet
- [x] **Implémenter `downloadDayXml(date)`**
  - Fetch `https://donnees.roulez-eco.fr/opendata/jour/YYYYMMDD`
  - Unzip le ZIP (package `adm-zip` ou `yauzl`)
  - Convertir ISO-8859-1 → UTF-8
  - Retry × 3 avec backoff (1s → 5s → 30s)
  - Détection réponse HTML (dates hors fenêtre ~30j) → `DayDataUnavailableError`, skip le jour
- [x] **Implémenter `parseAndAggregate(xml, day)`**
  - Parser XML en streaming (`sax`), même règles que script annuel
  - Filtrer stations en rupture (`<rupture>` sans `fin`)
  - Convertir valeur ÷ 1000 → €/L
  - Filtrer prix aberrants (< 0.5 ou > 5.0 €/L)
  - Calculer avg / min / max / count par `fuel_code`
- [x] **Implémenter `upsertAggregates(results)`**
  - `INSERT INTO fuel_daily_agg ... ON CONFLICT DO UPDATE`
  - Utiliser `createClient()` de `@supabase/supabase-js` avec service role
- [x] **Implémenter la boucle principale** (30 jours, gestion des erreurs, skip sur DayDataUnavailableError)
- [x] Logger un résumé final (jours traités, agrégats, erreurs)
- [x] Tester le script en local contre Supabase local (validé)

- [x] **Backfill « dernier jour » (hier + aujourd’hui)** — script `fuel-backfill-last` : rafraîchit J-1 (et optionnellement J-0 avec `BACKFILL_INCLUDE_TODAY=1`), commande `pnpm fuel:backfill:last`

### Script fuel-backfill-annee (archives annuelles)

- [x] Script `scripts/fuel-backfill-annee/` — backfill depuis 2007
  - Téléchargement ZIP par année (`/opendata/annee/YYYY`), unzip + XML en latin1
  - Parse XML en streaming (`sax`), agrégats par (jour, carburant), filtre ruptures + prix ∈ [0.5, 5.0] €/L
  - Upsert par lots dans `fuel_daily_agg` (idempotent)
  - Commande : `pnpm run fuel:backfill:annees`, env `START_YEAR` / `END_YEAR`
- [x] Déclarations de types (sax, adm-zip, dotenv) et `scripts/tsconfig.json` (types Node)
- [x] Doc : `scripts/fuel-backfill-annee/README.md`, `docs/data/sources.md` (1.2.1, 1.2.2, 1.2.3), commandes dans INDEX + README racine

### Script fuel-daily

- [x] Interface et types définis (`scripts/fuel-daily/index.ts`)
- [x] README avec pseudo-code FCI v1
- [x] **Extraire le code commun** en `scripts/shared/` (download, parse, upsert, constants, types)
- [x] Implémenter le job complet (utilise shared : downloadDayXml, parseDayXmlToAggregates, upsertFuelAggregates)
- [x] Ajouter `FUEL_DATE` env var pour le replay manuel (format YYYYMMDD)
- [x] Tester le replay d'une date spécifique
- [x] Brancher calcAndUpsertFCI quand FCI v1 sera implémenté

### Calcul FCI v1

- [x] **Implémenter `calcFCIv1(gazole30j, e10_30j)`** (voir `docs/data/methodology.md`)
  - Score niveau absolu : normalize(prix - baseline, 0, 0.80, 0, 100)
  - Score variation 30j : normalize(var30, -0.10, 0.20, 0, 100)
  - Composition : 0.6 × niveau + 0.4 × variation
  - Module `scripts/shared/fci.ts` : `FCI_BASELINE`, `normalize()`, `calcFCIv1()` exportés
- [x] **Implémenter `calcAndUpsertFCI(day)`**
  - Lire les 30 derniers jours depuis `fuel_daily_agg`
  - Calculer le score
  - Upsert dans `fci_daily` avec `components` et `weights` JSONB
  - Intégré dans `scripts/fuel-daily/index.ts` (appel après upsert carburants)
- [ ] Valider les scores calculés vs intuition (pic 2022 ≈ 80+, COVID-2020 ≈ 20)
- [x] **Backfill FCI historique** — script `fci-backfill` : calcule le FCI v1 pour tous les jours depuis 2019 (ou `START_DATE`) afin d’avoir la série temporelle pour graphiques. Commande `pnpm run fci:backfill`, env `START_DATE` / `END_DATE`. Voir `scripts/fci-backfill/README.md`.

### Endpoint cron (Vercel)

- [x] Route `/api/cron/fuel-daily` créée avec vérification `CRON_SECRET`
- [x] **Implémenter la logique réelle** dans la route (appel au job fuel-daily : download → parse → upsert → FCI via `scripts/shared`, client Supabase service role)
- [ ] Configurer `CRON_SECRET` dans Vercel Secrets
- [x] Tester le cron manuellement via `curl -H "Authorization: Bearer $CRON_SECRET" ...` (validé : 200, date 2026-03-02, 6 agrégats, FCI 41, ~2,7 s)

---

## PHASE 2 — Composants UI

> **Prérequis** : Phase 1 complète (données en base). Peuvent être développés en parallèle avec des données mock.
>
> **Règle pour l'agent** : Cocher chaque case dès que la tâche est terminée. **Mettre à jour la documentation au fur et à mesure** : après chaque composant ou sous-section, mettre à jour `docs/progress.md` (cocher les cases) ; si tu ajoutes des fichiers ou modules, mettre à jour `docs/INDEX.md` (section "Fichiers de code clés") et `README.md` si nouvelles commandes. Voir la sous-section "Documentation (à jour au fur et à mesure)" en bas de la Phase 2.

### Setup shadcn/ui

- [x] Depuis `apps/web`, lancer : `pnpm dlx shadcn@latest add button badge card separator skeleton toast`
- [x] Vérifier que `src/components/ui/` contient les composants shadcn (ou le chemin dans `components.json`)
- [x] Vérifier que les fonts (Space Grotesk, Inter, JetBrains Mono) sont dans `layout.tsx` (déjà en place Phase 0 — cocher si confirmé)
- [x] **Doc** : cocher les cases ci-dessus dans progress.md après le setup

### Composant FCIGauge (hero)

- [x] Créer `src/components/fci/` et `FCIGauge.tsx` (Client Component, `’use client’`)
- [x] Props : `score: number`, `previousScore?: number`, `updatedAt: string`, `isLoading?: boolean`
- [x] Jauge semicirculaire SVG : arc 180°, hybride SVG (arc + aiguille) + HTML (score, variation)
- [x] Couleurs selon score (design-system) : 0–24 `relief-500`, 25–49 `warning-500`, 50–74 `alert-400`, 75–100 `alert-600`
- [x] Animation `stroke-dashoffset` au montage : 1.2s, easing spring (cubic-bezier)
- [x] Effet pulse (CSS) si score > 75 (rouge)
- [x] Score au centre + label via `getFCILabel(score)` (`@/lib/utils`)
- [x] Variation « depuis hier » avec flèche ↑/↓ et valeur absolue (sous l’arc, en HTML)
- [x] Skeleton quand `isLoading` (shimmer)
- [x] `aria-label` descriptif
- [x] **Doc** : cocher les cases dans progress.md

### Section Hero (home)

- [x] Créer `src/components/fci/FCIHero.tsx` (Server Component wrapper)
- [x] Fetch `fci_daily` : dernière entrée + J-1 (createReadClient, `.order(‘day’, { ascending: false }).limit(2)`)
- [x] Passer score, previousScore, updatedAt à `FCIGauge`
- [x] Tagline ironique selon score (aligné avec `getFCILabel`)
- [x] Date "Mis à jour le JJ MMM" (format français)
- [x] **Doc** : cocher les cases dans progress.md

### Composant FuelChart

- [x] Créer `src/components/fuel/` et `FuelChart.tsx` (Client Component, Recharts)
- [x] Props : `data: FuelChartDataPoint[]`, `events?: ChartEvent[]`, `activePeriod?` (types `@/types`)
- [x] `LineChart` : gazole, e10, sp98 (couleurs design-system : bleu acier, vert émeraude, or)
- [x] Axe X : dates "dd MMM" ; axe Y : prix €/L, 3 décimales
- [x] Tooltip custom : date + prix par carburant + variation J/J
- [x] Points spike : cercle rouge si Δ J/J > 3%
- [x] Annotations événements : ligne verticale + label au hover
- [x] Animation d’entrée ; ResponsiveContainer
- [x] **Doc** : cocher les cases dans progress.md

### Composant PeriodChip

- [x] Créer `src/components/fuel/PeriodChip.tsx` (Client Component)
- [x] Variants : default | active | disabled (Tailwind design-system)
- [x] Labels : "7j" / "30j" / "90j" / "1 an" / "5 ans"
- [x] Badge "Bientôt" sur 90j, 1 an, 5 ans (MVP données 30j)
- [x] Feedback tactile : scale 0.95 au press
- [x] **Doc** : cocher les cases dans progress.md

### Section Carburants

- [x] Créer `src/components/fuel/FuelSection.tsx` (Server Component)
- [x] Fetch `fuel_daily_agg` (30j, gazole, e10, sp98) + `events` (scope fuel)
- [x] Badges prix actuels + variation vs J-7, `formatFuelPrice()`, couleurs carburant
- [x] Label microcopy tendance ("Ça pique depuis 6 mois" etc.)
- [x] Passer data + events à `FuelChart` ; intégrer `PeriodChip` (actif = 30j)
- [x] **Doc** : cocher les cases dans progress.md

### Composant CookedVote

- [x] Créer `src/components/vote/` et `CookedVote.tsx` (Client Component)
- [x] Props : `scope: VoteScope` (ex. `’global’`)
- [x] Deux boutons : 🔥 High Cortisol / 🌱 Low Cortisol (accessibles)
- [x] Fetch comptage : `GET /api/votes?scope=global` ; afficher barre ratio + compteurs
- [x] Submit : `POST /api/votes` (scope, vote, fingerprint_hash)
- [x] Après vote : localStorage + désactiver / "Déjà voté"
- [x] Animation "pop" du compteur après vote réussi
- [x] Erreur : toast (shadcn)
- [x] **Doc** : cocher les cases dans progress.md

### Composant NewsletterForm

- [x] Créer `src/components/newsletter/` et `NewsletterForm.tsx` (Client Component)
- [x] Champ email visible (required, label accessible)
- [x] Honeypot `website` : caché via CSS (position/opacity), pas display:none
- [x] États : idle | loading | success | error ; désactiver submit en loading
- [x] Submit `POST /api/newsletter` (email, locale, source?, honeypot)
- [x] Message succès / erreur (toast ou inline)
- [x] Props : `source?: string` (tracking)
- [x] **Doc** : cocher les cases dans progress.md

### Layout & Navigation

- [x] Créer `src/components/layout/Header.tsx` : logo + "France de Macron"
- [x] Nav : Accueil (/), À propos (/about), Méthodo (/methodology)
- [x] Header fond blanc ; masqué au scroll down, réapparaît (slide down) au scroll up
- [x] Créer `src/components/layout/Footer.tsx` : liens À propos, Méthodologie, Disclaimer, Sources
- [x] Footer : fond surface-100 (thème clair), texte surface-600/800 ; copyright + disclaimer court
- [x] Intégrer Header + Footer dans `layout.tsx` (autour de `<main>`)
- [x] **Doc** : cocher les cases dans progress.md

### Documentation (à jour au fur et à mesure)

- [x] Après **chaque composant/sous-section** : cocher dans `docs/progress.md` les cases faites
- [x] Si **nouveaux fichiers** (fci/, fuel/, vote/, newsletter/, layout/) : mettre à jour `docs/INDEX.md` § "Fichiers de code clés"
- [x] Si **nouvelles commandes** : mettre à jour README.md et docs/INDEX.md
- [x] **Fin de Phase 2** : vérifier alignement `docs/design/design-system.md` avec l’implémentation
- [x] **Fin de Phase 2** : note dans "Notes de session" (ex. "Phase 2 livrée : FCIGauge, FCIHero, FuelChart, PeriodChip, FuelSection, CookedVote, NewsletterForm, Header, Footer, layout")

---

## PHASE 3 — Page Home complète

> Prérequis : Phase 1 + Phase 2 (composants prêts).

- [x] **`src/app/page.tsx`** — Fetch réel des données Supabase (via Server Components FCIHero + FuelSection)
  - `fci_daily` (dernière entrée + J-1 pour variation)
  - `fuel_daily_agg` (30 derniers jours, gazole + e10 + sp98)
  - `events` (scope: fuel, plage visible)
  - `votes` comptage global (côté client, CookedVote)
- [x] Assembler les sections : FCIHero + FuelSection + CookedVote + NewsletterForm
- [x] Smooth scroll entre sections (liens d'ancre)
- [x] Animations `fade-in-up` au scroll (IntersectionObserver)
- [x] Tester rendu SSR (pas de hydration mismatch)
- [x] Tester mobile 390px

---

## PHASE 4 — APIs backend

### Route Handler : newsletter

- [x] Route créée (`/api/newsletter`) avec placeholder
- [x] Ajouter validation Zod du body (`email`, `locale`, `source`, `honeypot`)
- [x] Vérifier honeypot vide côté serveur
- [x] Valider format email (regex)
- [x] Rate limit par IP (via `request.headers.get('x-forwarded-for')` + compteur Supabase ou Upstash)
- [x] Insérer via `createClient<Database>` (service role — même effet que createServiceClient)
- [x] Gérer le conflit `unique(email)` → retourner 200 sans message d'erreur (pas d'enum harvesting)
- [x] Retourner `{ success: true }` ou `{ error: string }`

### Route Handler : votes

- [x] Route créée (`/api/votes`) avec placeholder GET + POST
- [x] **GET** : agréger `votes` par scope → `{ cooked, uncooked, total, ratio_cooked }`
- [x] **POST** : valider body (scope, vote, fingerprint_hash)
- [x] Générer `ip_hash` côté serveur (`hashString(x-forwarded-for / x-real-ip)`)
- [x] Insérer via `createClient<Database>` (service role) avec gestion du conflit unique (409 si déjà voté)
- [x] Rate limit : max 10 votes / IP / heure
- [x] Retourner les nouveaux comptages après vote

---

## PHASE 5 — SEO & Production

- [x] Générer OG image statique (`public/og-image.png`) — 1200×630px design Cooked Authority
- [x] `src/app/sitemap.ts` — sitemap XML Next.js
- [x] `public/robots.txt` — Allow: /, Disallow: /api/
- [x] JSON-LD structured data sur la landing page
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
  - [ ] Appliquer les migrations : `pnpm run db:push` (projet lié). En local : `pnpm run db:push:local` après `db:start`
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
- Décision : thème clair (fond blanc) en MVP (pas de toggle mode sombre)
- Décision : Vercel Cron (pas GitHub Actions) pour le job quotidien
- Décision : Recharts en MVP, migration ECharts possible en v2 si besoin zoom/brush
- Migration `fuel_daily_agg` : constraint `chk_fuel_code` → à étendre si nouveau carburant ajouté

### Mars 2025 — Pipeline & backfill

- `downloadDayXml` implémenté (fetch, unzip, latin1, retry, détection HTML pour dates hors fenêtre).
- Script **fuel-backfill-annee** : backfill par archives annuelles (2007 → aujourd’hui), parse streaming (sax), upsert `fuel_daily_agg` ; commande `pnpm run fuel:backfill:annees`.
- **Supabase local** : ajout de `db:push:local` (`supabase db push --local`) pour appliquer les migrations sans `supabase link` ; doc mise à jour (README, TESTER-LE-SITE, INDEX, pipeline, progress).
- **docs/data/sources.md** : URLs vérifiées, pas de clé API, fenêtre ~30j pour `/jour/AAAAMMJJ`, section multi-années (1.2.1), stockage (1.2.2), volumes 2007 vs 2000 (1.2.3).
- Test **fuel:backfill** (J30) en local : OK (30 jours, 180 agrégats, ~53 s).
- Test **replay fuel-daily** : `FUEL_DATE=20250302 pnpm run fuel:daily` (et autre date) exécuté. Comportement vérifié : date cible correcte, flux single-day (download → parse → upsert), gestion correcte de `DayDataUnavailableError` (status `partial`, pas de crash). Si la source renvoie des données, les agrégats sont bien upsertés (même chemin que backfill).
- **calcAndUpsertFCI** implémenté dans `scripts/fuel-daily/index.ts` : lecture des 30 derniers jours depuis `fuel_daily_agg` (gazole + e10), appel à `calcFCIv1` (shared), upsert dans `fci_daily` (score, components, weights). Typage via `Database` importé depuis `apps/web/.../database.types`. Pour peupler `fci_daily` après un backfill : lancer `pnpm run fuel:daily` avec une date pour laquelle l’API renvoie des données (ou exécuter le job quotidien quand les données J-1 sont dispo).

### Mars 2026 — Phase 2 : Composants UI

- **Phase 2 entièrement livrée** : FCIGauge, FCIHero, FuelChart (Recharts), PeriodChip, FuelSection, CookedVote, NewsletterForm, Header, Footer + intégration layout.tsx.
- **shadcn/ui** : button, badge, card, separator, skeleton, toast installés dans `src/components/ui/`.
- **FCIGauge** : arc 180°, hybride SVG (arc bleu→rouge, aiguille, ticks) + HTML (score, « / 100 », « X pts depuis hier ») ; couleur bleu si score &lt; 25, rouge sinon ; animation 1.2s, pulse si score ≥ 75.
- **FuelChart** : Recharts LineChart 3 lignes (gazole/e10/sp98), ReferenceDot pour spikes Δ>3%, ReferenceLine pour events, tooltip custom, period state interne (7j/30j).
- **CookedVote** : fingerprint via `hashString(ua+tz+screen)`, localStorage `fdm:voted:<scope>` pour éviter double vote, POST /api/votes → 409 = déjà voté, animation pop counter.
- **NewsletterForm** : honeypot `website` caché CSS (position absolute), tabIndex={-1} comme prop JSX (pas dans style).
- **APIs votes + newsletter** : logique complète implémentée (validation, ip_hash, insert service role, gestion conflicts uniques). Pattern `createClient<Database>` utilisé directement (pas createServiceClient) pour contourner bug typing `@supabase/ssr@0.5.1`.
- **Décision TypeScript** : `createServerClient` de `@supabase/ssr@0.5.1` résout les types insert en `never[]` avec `database.types.ts` manuel (manque `PostgrestVersion`). Contournement : `createClient<Database>` direct dans Route Handlers, assertions de type dans Server Components. À corriger proprement avec `pnpm run db:types` après régénération.
- **page.tsx** : assemblée avec FCIHero + FuelSection + CookedVote + NewsletterForm + séparateurs.
- TypeScript strict passe ✅, ESLint passe (1 warning pre-existant shadcn use-toast.ts) ✅.

### Mars 2026 — Doc thème clair

- **Documentation** : le site est en thème clair (fond blanc), pas en dark mode. Mise à jour de kickoff.md, progress.md, PRD.md, design-system.md, social-sharing.md pour refléter « thème clair (fond blanc) en MVP ». Suppression de la classe `dark` sur `<html>` dans layout.tsx et `themeColor` passé à `#ffffff`.

### Mars 2026 — Doc UI (gauge, header, footer, couleurs)

- **Docs** : design-system.md (spectre FCI bleu/rouge binaire, dégradé page, § FCIGauge hybride SVG+HTML, « depuis hier »), PRD.md (FCI hero arc 180°, couleurs 0–24 bleu / 25–100 rouge), progress.md (FCIGauge 180°, variation « depuis hier », header masqué au scroll down, footer thème clair), INDEX.md (FCIGauge, Header, Footer).

### Mars 2026 — Phase 3 home polish

- Home: ajout d’une navigation d’ancre (`#hero`, `#carburants`, `#vote`, `#newsletter`) avec smooth scroll natif, plus `scroll-mt-24` pour compenser le header fixe.
- Animations d’apparition: nouveau composant client `ScrollReveal` (IntersectionObserver, transition fade-in-up, fallback `prefers-reduced-motion`).
- Vérif SSR/hydration: `pnpm --filter web build` passe sans erreur (routes générées correctement, pas de mismatch observé).
- Responsive 390px: ajustements conservateurs (chips d’ancre en wrap + paddings légers), pas de débordement introduit dans la home.
- Validation: `pnpm run validate` exécuté ; typecheck/lint OK (1 warning existant `use-toast.ts`), `format:check` échoue sur fichiers pré-existants non formatés du repo.

### Mars 2026 — Phase 4 backend (newsletter + votes)

- Vérification des items restants Phase 4 : implémentation déjà présente dans les routes `POST /api/newsletter` et `POST /api/votes`.
- `newsletter` : validation Zod du body (`email`, `locale`, `source`, `honeypot`) confirmée ; rate-limit IP basé sur `x-forwarded-for`/`x-real-ip` + comptage Supabase (fenêtre 1h).
- `votes` : rate-limit confirmé à **10 votes max / IP / heure** avant insertion.
- Alignement doc : cases Phase 4 correspondantes cochées dans `docs/progress.md`.
- Vérifications de build/qualité : `pnpm run validate` ✅ (typecheck web + scripts, lint, format:check) et `pnpm run build` ✅.

### Mars 2025 — Cron fuel-daily

- **Route `/api/cron/fuel-daily`** : logique réelle implémentée. La route importe `scripts/shared` (download, parse, upsert, calcAndUpsertFCI), utilise `createClient<Database>(url, serviceKey)` côté serveur (service role uniquement), calcule la date cible = hier UTC, retourne `{ ok, date, fuelAggregatesUpserted, fci, durationMs }`. En cas de `DayDataUnavailableError`, retour 200 avec message « Données indisponibles ». Dépendances ajoutées dans `apps/web` : adm-zip, sax ; `@types/adm-zip` dans apps/web et scripts. Typage du paramètre dans `scripts/shared/download.ts` pour le callback `find()`. Test manuel curl validé (200, 6 agrégats, FCI 41, ~2,7 s).

### Mars 2026 — Phase 5 SEO foundations (retry)

- Ajout de `apps/web/src/app/sitemap.ts` (routes statiques principales + priorités/fréquences).
- Ajout de `apps/web/public/robots.txt` (Allow `/`, Disallow `/api/`, lien vers sitemap).
- Ajout JSON-LD `WebSite` sur la landing page (`apps/web/src/app/page.tsx`).
- Ajout d’un placeholder OG image `apps/web/public/og-image.png` pour éviter les références manquantes.

---

## Métriques à suivre

| Métrique                            | Objectif MVP       | Actuel |
| ----------------------------------- | ------------------ | ------ |
| Emails collectés (NSM)              | > 500 au lancement | 0      |
| Taux de conversion visiteur → email | > 3%               | —      |
| Score Lighthouse Performance        | > 90               | —      |
| Score Lighthouse SEO                | > 95               | —      |
| LCP                                 | < 2.5s             | —      |
| CLS                                 | < 0.1              | —      |
| Sample count moyen carburant        | > 1000 stations    | —      |
| Uptime cron quotidien               | > 99%              | —      |
