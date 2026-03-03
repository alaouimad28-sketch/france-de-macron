# Script : fuel-backfill-j30

Backfill des 30 derniers jours de données carburant.

## Objectif

Remplir la table `fuel_daily_agg` avec les agrégats quotidiens nationaux
pour chaque jour de la période [aujourd'hui - 30 jours, hier].

À lancer **une seule fois** après le déploiement initial, ou pour réinitialiser
les données historiques.

## Source

API officielle : `https://donnees.roulez-eco.fr/opendata/jour/AAAAMMJJ`

Format : ZIP contenant un fichier XML avec toutes les stations France.

Voir [docs/data/sources.md](../../docs/data/sources.md) pour la documentation complète.

## Algorithme

```
Pour chaque jour D dans [today-30, yesterday] :
  1. Construire l'URL : /opendata/jour/YYYYMMDD
  2. Télécharger le ZIP
  3. Extraire le fichier XML
  4. Parser les stations :
     - Filtrer les stations fermées (rupture = true)
     - Extraire prix par carburant (gazole, e10, sp98, e85, gplc, sp95)
     - Ignorer les prix nuls ou invalides (< 0.5 ou > 5.0 €/L)
  5. Calculer agrégats nationaux par carburant :
     - avg_price = moyenne arithmétique des prix valides
     - min_price = minimum
     - max_price = maximum
     - sample_count = nombre de stations contribuantes
  6. Upsert dans fuel_daily_agg (ON CONFLICT DO UPDATE)
  7. Logger le résultat (jour, carburant, avg, count)

Après le backfill :
  - Calculer le FCI pour chaque jour backfillé
  - Upsert dans fci_daily
```

## Structure XML source (extrait)

```xml
<pdv_liste>
  <pdv id="75001001" latitude="4875948" longitude="233086" cp="75001" pop="R" adresse="..." ville="PARIS" ...>
    <prix nom="gazole" id="1" maj="2024-11-15T08:00:00" valeur="1.689"/>
    <prix nom="e10" id="5" maj="2024-11-15T08:00:00" valeur="1.799"/>
    <!-- ... -->
    <rupture id="2" nom="e10" debut="2024-11-10T00:00:00" fin=""/>
  </pdv>
</pdv_liste>
```

Règles de parsing :

- `valeur` en centimes d'euro pour les anciens flux, en euros pour les flux récents
  → **Vérifier le diviseur** : si valeur > 10, diviser par 1000
- `rupture` sans date de fin = station actuellement en rupture → exclure pour ce carburant
- `latitude/longitude` en degrés × 100 000

## Gestion des erreurs

| Erreur                                 | Comportement                                      |
| -------------------------------------- | ------------------------------------------------- |
| HTTP 404 (jour manquant)               | Logger + ignorer (données indisponibles ce jour)  |
| HTTP 429 / 503                         | Retry avec backoff exponentiel (max 3 tentatives) |
| XML invalide / corrompu                | Logger l'erreur + skip le jour                    |
| Prix aberrant (< 0.5 ou > 5.0)         | Exclure la station pour ce carburant              |
| Moins de 10 stations pour un carburant | Logger warning (donnée peu représentative)        |

## Idempotence

Utilise `INSERT INTO fuel_daily_agg ... ON CONFLICT (day, fuel_code) DO UPDATE`.
Safe à relancer autant de fois que nécessaire.

## Performance estimée

- ~30 requêtes HTTP (une par jour)
- Chaque ZIP pèse ~5–10 MB (décompressé ~30 MB)
- Parsing XML : ~8 000 stations × 6 carburants = ~50 000 entrées par jour
- Durée estimée : 2–5 minutes selon le débit réseau

## État d'implémentation

- [x] Téléchargement ZIP + détection HTML (dates hors fenêtre ~30j)
- [x] Parsing XML en streaming (`sax`), ruptures, filtre prix [0.5, 5.0] €/L
- [x] Calcul agrégats (avg, min, max, sample_count) par carburant
- [x] Upsert Supabase (`ON CONFLICT day,fuel_code`)
- [x] Retry × 3 avec backoff (1s, 5s, 30s)
- [x] Boucle principale 30 jours + résumé
- [ ] Calcul FCI post-backfill (`calcAndUpsertFCI` non branché)
- [ ] Tests unitaires sur le parsing
