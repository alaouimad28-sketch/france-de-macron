create table if not exists public.electricity_tariff_history (
  id uuid primary key default gen_random_uuid(),
  effective_date date not null,
  end_date date,
  option_code text not null check (option_code in ('BASE', 'HPHC')),
  subscribed_power_kva integer not null check (subscribed_power_kva > 0),
  tariff_component text not null check (tariff_component in ('BASE', 'HP', 'HC')),
  value_eur_kwh numeric(10,6) not null check (value_eur_kwh > 0),
  value_ct_kwh numeric(10,4) not null check (value_ct_kwh > 0),
  annual_fixed_ttc_eur numeric(10,2),
  tax_included boolean not null default true,
  source_dataset text not null default 'CRE TRVE résidentiel (data.gouv)',
  source_url text not null,
  method_version text not null default 'trve_v1',
  source_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint electricity_tariff_history_unique
    unique (effective_date, option_code, subscribed_power_kva, tariff_component, method_version)
);

create index if not exists idx_electricity_tariff_history_effective_date
  on public.electricity_tariff_history (effective_date desc);

create index if not exists idx_electricity_tariff_history_option_power
  on public.electricity_tariff_history (option_code, subscribed_power_kva, tariff_component);

alter table public.electricity_tariff_history enable row level security;

drop policy if exists "Public can read electricity tariff history" on public.electricity_tariff_history;
create policy "Public can read electricity tariff history"
  on public.electricity_tariff_history
  for select
  to anon, authenticated
  using (true);

comment on table public.electricity_tariff_history is
  'Historique TRVE électricité résidentiel (CRE/data.gouv), normalisé en ct€/kWh.';
comment on column public.electricity_tariff_history.tariff_component is
  'BASE pour Option Base, HP/HC pour Option Heures Pleines/Heures Creuses.';
comment on column public.electricity_tariff_history.value_ct_kwh is
  'Prix TTC normalisé en centimes d’euro par kWh (ct€/kWh).';
