# Sources de données — France de Macron

## État actuel (Mars 2026)

| Source | Statut | Table(s) | Commande / fréquence |
| ------ | ------ | -------- | -------------------- |
| **Carburants** (roulez-eco.fr) | En production | `fuel_daily_agg`, `fci_daily` | Cron 02:30 UTC + backfills manuels |
| **IPC alimentaire** (INSEE BDM) | Implémenté | `ipc_food_monthly` | `pnpm run insee:ipc:food:backfill` |
| **Chômage jeunes** (Eurostat) | Implémenté | `youth_unemployment_monthly` | `pnpm run eurostat:youth:backfill` |
| **TRVE électricité** (CRE / data.gouv) | Implémenté | `electricity_tariff_history` | `pnpm run electricity:trve:backfill` |
| **Loyers** (CLAMEUR / OLL) | Roadmap | — | À venir |
| **Eurostat multi-pays** (v2 comparaison) | Roadmap | — | À venir |

Le **score FCI** (0–100) est calculé uniquement à partir des **carburants** (v1). Les autres sources alimentent des modules affichés à part sur le site. Voir [methodology.md](methodology.md) et [pipeline.md](pipeline.md).

---

## 1. Carburants — Source principale MVP

### 1.1 Identification

| Champ           | Valeur                                                     |
| --------------- | ---------------------------------------------------------- |
| **Nom**         | Prix des carburants en France — Données officielles        |
| **Fournisseur** | Ministère de l'Économie (via roulez-eco.fr / data.gouv.fr) |
| **Licence**     | Licence Ouverte / Open Licence v2.0                        |
| **Mise à jour** | Quotidienne (données J-1 disponibles vers 01:00 UTC)       |
| **Couverture**  | Toutes stations-service de France métropolitaine + DOM     |
| **Format**      | XML zippé (ZIP contenant un fichier XML)                   |

### 1.2 URLs d'accès

```
Flux quotidien (dernier jour disponible) :
  https://donnees.roulez-eco.fr/opendata/jour
  → Retourne un ZIP contenant le XML du jour le plus récent (ex. PrixCarburants_quotidien_YYYYMMDD.xml)

Flux quotidien par date (AAAAMMJJ) :
  https://donnees.roulez-eco.fr/opendata/jour/AAAAMMJJ
  ex: https://donnees.roulez-eco.fr/opendata/jour/20241115
  → Fonctionne pour les ~30 derniers jours uniquement. Au-delà, le serveur peut renvoyer une page HTML (200)
  au lieu du ZIP ; le script doit détecter le type de contenu et traiter comme "données indisponibles".

Archives annuelles (depuis 2007) — pour l'évolution sur plusieurs années :
  https://donnees.roulez-eco.fr/opendata/annee/YYYY
  ex: https://donnees.roulez-eco.fr/opendata/annee/2023
  → Un ZIP par an (~15–30 Mo), contenant un seul XML (ex. PrixCarburants_annuel_2023.xml, ~300+ Mo décompressé).
  → Les entrées <prix> ont un attribut maj (date) : il faut grouper par jour pour calculer les agrégats quotidiens.
```

**Aucune clé API requise** : les données sont en open data (Licence Ouverte), libre et gratuit.  
Référence : [Prix des carburants — Données publiques](https://www.prix-carburants.gouv.fr/rubrique/opendata/).

### 1.2.1 Récupérer plusieurs années (évolution des prix)

Oui, c’est possible. Les **archives annuelles** permettent d’avoir l’historique depuis 2007 :

| Besoin             | Méthode                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Derniers 30 jours  | ` /opendata/jour/AAAAMMJJ` (un appel par jour)                                                                                     |
| Une année complète | ` /opendata/annee/YYYY` (un ZIP par an, ex. 2020, 2021, 2022, 2023, 2024)                                                          |
| Plusieurs années   | Télécharger un ZIP par année, parser le XML, extraire les prix par jour (attribut `maj`), agréger et upsert dans `fuel_daily_agg`. |

Le script **fuel-backfill-annee** ingère une ou plusieurs années. Volume : ~15–30 Mo en ZIP par an, XML décompressé ~300+ Mo par an — à lancer en one-shot (pas de cron).

**Commandes (depuis la racine du repo)** :

```bash
pnpm install
pnpm run fuel:backfill:annees
START_YEAR=2015 END_YEAR=2020 pnpm run fuel:backfill:annees
```

Prérequis : `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (ex. dans `apps/web/.env.local`). Détail : `scripts/fuel-backfill-annee/README.md`.

**Important** : les archives annuelles commencent en **2007** (pas de données 2000–2006 sur ce jeu open data).

### 1.2.3 Stockage : depuis 2007 vs « depuis 2000 »

| Périmètre            | Disponible ?                    | Volume source (ZIP)        | Volume source (XML décompressé) | Volume chez nous (Supabase, agrégats seuls) |
| -------------------- | ------------------------------- | -------------------------- | ------------------------------- | ------------------------------------------- |
| Depuis 2000          | **Non** — première année = 2007 | —                          | —                               | —                                           |
| 2007 → 2025 (19 ans) | Oui                             | ~400–500 Mo (tous les ZIP) | ~5–6 Go (XML bruts)             | **~10–30 Mo** (fuel_daily_agg + fci_daily)  |
| 2007 → aujourd’hui   | Oui                             | idem                       | idem                            | idem                                        |

On ne conserve pas les ZIP/XML : on télécharge, on parse, on agrège par (jour, carburant), on upsert dans `fuel_daily_agg`. Le stockage réel côté projet est donc celui de la base Supabase (agrégats uniquement), très faible même sur 20 ans.

### 1.2.2 Où sont stockées les données ?

| Lieu                      | Rôle                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Source (gouvernement)** | [donnees.roulez-eco.fr](https://donnees.roulez-eco.fr) — serveurs du ministère. Données brutes (ZIP/XML). On ne stocke pas ces fichiers nous-mêmes.                       |
| **Notre base (Supabase)** | PostgreSQL (Supabase). Tables : `fuel_daily_agg`, `fci_daily` (carburants + FCI) ; `ipc_food_monthly` (IPC alimentaire) ; `youth_unemployment_monthly` (chômage jeunes) ; `electricity_tariff_history` (TRVE). On ne garde que les agrégats / séries normalisées, pas les fichiers bruts. |
| **Front**                 | Next.js lit uniquement dans Supabase (SSR). Le client ne contacte jamais roulez-eco.fr.                                                                                   |

En résumé : la **source de vérité** est roulez-eco.fr ; notre **stockage** est Supabase (agrégats uniquement).

### 1.3 Structure XML source

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<pdv_liste>
  <pdv id="75001001"
       latitude="4875948"    <!-- ×10^5, soit 48.75948° N -->
       longitude="233086"    <!-- ×10^5, soit 2.33086° E -->
       cp="75001"
       pop="R"               <!-- R = Route, A = Autoroute -->
       adresse="1 RUE DE LA PAIX"
       ville="PARIS"
       automate-24-24="0">
    <services>
      <service>Cartes bancaires</service>
    </services>
    <prix nom="gazole" id="1" maj="2024-11-15T08:00:00" valeur="1689"/>
    <prix nom="e10"    id="5" maj="2024-11-15T08:00:00" valeur="1799"/>
    <prix nom="sp98"   id="6" maj="2024-11-15T08:00:00" valeur="1899"/>
    <!-- Rupture de stock (station sans ce carburant) -->
    <rupture id="2" nom="e10" debut="2024-11-10T00:00:00" fin=""/>
  </pdv>
</pdv_liste>
```

**Notes critiques sur le parsing** :

- `valeur` : prix en **millièmes d'euro** (diviser par 1000 pour obtenir €/L)
  - Exemple : `valeur="1689"` → `1.689 €/L`
- `latitude` / `longitude` : en **degrés × 100 000** (diviser par 100 000)
- `rupture` sans `fin` = rupture actuelle → exclure ce carburant pour ce jour
- Encodage : `ISO-8859-1` (ne pas traiter comme UTF-8)
- `pop="A"` = autoroute → peut biaiser les moyennes (prix plus élevés)

### 1.4 Codes carburant

| Code XML | Code normalisé | Description                        |
| -------- | -------------- | ---------------------------------- |
| `gazole` | `gazole`       | Gazole (Diesel)                    |
| `sp95`   | `sp95`         | Sans Plomb 95                      |
| `e10`    | `e10`          | Sans Plomb 95-E10 (bioéthanol 10%) |
| `sp98`   | `sp98`         | Sans Plomb 98                      |
| `e85`    | `e85`          | Superéthanol E85                   |
| `gplc`   | `gplc`         | GPL carburant                      |

### 1.5 Contraintes et limitations

| Limitation                      | Impact                                          | Mitigation                                     |
| ------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Données J-1 uniquement          | Pas de données temps réel                       | Acceptable pour le MVP                         |
| Couverture variable             | Certaines stations ne remontent pas chaque jour | Utiliser `sample_count` pour la transparence   |
| Autoroutes biaisent la moyenne  | Prix moyens légèrement élevés                   | Documenter, filtrer optionnellement en v2      |
| Flux peut être indisponible     | Job cron échoue                                 | Retry + log, affichage "Données indisponibles" |
| Archives annuelles volumineuses | >1 GB pour 5 ans                                | Téléchargement one-shot uniquement             |
| Encodage ISO-8859-1             | Erreurs de parsing si mal géré                  | Convertir explicitement vers UTF-8             |

### 1.6 Fréquence de mise à jour

```
Source → roulez-eco.fr : quotidien (données J-1, disponibles ~01:00 UTC)
roulez-eco.fr → Supabase : via cron à 02:30 UTC (marge de sécurité)
Supabase → Front : SSR Next.js (at request time, données fraîches)
```

---

## 2. Sources additionnelles (implémentées)

Les sources ci-dessous sont ingérées et affichées sur le site (sections dédiées + page `/indicators`). Elles **ne modifient pas le score FCI**, qui reste calculé en v1 (carburants uniquement).

### 2.1 Inflation alimentaire — INSEE

| Champ         | Valeur                                                         |
| ------------- | -------------------------------------------------------------- |
| Source        | INSEE — Indices des Prix à la Consommation (IPC)               |
| URL           | `https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001767226` |
| Format        | JSON (API REST, série BDM)                                     |
| Fréquence     | Mensuel                                                        |
| Licence       | Licence Ouverte / Open Licence v2.0                            |
| Disponibilité | Gratuit, clé API requise (inscription INSEE, token Bearer API) |

#### 2.1.1 Série et stockage (en place)

- Série BDM : **`001767226`** (IPC alimentation, France entière).
- Table : `public.ipc_food_monthly` (migration `20240101000008`).
- Clé d'idempotence : `(month, source_series_id)`.
- Granularité : **mensuelle**, sans désaisonnalisation (valeurs brutes publiées).

#### 2.1.2 Ingestion

1. **Fetch** (script `scripts/insee-ipc-food-backfill/index.ts`)
   - Appel de l'endpoint BDM avec `Authorization: Bearer $INSEE_API_TOKEN`.
   - Variables prévues : `INSEE_BDM_API_BASE_URL`, `INSEE_IPC_FOOD_SERIES_ID`.
2. **Normalize**
   - Mapper les observations vers `{ month, index_value }`.
   - Contraindre `month` au 1er jour du mois (`date_trunc('month', month) = month`).
3. **Store**
   - Upsert vers `public.ipc_food_monthly`.
   - Persistance du `raw_payload` pour traçabilité / debug parser.

#### 2.1.3 Incertitudes ouvertes

- Confirmer la stratégie de rotation du token INSEE pour exécution cron.
- Vérifier si une série plus spécifique « alimentation hors tabac » doit remplacer `001767226`.

### 2.2 Chômage jeunes — Eurostat

| Champ     | Valeur                                                                         |
| --------- | ------------------------------------------------------------------------------ |
| Source    | Eurostat — Labour Force Survey                                                 |
| URL       | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m` |
| Fréquence | Mensuel                                                                        |
| Licence   | Eurostat reuse policy (source à citer)                                         |

#### 2.2.1 Paramètres et stockage (en place)

- Dataset : `une_rt_m`
- Filtres : `age=Y15-24`, `sex=T`, `unit=PC_ACT`, `s_adj=SA`
- Géos suivis : `FR`, `EU27_2020`
- Script : `scripts/eurostat-youth-unemployment-backfill/index.ts`
- Stockage : table `public.youth_unemployment_monthly` (migration additive `20240101000009`).

#### 2.2.2 Pipeline ingestion

1. **Fetch** : appel API Eurostat JSON par `geo`.
2. **Normalize** : mapping `time=YYYY-MM` vers `month=YYYY-MM-01` + extraction `unemployment_rate`.
3. **Store** : upsert idempotent via clé `(month, geo, age, sex, seasonal_adjustment, unit)`.

### 2.3 Tarifs électricité TRVE — CRE / data.gouv

| Champ      | Valeur                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Source     | CRE — Historique des tarifs réglementés de vente d'électricité résidentiels                                                     |
| URL        | `https://www.data.gouv.fr/datasets/historique-des-tarifs-reglementes-de-vente-delectricite-pour-les-consommateurs-residentiels` |
| Ressources | `Option_Base.csv`, `Option_HPHC.csv`                                                                                            |
| Format     | CSV (séparateur `;`, décimales `,`)                                                                                             |
| Fréquence  | Mise à jour ponctuelle lors des révisions tarifaires                                                                            |
| Licence    | À confirmer (dataset data.gouv actuellement « notspecified »)                                                                   |

#### 2.3.1 Pipeline ingestion (implémenté)

- Migration additive : `supabase/migrations/20240101000010_init_electricity_tariff_history.sql`
- Script : `scripts/electricity-trve-backfill/index.ts`
- Commande : `pnpm run electricity:trve:backfill`
- Normalisation : conversion des valeurs TTC vers `ct€/kWh` (`value_ct_kwh`) + conservation de la valeur `€/kWh`
- Idempotence : upsert clé `(effective_date, option_code, subscribed_power_kva, tariff_component, method_version)`
- QA cohérence unité : `pnpm run qa:electricity-unit` (assertion `value_eur_kwh × 100 = value_ct_kwh` + bornes sanity)

#### 2.3.2 Modèle retenu

- Option Base : composante `BASE`
- Option HPHC : composantes `HP` et `HC`
- Champs de traçabilité : `source_url`, `source_dataset`, `source_meta`
- Versionnement méthodologique : `method_version` (défaut `trve_v1`)
- Timeline événements : annotations éditoriales stockées dans `public.events` avec `scope='electricity'` (migration `20260304184600_add_electricity_scope_events.sql`), affichées dans le module UI électricité.

---

## 3. Sources futures (roadmap)

### 3.1 Loyers — CLAMEUR / OLAP

- Disponibilité partielle (certaines villes uniquement)
- À évaluer pour FCI v2 / module loyers

### 3.2 Données Eurostat multi-pays (v2 comparaison)

| Dataset         | Description             |
| --------------- | ----------------------- |
| `prc_hpi_m`     | House price index       |
| `prc_hicp_manr` | Harmonized inflation    |
| `une_rt_m`      | Unemployment rate (déjà utilisé pour chômage jeunes FR/UE-27) |
| `nama_10_gdp`   | GDP and main components |

---

## 4. Politique d'utilisation des données

- **Carburants, IPC INSEE** : Licence Ouverte / Open Licence v2.0 (équivalent CC-BY).
- **Eurostat** : politique de réutilisation Eurostat (source à citer).
- **TRVE (data.gouv)** : licence du jeu à confirmer (dataset parfois « notspecified »).
- Citation de la source obligatoire dans l'interface (footer + page Méthodologie).
- Pas de redistribution des données brutes (on redistribue les agrégats)
- Les archives annuelles ne sont téléchargées qu'une fois (pas de scraping intensif)
- Respect des `robots.txt` et conditions d'utilisation de chaque source
