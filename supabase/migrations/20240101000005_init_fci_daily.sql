-- =============================================================================
-- Migration 0005 : Table fci_daily
-- French Cooked Index™ — score quotidien + décomposition
-- =============================================================================

create table if not exists public.fci_daily (
  -- Clé primaire : une seule entrée par jour
  day                  date        primary key,
  -- Score FCI agrégé : entier 0..100
  score                integer     not null,
  -- Version de la méthodologie utilisée pour ce calcul
  methodology_version  text        not null default 'v1',
  -- Décomposition des scores par composante (JSONB pour flexibilité)
  -- ex: {"fuel": 72, "inflation": 0}  (0 si non calculé en v1)
  components           jsonb       not null default '{}'::jsonb,
  -- Poids utilisés pour chaque composante (somme doit = 1.0)
  -- ex: {"fuel": 1.0}  (v1: carburants uniquement)
  weights              jsonb       not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

-- Index pour les requêtes de tendance (K derniers jours)
create index if not exists idx_fci_daily_day_desc
  on public.fci_daily(day desc);

-- Commentaires
comment on table public.fci_daily is
  'Score quotidien du French Cooked Index™.
   Calculé par le job fuel-daily après ingestion des données carburants.
   La colonne components permet de retracer la contribution de chaque indicateur.';

comment on column public.fci_daily.score is
  'Score FCI entier entre 0 (tout va bien) et 100 (on est complètement cooked).
   Calculé comme : Σ(composante_i × poids_i), où chaque composante est normalisée [0,100].';

comment on column public.fci_daily.methodology_version is
  'Version de la formule de calcul. Permet de versionner les changements de méthodologie
   et de maintenir la cohérence historique des comparaisons.
   v1 = carburants uniquement. v2 = multi-indicateurs avec pondérations révisées.';

comment on column public.fci_daily.components is
  'Scores par composante (JSONB), normalisés [0,100].
   Structure v1 : {"fuel": 72}
   Structure v2 : {"fuel": 42, "inflation": 68, "loyers": 55, ...}';

comment on column public.fci_daily.weights is
  'Poids de chaque composante dans le score final (somme doit être = 1.0).
   Stockés pour la transparence et la reproductibilité.
   Structure v1 : {"fuel": 1.0}';

-- Contraintes
alter table public.fci_daily
  add constraint chk_score_range
  check (score between 0 and 100);

alter table public.fci_daily
  add constraint chk_methodology_version
  check (methodology_version in ('v1', 'v2', 'v3'));

-- Contrainte JSONB : weights doit avoir au moins une clé (vérification applicative recommandée)
-- Note : les contraintes JSONB complexes sont gérées côté application pour plus de flexibilité
