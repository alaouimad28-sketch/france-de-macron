# insee-ipc-food-backfill

Ingestion mensuelle de l’IPC alimentaire INSEE (API BDM) vers `public.ipc_food_monthly`.

## Commande

```bash
pnpm run insee:ipc:food:backfill
```

## Variables d’environnement

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
INSEE_API_TOKEN=... # Optionnel pour bdm.insee.fr (service SDMX public). Obligatoire si l’accès passe par le portail avec auth.
INSEE_BDM_API_BASE_URL=https://bdm.insee.fr/series/sdmx/data/SERIES_BDM
INSEE_IPC_FOOD_SERIES_ID=011813717   # IPC alimentaire base 2025 (données récentes, ex. 2026-02 ; LAST_UPDATE ~ fin du mois)
INSEE_LAST_N_OBSERVATIONS=  # optionnel : ex. 24 pour les 24 dernières observations (guide SDMX : lastNObservations)
INSEE_API_TIMEOUT_MS=30000
DRY_RUN=0 # mettre 1 pour tester sans écrire en base
```

## Pipeline

1. **Fetch** : appel `GET /SERIES_BDM/{seriesId}` (Bearer token optionnel pour bdm.insee.fr).
2. **Normalize** : extraction d’observations mensuelles depuis le JSON (formats `TIME_PERIOD` / `OBS_VALUE` + variantes).
3. **Store** : upsert idempotent dans `public.ipc_food_monthly` (clé unique `month + source_series_id`).

## Notes

- **Référence** : guide officiel _Accès aux indices et séries chronologiques via un service web respectant la norme SDMX_, v2.2 (Juin 2020) — deux canaux (bdm.insee.fr direct sans clé ; api.insee.fr avec inscription), paramètres `startPeriod`, `endPeriod`, `lastNObservations`, `firstNObservations`, format StructureSpecificData (Accept: `application/vnd.sdmx.structurespecificdata+xml;version=2.1`). Voir [insee.fr 2862759](https://www.insee.fr/fr/information/2862759).
- **URL** : l’API BDM utilise `bdm.insee.fr/series/sdmx/data/SERIES_BDM`. Variable optionnelle `INSEE_LAST_N_OBSERVATIONS` pour limiter la réponse (ex. `24` = 24 dernières observations).
- Le parser est volontairement robuste au shape JSON (traversée récursive + clés supportées). Si bdm.insee.fr renvoie du XML (SDMX), le script devra être adapté.
- En cas de payload non reconnu (0 observation), le script échoue explicitement pour éviter un faux positif silencieux.
- `raw_payload` conserve l’observation brute pour audit / évolution parser.

## Peupler et tester

1. **Supabase** : avoir une base disponible (local : `pnpm run db:start` puis `pnpm run db:push:local`).
2. **Variables** : dans `apps/web/.env.local` au minimum `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`. Pas besoin de `INSEE_API_TOKEN` pour bdm.insee.fr.
3. **Lancer le backfill** (à la racine du repo) : `pnpm run insee:ipc:food:backfill`
4. **Vérifier** : table `ipc_food_monthly` remplie ; section « Panier alimentaire » sur la home affiche les 3 cartes ; ou `pnpm run qa:autonomous-datasets`.

**Note** : Si les données affichées ne correspondent pas à l’IPC alimentaire, voir ci‑dessous pour trouver le bon idBank.

---

## Comment trouver / vérifier le bon idBank

L’idBank est un identifiant à **9 chiffres** (ex. `001763856`) qui désigne une série précise dans la BDM Insee. Pour l’IPC alimentaire, il faut une série dont le libellé correspond bien à « indice des prix à la consommation » et « alimentation ».

### 1. Sur le site insee.fr (méthode la plus fiable)

1. Aller sur [insee.fr](https://www.insee.fr) → **Statistiques** → **Indices et séries chronologiques** (ou chercher « IPC », « prix à la consommation »).
2. Ouvrir la page des **Prix à la consommation** :  
   [https://www.insee.fr/fr/statistiques/6967912](https://www.insee.fr/fr/statistiques/6967912)  
   ou naviguer depuis **Thèmes** → Revenus, pouvoir d’achat, consommation → Prix à la consommation.
3. Dans les tableaux ou les liens vers les séries, repérer une série du type **« Indice des prix à la consommation - Alimentation »** (ou « IPC - Alimentation », « ensemble des ménages - Alimentation », etc.).
4. En cliquant sur la série, l’**URL** contient souvent l’idBank, par exemple :  
   `https://www.insee.fr/fr/statistiques/serie/001763856`  
   → l’idBank est **001763856**.
5. Vérifier le **libellé** et la **périodicité** (mensuelle = M, annuelle = A) sur la page pour confirmer que c’est bien l’indice alimentaire voulu.

### 2. Vérifier avec l’API (optionnel)

Une fois un idBank candidat trouvé, appeler l’API pour voir le libellé et un échantillon de données :

```bash
curl -sL "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/001763856?lastNObservations=3"
```

Dans la réponse XML, chercher l’élément `<Series` : les attributs **TITLE_FR** (ou **TITLE_EN**) donnent le libellé de la série. Si tu vois « Alimentation », « IPC », « prix à la consommation », c’est très probablement le bon.

### 3. Utiliser le bon idBank dans le script

Définir la variable d’environnement avec l’idBank choisi :

```bash
INSEE_IPC_FOOD_SERIES_ID=001763856 pnpm run insee:ipc:food:backfill
```

Ou mettre `INSEE_IPC_FOOD_SERIES_ID=001763856` dans `apps/web/.env.local` (sans espace autour du `=`).

### idBank retenu pour ce projet

| idBank          | Description (confirmé via API BDM)                                                                                                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`011813717`** | **Indice des prix à la consommation - Base 2025 - Ensemble des ménages - France - Alimentation** (FREQ=M). Série active, mise à jour régulière (LAST_UPDATE typiquement en fin de mois, ex. 2026-02-27). Données jusqu’au mois courant ou J-1 (ex. 2026-02). **Valeur par défaut du script.** |
| `001763856`     | IPC base 2015 – Alimentation y compris restaurants, cantines, cafés (série arrêtée, dernier millésime ~ 2025-12).                                                                                                                                                                             |
| `011813759`     | IPC base 2025 – Alimentation **hors produits frais** uniquement (si tu veux exclure le frais).                                                                                                                                                                                                |

L’IPC n’existe qu’en **mensuel** (pas de série quotidienne ou hebdo côté Insee pour l’alimentation).
