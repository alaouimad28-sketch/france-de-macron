# Sources de données — France de Macron

## État actuel (Mars 2026)

| Source                                   | Statut        | Table(s)                      | Commande / fréquence                 |
| ---------------------------------------- | ------------- | ----------------------------- | ------------------------------------ |
| **Carburants** (roulez-eco.fr)           | En production | `fuel_daily_agg`, `fci_daily` | Cron 02:30 UTC + backfills manuels   |
| **IPC alimentaire** (INSEE BDM)          | Implémenté    | `ipc_food_monthly`            | `pnpm run insee:ipc:food:backfill`   |
| **Chômage jeunes** (Eurostat)            | Implémenté    | `youth_unemployment_monthly`  | `pnpm run eurostat:youth:backfill`   |
| **TRVE électricité** (CRE / data.gouv)   | Implémenté    | `electricity_tariff_history`  | `pnpm run electricity:trve:backfill` |
| **Loyers** (CLAMEUR / OLL)               | Roadmap       | —                             | À venir                              |
| **Eurostat multi-pays** (v2 comparaison) | Roadmap       | —                             | À venir                              |

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

| Lieu                      | Rôle                                                                                                                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Source (gouvernement)** | [donnees.roulez-eco.fr](https://donnees.roulez-eco.fr) — serveurs du ministère. Données brutes (ZIP/XML). On ne stocke pas ces fichiers nous-mêmes.                                                                                                                                       |
| **Notre base (Supabase)** | PostgreSQL (Supabase). Tables : `fuel_daily_agg`, `fci_daily` (carburants + FCI) ; `ipc_food_monthly` (IPC alimentaire) ; `youth_unemployment_monthly` (chômage jeunes) ; `electricity_tariff_history` (TRVE). On ne garde que les agrégats / séries normalisées, pas les fichiers bruts. |
| **Front**                 | Next.js lit uniquement dans Supabase (SSR). Le client ne contacte jamais roulez-eco.fr.                                                                                                                                                                                                   |

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
| URL           | `https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/011813717` (voir ci‑dessous) |
| Format        | SDMX (XML par défaut sur bdm.insee.fr) ; le script parse le XML (obs TIME_PERIOD / OBS_VALUE) |
| Fréquence     | Mensuel                                                        |
| Licence       | Licence Ouverte / Open Licence v2.0                            |
| Disponibilité | Gratuit ; **pas de clé requise** pour le service SDMX sur bdm.insee.fr (accès public). Le portail permet un abonnement optionnel (quotas, autre URL). |

#### 2.1.0 Où trouver l’API sur le portail (portail-api.insee.fr)

Sur **[portail-api.insee.fr](https://portail-api.insee.fr/)** (catalogue des API Insee) :

- **L’API à utiliser** : **« Séries chronologiques »** (nom affiché) / **« API BDM »** (nom technique).  
  C’est celle qui donne accès aux *indices et séries chronologiques* (dont l’IPC alimentaire).

- **Où est l’API (URL / doc) ?**
  - Dans la fiche de l’API « Séries chronologiques », l’onglet **Documentation** (ou équivalent) décrit les endpoints et peut indiquer une **URL de base** ou un **environnement** (à utiliser éventuellement dans `INSEE_BDM_API_BASE_URL`).
  - Documentation officielle du service SDMX (même service) : [Service web SDMX | Insee](https://www.insee.fr/fr/information/2862759) — exemples d’URL, paramètres (`detail`, `lastNObservations`, `startPeriod`), accès par **idBank** ou par **dataflow**.

- **URL utilisée dans ce projet** (accès par idBank) :  
  **Base** : `https://bdm.insee.fr/series/sdmx/data/SERIES_BDM`  
  **Série IPC alimentaire (idBank)** : `011813717` (base 2025, Alimentation, mensuel)  
  **URL complète** : `https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/011813717`

- **Abonnement / token** : depuis le portail, en s’abonnant à « Séries chronologiques », tu peux obtenir des identifiants (ex. token Bearer). Si le portail indique une **URL d’environnement** différente de `bdm.insee.fr`, la définir dans `INSEE_BDM_API_BASE_URL`. Limite indiquée sur data.gouv.fr : 30 appels / minute / IP.

#### 2.1.1 Série et stockage (en place)

- Série BDM : **`011813717`** par défaut (IPC **base 2025** – *Alimentation*, FREQ=M, données à jour : LAST_UPDATE en fin de mois, ex. 2026-02). Ancienne série base 2015 : `001763856` (série arrêtée). Configurable via `INSEE_IPC_FOOD_SERIES_ID`. L’IPC est diffusé en **mensuel** uniquement (pas de quotidien ni hebdo). Voir `scripts/insee-ipc-food-backfill/README.md` § « Comment trouver / vérifier le bon idBank ». **Affichage** : les valeurs sont stockées en base 2025 ; le front applique un rebasement vers la base 2015 (moyenne de l’année 2015 = 100) via `apps/web/src/lib/ipc.ts`, en utilisant la moyenne des 12 mois de 2015 dans `ipc_food_monthly` comme coefficient.
- Table : `public.ipc_food_monthly` (migration `20240101000008`).
- Clé d'idempotence : `(month, source_series_id)`.
- Granularité : **mensuelle**, sans désaisonnalisation (valeurs brutes publiées).

#### 2.1.2 Ingestion

1. **Fetch** (script `scripts/insee-ipc-food-backfill/index.ts`)
   - Appel de l'endpoint BDM (bdm.insee.fr). `INSEE_API_TOKEN` optionnel (service SDMX public).
   - Variables prévues : `INSEE_BDM_API_BASE_URL`, `INSEE_IPC_FOOD_SERIES_ID`.
2. **Normalize**
   - Mapper les observations vers `{ month, index_value }`.
   - Contraindre `month` au 1er jour du mois (`date_trunc('month', month) = month`).
3. **Store**
   - Upsert vers `public.ipc_food_monthly`.
   - Persistance du `raw_payload` pour traçabilité / debug parser.

#### 2.1.3 Incertitudes ouvertes

- **Documentation officielle** : *Accès aux indices et séries chronologiques via un service web respectant la norme SDMX*, guide d’utilisation v2.2 (Juin 2020). Décrit les deux canaux (accès direct **bdm.insee.fr** sans inscription ; accès via **api.insee.fr** avec inscription), la forme des requêtes (`/data/SERIES_BDM/idbanks?startPeriod=…&lastNObservations=…`), les formats TIME_PERIOD (AAAA, AAAA-Qn, AAAA-nn…), OBS_VALUE (point décimal, `NaN` si manquant), et l’en-tête Accept (`application/vnd.sdmx.structurespecificdata+xml;version=2.1`). Voir aussi [Service web SDMX | Insee](https://www.insee.fr/fr/information/2862759).
- **URL** : l’ancienne base `api.insee.fr` est dépréciée ; le projet utilise `bdm.insee.fr/series/sdmx/data/SERIES_BDM`. S’inscrire / gérer les accès sur [portail-api.insee.fr](https://portail-api.insee.fr/).
- Confirmer la stratégie de rotation du token INSEE pour exécution cron (optionnel : accès public sans token).
- Série par défaut : **011813717** (IPC base 2025 – Alimentation). Autres idBank (ex. base 2015, séries arrêtées) documentés dans `scripts/insee-ipc-food-backfill/README.md`.
- Le script gère la réponse SDMX XML de bdm.insee.fr (parser dédié ; pas de JSON attendu en production).

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

| Dataset         | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `prc_hpi_m`     | House price index                                             |
| `prc_hicp_manr` | Harmonized inflation                                          |
| `une_rt_m`      | Unemployment rate (déjà utilisé pour chômage jeunes FR/UE-27) |
| `nama_10_gdp`   | GDP and main components                                       |

---

## 4. Politique d'utilisation des données

- **Carburants, IPC INSEE** : Licence Ouverte / Open Licence v2.0 (équivalent CC-BY).
- **Eurostat** : politique de réutilisation Eurostat (source à citer).
- **TRVE (data.gouv)** : licence du jeu à confirmer (dataset parfois « notspecified »).
- Citation de la source obligatoire dans l'interface (footer + page Méthodologie).
- Pas de redistribution des données brutes (on redistribue les agrégats)
- Les archives annuelles ne sont téléchargées qu'une fois (pas de scraping intensif)
- Respect des `robots.txt` et conditions d'utilisation de chaque source
