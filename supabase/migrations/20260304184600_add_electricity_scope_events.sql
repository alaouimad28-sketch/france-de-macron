-- =============================================================================
-- Add electricity scope support + seed TRVE change events
-- =============================================================================

alter table public.events drop constraint if exists chk_scope;

alter table public.events
  add constraint chk_scope
  check (scope in ('fuel', 'global', 'inflation', 'political', 'electricity'));

insert into public.events (day, scope, label_fr, label_en, icon, severity, source_url)
values
  (
    '2023-08-01',
    'electricity',
    'Hausse TRVE électricité (+10%)',
    'TRVE electricity increase (+10%)',
    'up',
    4,
    'https://www.service-public.fr/particuliers/actualites/A16668'
  ),
  (
    '2024-02-01',
    'electricity',
    'Hausse TRVE électricité (février 2024)',
    'TRVE electricity increase (Feb 2024)',
    'up',
    4,
    'https://www.service-public.fr/particuliers/actualites/A17240'
  ),
  (
    '2025-02-01',
    'electricity',
    'Baisse TRVE électricité (février 2025)',
    'TRVE electricity decrease (Feb 2025)',
    'down',
    3,
    'https://www.service-public.fr/particuliers/actualites/A17810'
  )
on conflict do nothing;
