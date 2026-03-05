# Guide de mise à jour de la documentation

> **À lire avant de commencer à travailler sur le projet.**
> Ce guide répond à une seule question : **quelle(s) doc(s) mettre à jour selon ce que tu viens de faire ?**
>
> Règle d'or : si tu touches du code, tu touches la doc. Les deux évoluent ensemble.

---

## Carte des documents (interconnexions)

```
kickoff.md ──────────────────────────────── Brief agent (point d'entrée)
    │
    ├── progress.md ──────────────────────── Source de vérité des tâches (toujours à jour)
    │
    ├── INDEX.md ─────────────────────────── Index général (fichiers de code + commandes)
    │
    ├── product/
    │   ├── PRD.md ───────────────────────── Périmètre MVP + specs fonctionnelles
    │   └── roadmap.md ───────────────────── Statuts phase par phase
    │
    ├── data/
    │   ├── sources.md ───────────────────── Sources officielles, licences, tables DB
    │   ├── pipeline.md ──────────────────── Architecture, jobs, idempotence
    │   └── methodology.md ───────────────── Formule FCI, pondérations, versions
    │
    ├── design/
    │   └── design-system.md ─────────────── Palette, typo, composants, animations
    │
    ├── security/
    │   └── threat-model.md ──────────────── RLS, secrets, menaces, checklist release
    │
    ├── seo/
    │   └── social-sharing.md ────────────── Metadata, OG, sitemap, CWV
    │
    ├── deployment-runbook.md ────────────── Ordre exact lancement prod
    ├── TESTER-LE-SITE.md ────────────────── Guide dev local
    ├── contributing-review-checklist.md ─── Checklist PR / code review
    └── addons-research.md ───────────────── Log recherche ajouts P0/P1/P2
```

---

## Par type de travail

### 1. Nouveau script d'ingestion de données

> Tu ajoutes ou modifies un script dans `scripts/` (nouvelle source, nouveau backfill, nouveau cron).

| Doc à mettre à jour | Quoi changer |
| ------------------- | ------------ |
| `docs/data/sources.md` | Ajouter la source (§ 2 si déjà implémentée, § 3 si roadmap), table(s) créée(s), licence, URL d'accès, paramètres retenus |
| `docs/data/pipeline.md` | Ajouter le job dans le tableau Vue d'ensemble + section dédiée (déclenchement, fichier, commande, idempotence) |
| `docs/INDEX.md` | Ajouter le script dans § "Fichiers de code clés" et la commande dans § "Commandes utiles" |
| `README.md` | Ajouter la commande dans le tableau des commandes |
| `docs/progress.md` | Cocher la case correspondante dans la phase / pipeline concerné |
| `scripts/<job>/README.md` | Créer ou mettre à jour le README du script (usage, env, DRY_RUN, exemples) |

**Interdépendances** : `sources.md` ↔ `pipeline.md` (même source, décrite dans l'un, ingérée dans l'autre).

---

### 2. Nouveau composant UI ou modification d'un composant existant

> Tu ajoutes ou modifies un composant dans `apps/web/src/components/`.

| Doc à mettre à jour | Quoi changer |
| ------------------- | ------------ |
| `docs/INDEX.md` | Ajouter le fichier composant dans § "Fichiers de code clés" |
| `docs/design/design-system.md` | Si nouveau composant : l'ajouter dans § 5 (inventaire composants) avec ses props et son comportement |
| `docs/product/PRD.md` | Si le composant change les specs fonctionnelles (§ 6) |
| `docs/progress.md` | Cocher la case dans PHASE 2 ou la section correspondante |

**Interdépendances** : `design-system.md` ↔ `PRD.md` (le design system implémente les specs fonctionnelles du PRD).

---

### 3. Nouvelle page ou route de navigation

> Tu ajoutes une page (`apps/web/src/app/<route>/page.tsx`) ou une route d'API (`/api/...`).

| Doc à mettre à jour | Quoi changer |
| ------------------- | ------------ |
| `docs/INDEX.md` | Ajouter le fichier page/route dans § "Fichiers de code clés" |
| `docs/seo/social-sharing.md` | Ajouter la page dans § 1.1 (pages indexables), metadata, sitemap |
| `docs/security/threat-model.md` | Si la route expose des données sensibles ou accepte des écritures : ajouter la menace et les mitigations |
| `docs/product/PRD.md` | Si la page fait partie du scope (§ 4) |
| `docs/progress.md` | Cocher la case concernée |

**Interdépendances** : `social-sharing.md` ↔ `threat-model.md` (chaque route publique peut avoir des implications SEO ET sécurité).

---

### 4. Nouvelle migration Supabase (schéma DB)

> Tu crées un fichier `supabase/migrations/*.sql`.

| Doc à mettre à jour | Quoi changer |
| ------------------- | ------------ |
| `docs/data/sources.md` | Mentionner la table créée dans la section de la source correspondante |
| `docs/data/pipeline.md` | Mettre à jour le tableau Vue d'ensemble (table(s) concernées) |
| `docs/security/threat-model.md` | Mettre à jour le tableau RLS Strategy (§ 4) avec la nouvelle table |
| `docs/INDEX.md` | Si nouvelle table notable : mentionner la migration dans § "Fichiers de code clés" |
| `apps/web/src/lib/supabase/database.types.ts` | Régénérer (`pnpm run db:types`) après chaque migration appliquée |

**Interdépendances** : `threat-model.md` RLS ↔ `sources.md` (chaque table a une politique de lecture publique ou service-role-only).

---

### 5. Changement de la formule FCI (méthodologie)

> Tu modifies `scripts/shared/fci.ts`, les baselines, les pondérations, ou tu implémentes FCI v2.

| Doc à mettre à jour | Quoi changer |
| ------------------- | ------------ |
| `docs/data/methodology.md` | Mettre à jour la section version concernée (§ 3 v1 ou § 4 v2), formule, baselines, labels, historique des versions (§ 7) |
| `docs/data/pipeline.md` | Mettre à jour la section "Calcul du FCI" + algorithme |
| `docs/INDEX.md` | Si nouveaux fichiers de calcul |
| `docs/progress.md` | Cocher / documenter la livraison dans Notes de session |

**Interdépendances** : `methodology.md` est la référence publique (affiché sur `/methodology`) ; `pipeline.md` décrit l'implémentation. Les deux doivent rester synchronisés.

---

### 6. Modification du design system (couleurs, typo, composants)

> Tu changes `apps/web/tailwind.config.ts`, les CSS vars globaux, ou les tokens.

| Doc à mettre à jour | Quoi changer |
| ------------------- | ------------ |
| `docs/design/design-system.md` | Mettre à jour la palette (§ 2), typo (§ 3), ou l'inventaire composants (§ 5) selon ce qui a changé |
| `docs/kickoff.md` | Si les noms de couleurs changent (§ "Fichiers critiques à ne jamais casser") |

---

### 7. Sécurité (RLS, secrets, nouveaux endpoints sensibles)

> Tu touches `supabase/migrations/*rls*.sql`, `apps/web/src/lib/supabase/server.ts`, ou un Route Handler qui écrit en DB.

| Doc à mettre à jour | Quoi changer |
| ------------------- | ------------ |
| `docs/security/threat-model.md` | Mettre à jour § 2 (menaces/mitigations), § 3 (inventaire secrets si nouveau), § 4 (tableau RLS si nouvelle table), checklist § 5 |
| `docs/contributing-review-checklist.md` | Si nouvelle règle de sécurité à systématiser |

**Règle absolue à rappeler dans la doc** : tout nouveau secret → ne jamais préfixer `NEXT_PUBLIC_`, ne jamais commiter.

---

### 8. SEO / metadata / OG

> Tu touches `apps/web/src/app/layout.tsx`, `sitemap.ts`, `robots.txt`, `next.config.ts` (headers), ou `generateMetadata` sur une page.

| Doc à mettre à jour | Quoi changer |
| ------------------- | ------------ |
| `docs/seo/social-sharing.md` | § 1.2 (metadata), § 1.3 (robots.txt), § 1.4 (sitemap), § 1.5 (JSON-LD), § 2 (OG image), § 4 (CWV) selon ce qui a changé |
| `docs/product/PRD.md` | Si les pages indexables changent (§ 4 In scope) |

---

### 9. Déploiement / infrastructure (Vercel, Supabase prod, CI)

> Tu modifies `vercel.json`, `.github/workflows/`, des variables d'env, ou tu valides le runbook.

| Doc à mettre à jour | Quoi changer |
| ------------------- | ------------ |
| `docs/deployment-runbook.md` | Mettre à jour l'ordre des étapes, les critères PASS/FAIL, les variables requises |
| `docs/TESTER-LE-SITE.md` | Si le setup local change (nouvelles commandes, nouveaux prérequis) |
| `docs/INDEX.md` | § "Commandes utiles" si nouvelles commandes deploy/verify |
| `docs/progress.md` | Cocher Phase 6 (déploiement) |
| `README.md` | Si nouvelles variables d'env ou commandes à documenter |

---

### 10. QA / scripts de tests

> Tu ajoutes ou modifies un script dans `scripts/qa/` ou `scripts/deploy/`.

| Doc à mettre à jour | Quoi changer |
| ------------------- | ------------ |
| `docs/INDEX.md` | Ajouter le script dans § "Fichiers de code clés" et la commande dans § "Commandes utiles" |
| `scripts/qa/README.md` | Décrire le nouveau check (objectif, usage, mode CI) |
| `docs/progress.md` | Cocher la case QA correspondante dans Phase 7 |
| `README.md` | Si nouvelle commande `pnpm run qa:*` |

---

### 11. Ajout d'un indicateur complet (source + pipeline + UI)

> C'est la combo la plus complète. Exemple : on ajoute un indicateur logements.

**Ordre conseillé** :

1. **`docs/addons-research.md`** — ajouter la recherche initiale (source, risques, plan)
2. **`docs/data/sources.md`** — documenter la source (§ 2 ou § 3 si roadmap)
3. **`docs/data/pipeline.md`** — décrire le job (tableau Vue d'ensemble + section dédiée)
4. **Migration Supabase** → `docs/security/threat-model.md` (tableau RLS) + `database.types.ts`
5. **Composant UI** → `docs/design/design-system.md` + `docs/INDEX.md`
6. **`docs/data/methodology.md`** — si l'indicateur entre dans le score FCI (§ 4 v2)
7. **`docs/product/PRD.md`** — si le scope produit évolue
8. **`docs/product/roadmap.md`** — mettre à jour le statut dans la bonne version
9. **`docs/progress.md`** — cocher les cases + note dans "Notes de session"
10. **`docs/INDEX.md`** + **`README.md`** — nouveaux fichiers et commandes

---

## Règle des "Notes de session" dans `progress.md`

À la fin de chaque session de travail significative, ajouter une note dans `docs/progress.md` § "Notes de session" :

```markdown
### <JJ Mois Année> — <Titre court de ce qui a été fait>

- Ce qui a été livré (composants, scripts, tables, etc.)
- Décisions prises (ex. "on garde FCI v1, v2 pour plus tard")
- Bugs ou limitations connues
- Ce qui reste à faire pour la prochaine session
```

Cette section sert de journal de bord et évite de re-découvrir des décisions oubliées.

---

## Checklist rapide avant de commiter

```
[ ] docs/progress.md mis à jour (cases cochées + note si session significative)
[ ] docs/INDEX.md mis à jour si nouveaux fichiers ou commandes
[ ] README.md mis à jour si nouvelles commandes
[ ] Doc de domaine mise à jour (sources / pipeline / methodology / design-system selon ce qui a changé)
[ ] pnpm run validate passé (typecheck + lint)
```
