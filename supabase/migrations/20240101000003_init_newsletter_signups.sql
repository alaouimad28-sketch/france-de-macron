-- =============================================================================
-- Migration 0003 : Table newsletter_signups
-- Capture d'emails (NSM principal du projet)
-- =============================================================================

create table if not exists public.newsletter_signups (
  id               uuid        primary key default gen_random_uuid(),
  email            text        not null,
  locale           text        not null default 'fr',
  source           text        not null default 'landing', -- ex: landing, about, cta-fuel
  created_at       timestamptz not null default now(),

  -- Données anti-spam (pseudo-anonymes, pas de PII directe)
  fingerprint_hash text,   -- hash SHA-256 de l'empreinte navigateur
  user_agent       text,   -- User-Agent brut (utile pour détecter les bots)
  ip_hash          text,   -- hash SHA-256 de l'IP (pas stockée en clair)

  -- Contrainte unique : un seul signup par email
  unique (email)
);

-- Index pour les recherches par date (analytics newsletter)
create index if not exists idx_newsletter_signups_created_at
  on public.newsletter_signups(created_at desc);

-- Index pour l'anti-spam par empreinte
create index if not exists idx_newsletter_signups_fingerprint
  on public.newsletter_signups(fingerprint_hash)
  where fingerprint_hash is not null;

-- Commentaires
comment on table public.newsletter_signups is
  'Emails collectés via les CTA newsletter. NSM du projet MVP.
   Aucune donnée PII stockée en clair sauf l''email.
   IP et empreinte navigateur hashées (SHA-256) pour l''anti-spam uniquement.';

comment on column public.newsletter_signups.source is
  'Point d''entrée du signup. Permet de mesurer quelle section convertit le mieux.
   Valeurs: landing | about | cta-fuel | cta-fci | popup';

comment on column public.newsletter_signups.fingerprint_hash is
  'Hash SHA-256 de l''empreinte navigateur pseudo-anonyme (User-Agent + timezone + screen).
   Utilisé uniquement pour détecter des signups en masse automatisés.
   Ne permet pas d''identifier un utilisateur individuel.';

comment on column public.newsletter_signups.ip_hash is
  'Hash SHA-256 de l''adresse IP source. Jamais stockée en clair.
   Utilisé pour limiter les inscriptions depuis une même IP (rate-limit soft).';

-- Contraintes
alter table public.newsletter_signups
  add constraint chk_email_format
  check (email ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$');

alter table public.newsletter_signups
  add constraint chk_locale
  check (locale in ('fr', 'en'));
