-- =============================================================================
-- Migration 0011 : Rent monthly by city (P1 pilot — 5 cities)
-- Source : CLAMEUR (Connaître les Loyers et Analyser les Marchés sur les
--          Espaces Urbains et Ruraux) + Observatoire des Loyers (OLAP /
--          data.gouv.fr), annual figures normalized to monthly.
-- License : public reference data (annual reports, data.gouv.fr open license)
-- =============================================================================

create table if not exists public.rent_monthly (
  id               uuid primary key default gen_random_uuid(),
  month            date not null,
  city             text not null,
  city_label       text not null,
  avg_rent_m2      numeric(8, 2) not null,
  sample_count     integer,
  source_label     text not null default 'CLAMEUR / OLAP data.gouv.fr',
  source_url       text not null,
  source_meta      jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint chk_rent_monthly_month_start check (date_trunc('month', month) = month),
  constraint chk_rent_monthly_price_bounds check (avg_rent_m2 > 0 and avg_rent_m2 < 200),
  constraint uq_rent_monthly_city_month unique (month, city)
);

create index if not exists idx_rent_monthly_city_month
  on public.rent_monthly (city, month desc);

comment on table public.rent_monthly is
  'Monthly average rent per m² by city (pilot: Paris, Lyon, Marseille, Lille, Toulouse). Source: CLAMEUR / OLAP data.gouv.fr.';

create or replace function public.set_updated_at_rent_monthly()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rent_monthly_set_updated_at on public.rent_monthly;
create trigger trg_rent_monthly_set_updated_at
before update on public.rent_monthly
for each row execute function public.set_updated_at_rent_monthly();

alter table public.rent_monthly enable row level security;

drop policy if exists "rent_monthly: lecture publique" on public.rent_monthly;
create policy "rent_monthly: lecture publique"
  on public.rent_monthly
  for select
  to anon, authenticated
  using (true);

grant select on public.rent_monthly to anon;

insert into public.data_sources (key, name, url, license, update_frequency)
values (
  'clameur-rent',
  'Loyers moyens par ville — CLAMEUR / OLAP data.gouv.fr',
  'https://www.data.gouv.fr/fr/datasets/resultats-des-observatoires-des-loyers/',
  'Licence Ouverte / Open License (data.gouv.fr)',
  'annuel'
)
on conflict (key) do nothing;
