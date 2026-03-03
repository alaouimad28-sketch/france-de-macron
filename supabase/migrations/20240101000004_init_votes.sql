-- =============================================================================
-- Migration 0004 : Table votes
-- Votes cooked / uncooked (global + par section)
-- =============================================================================

create table if not exists public.votes (
  id               uuid        primary key default gen_random_uuid(),
  -- Portée du vote (global ou section spécifique)
  scope            text        not null,
  -- Valeur du vote
  vote             text        not null,
  created_at       timestamptz not null default now(),

  -- Données anti-abus (pseudo-anonymes)
  fingerprint_hash text        not null,
  ip_hash          text,
  user_agent       text,

  -- Jour du vote (UTC) — utilisé pour la contrainte 1 vote/jour/empreinte
  day              date        not null default (now() at time zone 'utc')::date
);

-- Contrainte de valeur du vote
alter table public.votes
  add constraint chk_vote_value
  check (vote in ('cooked', 'uncooked'));

-- Contrainte de scope
alter table public.votes
  add constraint chk_vote_scope
  check (scope in ('global', 'fuel', 'inflation', 'loyers'));
  -- Note : à élargir en v2 avec d'autres sections

-- ⚠️ Index unique critique : 1 vote par scope, par jour, par empreinte navigateur
-- Empêche le bourrage de votes sans nécessiter d'auth utilisateur
create unique index if not exists votes_unique_daily
  on public.votes(scope, day, fingerprint_hash);

-- Index pour les agrégats de comptage
create index if not exists idx_votes_scope_vote
  on public.votes(scope, vote);

create index if not exists idx_votes_day
  on public.votes(day desc);

-- Commentaires
comment on table public.votes is
  'Votes cooked/uncooked des visiteurs. Contrainte unique (scope, day, fingerprint)
   garantit qu''un même navigateur ne peut voter qu''une fois par section par jour,
   sans nécessiter d''authentification.';

comment on column public.votes.scope is
  'Section concernée par le vote.
   "global" = vote global sur la page d''accueil.
   "fuel" = vote sur la section carburants.
   D''autres scopes seront ajoutés avec les futurs indicateurs.';

comment on column public.votes.fingerprint_hash is
  'Hash SHA-256 de l''empreinte navigateur. Doit être non-nul (contraint NOT NULL)
   car c''est la base de la contrainte d''unicité anti-abus.';

comment on index public.votes_unique_daily is
  'Contrainte métier critique : limite à 1 vote par scope/jour/empreinte.
   Utilise un index unique partiel plutôt qu''une contrainte UNIQUE directe
   pour permettre de l''étendre facilement (ex: ajouter une condition WHERE).';
