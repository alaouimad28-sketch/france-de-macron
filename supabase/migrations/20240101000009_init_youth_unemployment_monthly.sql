-- =============================================================================
-- Migration 0009 : Eurostat youth unemployment monthly (P0)
-- =============================================================================

create table if not exists public.youth_unemployment_monthly (
  id               uuid primary key default gen_random_uuid(),
  month            date not null,
  geo              text not null,
  geo_label        text not null,
  age              text not null default 'Y_LT25',
  sex              text not null default 'T',
  seasonal_adjustment text not null default 'SA',
  unit             text not null default 'PC_ACT',
  unemployment_rate numeric(8, 3) not null,
  source_dataset   text not null default 'une_rt_m',
  source_url       text not null,
  source_meta      jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint chk_youth_unemployment_month_start check (date_trunc('month', month) = month),
  constraint chk_youth_unemployment_rate_bounds check (unemployment_rate >= 0 and unemployment_rate <= 100),
  constraint uq_youth_unemployment_month_geo_series unique (month, geo, age, sex, seasonal_adjustment, unit)
);

create index if not exists idx_youth_unemployment_monthly_geo_month
  on public.youth_unemployment_monthly (geo, month desc);

comment on table public.youth_unemployment_monthly is
  'Eurostat monthly youth unemployment (15-24), used for macro pressure modules.';

create or replace function public.set_updated_at_youth_unemployment_monthly()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_youth_unemployment_monthly_set_updated_at on public.youth_unemployment_monthly;
create trigger trg_youth_unemployment_monthly_set_updated_at
before update on public.youth_unemployment_monthly
for each row execute function public.set_updated_at_youth_unemployment_monthly();

alter table public.youth_unemployment_monthly enable row level security;

drop policy if exists "youth_unemployment_monthly: lecture publique" on public.youth_unemployment_monthly;
create policy "youth_unemployment_monthly: lecture publique"
  on public.youth_unemployment_monthly
  for select
  to anon, authenticated
  using (true);

grant select on public.youth_unemployment_monthly to anon;

insert into public.data_sources (key, name, url, license, update_frequency)
values (
  'eurostat-youth-unemployment',
  'Eurostat youth unemployment rate (15-24)',
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m',
  'Eurostat reuse policy',
  'mensuel'
)
on conflict (key) do nothing;
