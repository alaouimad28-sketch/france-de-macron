# Lighthouse + Core Web Vitals (lab proxy)

Script reproductible pour auditer Lighthouse et vérifier les seuils Core Web Vitals (proxy labo) avec artefacts exploitables en local et en CI.

## Commandes

Depuis la racine du repo :

```bash
pnpm run seo:lighthouse
```

Le script démarre automatiquement l'app en production (`next start`) sur le port `4020` si `LIGHTHOUSE_BASE_URL` n'est pas fourni.

## Variables utiles

- `LIGHTHOUSE_BASE_URL` — URL déjà démarrée (sinon le script démarre un serveur local)
- `LIGHTHOUSE_PORT` — port utilisé pour le serveur local auto-start (défaut `4020`)
- `LIGHTHOUSE_PATHS` — pages auditées (CSV, défaut `/,/about,/methodology,/disclaimer`)
- `LIGHTHOUSE_ARTIFACT_DIR` — dossier d'artefacts (défaut `artifacts/lighthouse`)

## Sorties / artefacts

Le script crée un dossier timestampé :

```text
artifacts/lighthouse/<timestamp>/
  home.report.json
  home.report.html
  ...
  report.md
  summary.json
```

Un pointeur `artifacts/lighthouse/latest/` est aussi mis à jour à chaque run.

## Seuils appliqués (PASS/FAIL)

### Catégories Lighthouse

- Performance >= 90
- Accessibility >= 90
- SEO >= 90
- Best Practices >= 90

### Core Web Vitals (proxy labo via Lighthouse)

- LCP <= 2500ms
- CLS <= 0.1
- INP <= 200ms (si disponible dans le rapport)

Le script retourne un code de sortie non-zéro si un seuil échoue (idéal pour CI).
