# Contribution & PR Review Checklist

Ce projet utilise `**orchestrator/autonomous-dev-base**` comme branche d’intégration.

> ⚠️ Ne pas cibler `main` pour les PR de développement courant.

## Flux Git (obligatoire)

1. Mettre à jour la base locale :

- `git checkout orchestrator/autonomous-dev-base`
- `git pull --ff-only origin orchestrator/autonomous-dev-base`

2. Créer une branche feature/fix depuis cette base :

- `git checkout -b <type>/<scope>-<short>`

3. Commits avec Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
4. Ouvrir la PR vers `**orchestrator/autonomous-dev-base**`.

---

## Checklist auteur (avant PR)

- Branche créée depuis `orchestrator/autonomous-dev-base`
- PR cible `orchestrator/autonomous-dev-base` (pas `main`)
- Changements limités au scope de la PR
- `pnpm run validate` exécuté localement
- `pnpm run build` exécuté localement
- Documentation mise à jour (README / docs/INDEX / progress si nécessaire)
- Pas de secret en dur ni de variables `NEXT_PUBLIC_` sensibles

---

## Checklist reviewer (code review)

### 1) Qualité & CI

- Workflow **CI Quality Gate** vert (install + validate + build)
- Pas de lint/type errors cachés dans les logs
- Aucune étape CI contournée

### 2) Sécurité

- `SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur
- Aucune clé sensible exposée au client
- Les écritures sensibles passent par les routes serveur prévues
- RLS non affaibli dans les migrations/policies

### 3) Architecture & conventions

- TypeScript strict respecté (pas de `any` injustifié)
- Server Components par défaut ; `use client` seulement si nécessaire
- Respect du design system et conventions de structure
- Changements cohérents avec `docs/product/PRD.md` et `docs/progress.md`

### 4) Validation fonctionnelle

- Le comportement principal de la fonctionnalité est testé
- Les cas d’erreur/états vides sont gérés
- Pas de régression visible sur home / sections critiques

---

## Conditions de merge

- Au moins 1 review approuvée
- CI Quality Gate ✅
- Aucun commentaire bloquant non traité
- PR propre (titre, description, impact, tests)
