-- =============================================================================
-- Migration 0006 : Row Level Security (RLS) — Toutes les tables
--
-- Stratégie générale :
--   - Données publiques (fuel, events, fci) : lecture publique, NO INSERT/UPDATE client
--   - Données sensibles (newsletter, votes) : NO accès client du tout
--     → les écritures passent UNIQUEMENT via le service role (Server Actions Next.js)
--
-- Pourquoi bloquer les inserts publics sur votes/newsletter ?
--   Même avec RLS activé, un attaquant avec la clé anon peut tenter des inserts.
--   En bloquant côté DB ET côté serveur, on applique le principe de défense en profondeur.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Activer RLS sur toutes les tables
-- ---------------------------------------------------------------------------

alter table public.data_sources       enable row level security;
alter table public.fuel_daily_agg     enable row level security;
alter table public.events             enable row level security;
alter table public.newsletter_signups enable row level security;
alter table public.votes              enable row level security;
alter table public.fci_daily          enable row level security;

-- ---------------------------------------------------------------------------
-- data_sources — lecture publique, pas d'écriture client
-- ---------------------------------------------------------------------------

create policy "data_sources: lecture publique"
  on public.data_sources
  for select
  to anon, authenticated
  using (true);

-- Pas de politique INSERT/UPDATE/DELETE → impossible pour anon

-- ---------------------------------------------------------------------------
-- fuel_daily_agg — lecture publique, pas d'écriture client
-- ---------------------------------------------------------------------------

create policy "fuel_daily_agg: lecture publique"
  on public.fuel_daily_agg
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- events — lecture publique, pas d'écriture client
-- ---------------------------------------------------------------------------

create policy "events: lecture publique"
  on public.events
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- fci_daily — lecture publique, pas d'écriture client
-- ---------------------------------------------------------------------------

create policy "fci_daily: lecture publique"
  on public.fci_daily
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- newsletter_signups — AUCUN accès client (service role only)
-- ---------------------------------------------------------------------------
-- Pas de politique SELECT/INSERT/UPDATE/DELETE pour anon ou authenticated.
-- Le service role bypass RLS par définition → pas de policy nécessaire pour lui.
-- Résultat : un appel Supabase avec la clé anon retourne une erreur 403 sur cette table.

-- Pour plus de clarté et d'audit, on peut ajouter une policy qui refuse explicitement :
create policy "newsletter_signups: refus accès public"
  on public.newsletter_signups
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- votes — lecture publique des comptages, NO INSERT client
-- ---------------------------------------------------------------------------

-- Lecture des comptages publics (pour afficher les ratios cooked/uncooked)
create policy "votes: lecture publique"
  on public.votes
  for select
  to anon, authenticated
  using (true);

-- INSERT refusé pour anon (passe par le Route Handler avec service role)
create policy "votes: refus insert public"
  on public.votes
  for insert
  to anon, authenticated
  with check (false);

-- ---------------------------------------------------------------------------
-- Grants minimaux sur le rôle anon
-- (Supabase crée ces grants par défaut, mais explicite ici pour l'audit)
-- ---------------------------------------------------------------------------

grant select on public.data_sources   to anon;
grant select on public.fuel_daily_agg to anon;
grant select on public.events         to anon;
grant select on public.fci_daily      to anon;
grant select on public.votes          to anon;

-- Aucun grant INSERT/UPDATE/DELETE sur anon pour fuel, events, fci, newsletter, votes

-- ---------------------------------------------------------------------------
-- Commentaires sur la stratégie
-- ---------------------------------------------------------------------------

comment on policy "newsletter_signups: refus accès public" on public.newsletter_signups is
  'Bloque tout accès via la clé anonyme Supabase. Les inserts passent uniquement
   par createServiceClient() dans les Server Actions Next.js, qui bypass RLS.';

comment on policy "votes: refus insert public" on public.votes is
  'Bloque les inserts directs via la clé anonyme. Le Route Handler /api/votes
   utilise createServiceClient() (service role) qui bypass RLS, après validation
   côté serveur (rate-limit, fingerprint, honeypot).';
