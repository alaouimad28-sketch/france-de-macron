# electricity-trve-backfill

Ingestion idempotente de l'historique **TRVE électricité résidentiel** (CRE/data.gouv) vers `public.electricity_tariff_history`.

## Source

Dataset data.gouv :

- https://www.data.gouv.fr/datasets/historique-des-tarifs-reglementes-de-vente-delectricite-pour-les-consommateurs-residentiels

Ressources consommées :

- Option Base (`Option_Base.csv`)
- Option Heures Pleines / Heures Creuses (`Option_HPHC.csv`)

## Commande

Depuis la racine du repo :

```bash
pnpm run electricity:trve:backfill
```

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TRVE_BASE_OPTION_URL=https://www.cre.fr/fileadmin/Documents/Open_data/Marches_de_detail/Option_Base.csv
TRVE_HPHC_OPTION_URL=https://www.cre.fr/fileadmin/Documents/Open_data/Marches_de_detail/Option_HPHC.csv
TRVE_METHOD_VERSION=trve_v1
DRY_RUN=0
```

## Normalisation

- `DATE_DEBUT` / `DATE_FIN` → `effective_date` / `end_date` (`YYYY-MM-DD`)
- valeurs TTC €/kWh → `value_eur_kwh`
- conversion unité vers `value_ct_kwh` (ct€/kWh) pour cohérence avec les garde-fous P1
- Option HPHC éclatée en deux composantes : `HP` et `HC`

## Idempotence

Upsert avec clé :

`(effective_date, option_code, subscribed_power_kva, tariff_component, method_version)`

Le script est rejouable sans doublons.
