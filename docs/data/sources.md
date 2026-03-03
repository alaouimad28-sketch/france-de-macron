# Sources de données — France de Macron

## 1. Carburants — Source principale MVP

### 1.1 Identification

| Champ | Valeur |
|---|---|
| **Nom** | Prix des carburants en France — Données officielles |
| **Fournisseur** | Ministère de l'Économie (via roulez-eco.fr / data.gouv.fr) |
| **Licence** | Licence Ouverte / Open Licence v2.0 |
| **Mise à jour** | Quotidienne (données J-1 disponibles vers 01:00 UTC) |
| **Couverture** | Toutes stations-service de France métropolitaine + DOM |
| **Format** | XML zippé (ZIP contenant un fichier XML) |

### 1.2 URLs d'accès

```
Flux quotidien (dernier jour disponible) :
  https://donnees.roulez-eco.fr/opendata/jour

Flux quotidien par date (AAAAMMJJ) :
  https://donnees.roulez-eco.fr/opendata/jour/AAAAMMJJ
  ex: https://donnees.roulez-eco.fr/opendata/jour/20241115

Archives annuelles (depuis 2007) :
  https://donnees.roulez-eco.fr/opendata/annee/YYYY
  ex: https://donnees.roulez-eco.fr/opendata/annee/2023
```

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

| Code XML | Code normalisé | Description |
|---|---|---|
| `gazole` | `gazole` | Gazole (Diesel) |
| `sp95` | `sp95` | Sans Plomb 95 |
| `e10` | `e10` | Sans Plomb 95-E10 (bioéthanol 10%) |
| `sp98` | `sp98` | Sans Plomb 98 |
| `e85` | `e85` | Superéthanol E85 |
| `gplc` | `gplc` | GPL carburant |

### 1.5 Contraintes et limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| Données J-1 uniquement | Pas de données temps réel | Acceptable pour le MVP |
| Couverture variable | Certaines stations ne remontent pas chaque jour | Utiliser `sample_count` pour la transparence |
| Autoroutes biaisent la moyenne | Prix moyens légèrement élevés | Documenter, filtrer optionnellement en v2 |
| Flux peut être indisponible | Job cron échoue | Retry + log, affichage "Données indisponibles" |
| Archives annuelles volumineuses | >1 GB pour 5 ans | Téléchargement one-shot uniquement |
| Encodage ISO-8859-1 | Erreurs de parsing si mal géré | Convertir explicitement vers UTF-8 |

### 1.6 Fréquence de mise à jour

```
Source → roulez-eco.fr : quotidien (données J-1, disponibles ~01:00 UTC)
roulez-eco.fr → Supabase : via cron à 02:30 UTC (marge de sécurité)
Supabase → Front : SSR Next.js (at request time, données fraîches)
```

---

## 2. Sources futures (roadmap)

### 2.1 Inflation alimentaire — INSEE

| Champ | Valeur |
|---|---|
| Source | INSEE — Indices des Prix à la Consommation (IPC) |
| URL | `https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001767226` |
| Format | JSON (API REST) |
| Fréquence | Mensuel |
| Licence | Licence Ouverte / Open Licence v2.0 |
| Disponibilité | Gratuit, clé API requise (inscription INSEE) |

### 2.2 Chômage jeunes — Eurostat

| Champ | Valeur |
|---|---|
| Source | Eurostat — Labour Force Survey |
| URL | API Eurostat (SDMX) |
| Fréquence | Trimestriel |
| Licence | Eurostat copyright (usage libre pour data non-commerciale) |

### 2.3 Loyers — CLAMEUR / OLAP

- Disponibilité partielle (certaines villes uniquement)
- À évaluer en v2

### 2.4 Données Eurostat multi-pays (v2 comparaison)

| Dataset | Description |
|---|---|
| `prc_hpi_m` | House price index |
| `prc_hicp_manr` | Harmonized inflation |
| `une_rt_m` | Unemployment rate |
| `nama_10_gdp` | GDP and main components |

---

## 3. Politique d'utilisation des données

- Toutes les données utilisées en MVP sont sous **Licence Ouverte / Open Licence v2.0** (équivalent CC-BY)
- Citation de la source obligatoire dans l'interface (footer + page Méthodologie)
- Pas de redistribution des données brutes (on redistribue les agrégats)
- Les archives annuelles ne sont téléchargées qu'une fois (pas de scraping intensif)
- Respect des `robots.txt` et conditions d'utilisation de chaque source
