-- =============================================================================
-- Migration 0007 : Augmenter statement_timeout pour le chargement du schéma
-- PostgREST (API) peut dépasser le timeout par défaut au démarrage sur machine lente.
-- =============================================================================

ALTER DATABASE postgres SET statement_timeout = '60s';
