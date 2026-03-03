-- =============================================================================
-- Migration 0000 : Table data_sources
-- Inventaire des sources de données utilisées par le pipeline
-- =============================================================================

-- Extension UUID (disponible par défaut sur Supabase)
create extension if not exists "pgcrypto";

-- Table principale
create table if not exists public.data_sources (
  id               uuid        primary key default gen_random_uuid(),
  key              text        unique not null,  -- identifiant court ex: "prix-carburants-roulez-eco"
  name             text        not null,
  url              text        not null,
  license          text,                         -- ex: "Licence Ouverte / Open Licence"
  update_frequency text,                         -- ex: "quotidien", "annuel"
  created_at       timestamptz not null default now()
);

comment on table public.data_sources is
  'Inventaire des sources de données externes utilisées par les jobs d''ingestion.';
comment on column public.data_sources.key is
  'Identifiant court unique utilisé dans le code pour référencer la source.';
comment on column public.data_sources.license is
  'Licence de la donnée source (ex: Licence Ouverte / Open Licence v2.0).';

-- Seed : source officielle carburants
insert into public.data_sources (key, name, url, license, update_frequency)
values
  (
    'prix-carburants-roulez-eco',
    'Prix des carburants en France — flux quotidien (roulez-eco.fr)',
    'https://donnees.roulez-eco.fr/opendata/jour',
    'Licence Ouverte / Open Licence v2.0',
    'quotidien (J-1)'
  ),
  (
    'prix-carburants-annuel',
    'Prix des carburants en France — archives annuelles (roulez-eco.fr)',
    'https://donnees.roulez-eco.fr/opendata/annee',
    'Licence Ouverte / Open Licence v2.0',
    'annuel'
  )
on conflict (key) do nothing;
