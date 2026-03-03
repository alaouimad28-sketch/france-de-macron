-- =============================================================================
-- Migration 0001 : Table fuel_daily_agg
-- Agrégats quotidiens nationaux par carburant
-- =============================================================================

create table if not exists public.fuel_daily_agg (
  day                  date        not null,
  fuel_code            text        not null,
  -- Prix moyen national (€/L), calculé sur toutes les stations actives
  avg_price_eur_per_l  numeric(6,3) not null,
  -- Min / max observés ce jour (utiles pour afficher les barres d'erreur sur le graphique)
  min_price_eur_per_l  numeric(6,3),
  max_price_eur_per_l  numeric(6,3),
  -- Nombre de stations actives ayant fourni un prix ce jour (transparence)
  sample_count         integer,
  -- Référence vers la source de données utilisée pour cet agrégat
  source_id            uuid        references public.data_sources(id) on delete set null,
  created_at           timestamptz not null default now(),

  primary key (day, fuel_code)
);

-- Index pour les requêtes typiques (filtrer par carburant + plage de dates)
create index if not exists idx_fuel_daily_agg_fuel_code_day
  on public.fuel_daily_agg(fuel_code, day desc);

-- Commentaires
comment on table public.fuel_daily_agg is
  'Agrégats quotidiens nationaux des prix carburant (source: données officielles open data).
   Clé primaire composite (day, fuel_code) garantit l''unicité et simplifie l''upsert.';

comment on column public.fuel_daily_agg.fuel_code is
  'Code carburant normalisé: gazole | e10 | sp98 | e85 | gplc | sp95.
   Correspond au champ <nom> dans le XML source, normalisé en minuscules.';

comment on column public.fuel_daily_agg.avg_price_eur_per_l is
  'Prix moyen national (€/L) calculé sur toutes les stations ayant remonté un prix
   non-nul pour ce carburant ce jour. Moyenne arithmétique simple (MVP).';

comment on column public.fuel_daily_agg.sample_count is
  'Nombre de stations contribuant à l''agrégat. Permet d''évaluer la représentativité
   du prix moyen et de l''afficher comme note de transparence dans la méthodologie.';

-- Contrainte check sur les codes carburant connus
alter table public.fuel_daily_agg
  add constraint chk_fuel_code
  check (fuel_code in ('gazole', 'e10', 'sp98', 'e85', 'gplc', 'sp95'));

-- Contrainte check : le prix moyen doit être positif
alter table public.fuel_daily_agg
  add constraint chk_avg_price_positive
  check (avg_price_eur_per_l > 0);
