-- =============================================================================
-- Migration 0002 : Table events
-- Annotations d'événements historiques affichées sur les graphiques
-- =============================================================================

create table if not exists public.events (
  id         uuid        primary key default gen_random_uuid(),
  day        date        not null,
  -- Portée de l'événement : sur quel(s) graphique(s) l'afficher
  scope      text        not null,
  -- Labels bilingues (FR obligatoire, EN optionnel pour roadmap i18n)
  label_fr   text        not null,
  label_en   text,
  -- Icône sémantique pour l'affichage sur le graphique
  icon       text,
  -- Gravité de l'événement (1 = info, 5 = majeur/rouge)
  severity   integer     not null default 1,
  -- Lien vers la source de l'événement (Wikipedia, Le Monde, etc.)
  source_url text,
  created_at timestamptz not null default now()
);

-- Index pour les requêtes filtrées par scope + plage de dates
create index if not exists idx_events_scope_day
  on public.events(scope, day);

-- Commentaires
comment on table public.events is
  'Annotations historiques affichées comme markers verticaux sur les graphiques.
   Exemples : invasion Ukraine (hausse carburants), COVID, crise énergie 2022.';

comment on column public.events.scope is
  'Portée de l''événement.
   Valeurs: "fuel" (visible sur graphique carburants), "global" (tous graphiques),
   "inflation", "political". Plusieurs scopes possibles en v2 via array.';

comment on column public.events.icon is
  'Icône sémantique. Valeurs suggérées: war | euro | lightning | fire | peace | up | down.
   Mappe sur les icônes Lucide React dans le front.';

comment on column public.events.severity is
  'Gravité 1-5. Influence la couleur et la taille du marker.
   1 = info (gris), 2 = notable (jaune), 3 = important (orange),
   4 = critique (rouge), 5 = majeur (rouge+animation).';

-- Contraintes
alter table public.events
  add constraint chk_scope
  check (scope in ('fuel', 'global', 'inflation', 'political'));

alter table public.events
  add constraint chk_severity
  check (severity between 1 and 5);

-- Seed : événements clés pour le graphique carburants MVP
insert into public.events
  (day, scope, label_fr, label_en, icon, severity, source_url)
values
  (
    '2022-02-24',
    'fuel',
    'Invasion russe en Ukraine',
    'Russian invasion of Ukraine',
    'war',
    5,
    'https://fr.wikipedia.org/wiki/Invasion_de_l%27Ukraine_par_la_Russie_en_2022'
  ),
  (
    '2022-09-01',
    'fuel',
    'Remise carburant gouvernementale (18 cts/L)',
    'Government fuel rebate (18 cts/L)',
    'euro',
    3,
    'https://www.economie.gouv.fr/remise-carburant'
  ),
  (
    '2021-10-01',
    'fuel',
    'Début crise énergétique mondiale',
    'Beginning of global energy crisis',
    'lightning',
    4,
    'https://fr.wikipedia.org/wiki/Crise_%C3%A9nerg%C3%A9tique_mondiale_des_ann%C3%A9es_2021-2023'
  ),
  (
    '2020-04-20',
    'fuel',
    'Pétrole à prix négatif (COVID)',
    'Negative oil price (COVID)',
    'down',
    5,
    'https://fr.wikipedia.org/wiki/Crise_p%C3%A9troli%C3%A8re_de_2020'
  )
on conflict do nothing;
