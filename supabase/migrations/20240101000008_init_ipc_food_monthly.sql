-- =============================================================================
-- Migration 0008 : IPC alimentaire INSEE (scaffold P0)
-- Safe additive migration for future multi-indicator module
-- =============================================================================

create table if not exists public.ipc_food_monthly (
  id               uuid primary key default gen_random_uuid(),
  month            date not null,
  index_value      numeric(10, 3) not null,
  source_series_id text not null,
  source_label     text not null default 'INSEE IPC alimentaire (SERIES_BDM)',
  raw_payload      jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint chk_ipc_food_month_start check (date_trunc('month', month) = month),
  constraint chk_ipc_food_index_positive check (index_value > 0),
  constraint uq_ipc_food_month_series unique (month, source_series_id)
);

create index if not exists idx_ipc_food_monthly_month on public.ipc_food_monthly (month desc);

comment on table public.ipc_food_monthly is
  'Monthly INSEE food CPI observations used for future FCI v2 components.';
comment on column public.ipc_food_monthly.raw_payload is
  'Raw INSEE observation payload kept for traceability and parser evolution.';

create or replace function public.set_updated_at_ipc_food_monthly()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ipc_food_monthly_set_updated_at on public.ipc_food_monthly;
create trigger trg_ipc_food_monthly_set_updated_at
before update on public.ipc_food_monthly
for each row execute function public.set_updated_at_ipc_food_monthly();

alter table public.ipc_food_monthly enable row level security;

drop policy if exists "ipc_food_monthly: lecture publique" on public.ipc_food_monthly;
create policy "ipc_food_monthly: lecture publique"
  on public.ipc_food_monthly
  for select
  to anon, authenticated
  using (true);

grant select on public.ipc_food_monthly to anon;

insert into public.data_sources (key, name, url, license, update_frequency)
values (
  'ipc-alimentaire-insee',
  'Indice des prix à la consommation - alimentation (INSEE BDM)',
  'https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001767226',
  'Licence Ouverte / Open Licence v2.0',
  'mensuel'
)
on conflict (key) do nothing;
