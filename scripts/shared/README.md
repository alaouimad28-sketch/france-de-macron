# Module partagé — scripts carburant

Code commun aux jobs d’ingestion quotidienne (données roulez-eco.fr → `fuel_daily_agg`).

## Exports

- **download** : `downloadDayXml(date)` — télécharge le ZIP du jour, décompresse, retourne le XML (ISO-8859-1). Lance `DayDataUnavailableError` si 404 ou réponse HTML.
- **parse** : `parseDayXmlToAggregates(xml, day)` — parse le XML en streaming (sax), agrège par carburant (ruptures exclues, prix ∈ [0.5, 5.0] €/L), retourne `FuelDayAggregate[]`.
- **upsert** : `upsertFuelAggregates(supabase, rows)` — upsert en base dans `fuel_daily_agg` (ON CONFLICT DO UPDATE), par lots de 500.
- **constants** : `FUEL_CODES`, `MIN_PRICE`, `MAX_PRICE`, `round3`, `FETCH_TIMEOUT_MS`, `RETRY_DELAYS_MS`.
- **fci** : `FCI_BASELINE`, `normalize()`, `calcFCIv1(gazole30j, e10_30j)` — calcul French Cooked Index™ v1.
- **calc-and-upsert-fci** : `calcAndUpsertFCI(supabase, day)` — lit les 30j gazole/e10, calcule le score, upsert dans `fci_daily` (utilisé par fuel-daily et fci-backfill).
- **types** : `FuelDayAggregate`, `DayDataUnavailableError`.

## Utilisation

Utilisé par :

- `fuel-backfill-j30` — backfill 30 jours
- `fuel-backfill-last` — rafraîchir hier (et optionnellement aujourd’hui)
- `fuel-daily` — job quotidien J-1 (ou replay avec `FUEL_DATE`)

Les scripts qui l’utilisent chargent eux-mêmes les variables d’environnement (dotenv) et créent le client Supabase ; le module partagé ne fait pas d’I/O Supabase hormis via `upsertFuelAggregates(supabase, rows)`.
