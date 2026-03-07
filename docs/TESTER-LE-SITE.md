# Tester le site en local

Tu as rempli `apps/web/.env.local`. Voici les commandes à lancer **depuis la racine du projet** (`france-de-macron/`).

---

## 1. Installer les dépendances (si pas déjà fait)

```bash
pnpm install
```

---

## 2. Base de données (Supabase)

**Option A — Supabase cloud (projet déjà créé)**

**Première fois uniquement : se connecter puis lier le projet**

1. **Connexion Supabase** (ouvre le navigateur pour l’auth) :

```bash
pnpm dlx supabase@latest login
```

2. **Lier le projet** à ce repo :

```bash
pnpm dlx supabase@latest link
```

Quand on te le demande :

- **Project ref** : dans le dashboard Supabase → **Settings** → **General** (champ « Reference ID »), ou dans l’URL `https://**XXXX**.supabase.co` → le ref est **XXXX**.
- **Database password** : le mot de passe de la base (celui défini à la création du projet).

Ensuite, appliquer les migrations :

```bash
pnpm run db:push
```

> **Note :** Si tu n’as pas encore fait `supabase link`, cette commande échouera avec « Cannot find project ref ». Dans ce cas, soit tu fais `link` (ci-dessus), soit tu utilises Supabase en local avec **Option B** et `pnpm run db:push:local`.

**Option B — Supabase en local (Docker)**  
Si tu préfères tout en local :

```bash
pnpm run db:start
# ou : pnpm dlx supabase@latest start
```

Puis dans `apps/web/.env.local` : `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` et les clés anon / service_role affichées au démarrage. Appliquer les migrations sur la base **locale** puis lancer l’app :

```bash
pnpm run db:push:local
pnpm run db:types
pnpm dev
```

_(Pour arrêter : `pnpm dlx supabase@latest stop --no-backup`.)_

**URLs utiles (Supabase local)** :

| Service                    | URL                        |
| -------------------------- | -------------------------- |
| API / REST                 | http://127.0.0.1:54321     |
| Studio                     | http://127.0.0.1:54323     |
| Mailpit                    | http://127.0.0.1:54324     |
| **MCP** (pour Cursor / IA) | http://127.0.0.1:54321/mcp |

Le **serveur MCP** permet à Cursor de dialoguer avec ta base locale (exécuter du SQL, lister les tables, générer les types, voir les logs). Dans Cursor : Settings → Tools & MCP → ajouter une entrée avec l’URL `http://127.0.0.1:54321/mcp` quand Supabase est démarré.

---

## 3. Lancer le site

```bash
pnpm dev
```

Quand le serveur est prêt, ouvre dans le navigateur :

**http://localhost:3040**

---

## 4. Vérifications optionnelles

| Commande             | Rôle                                      |
| -------------------- | ----------------------------------------- |
| `pnpm run lint`      | Vérifier le code (ESLint)                 |
| `pnpm run typecheck` | Vérifier les types TypeScript             |
| `pnpm run build`     | Build de production (détecte les erreurs) |

---

## Récap (Supabase local)

```bash
pnpm install
pnpm run db:start
pnpm run db:push:local
pnpm dev
```

Puis ouvre **http://localhost:3040**. (Avec un projet Supabase cloud lié : `pnpm run db:push` à la place de `db:push:local`.)

---

## En cas de souci

- **Erreur Supabase / migrations** : vérifie que `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` dans `apps/web/.env.local` correspondent à ton projet Supabase (Dashboard → Settings → API).
- **Port déjà utilisé** : change le port dans `apps/web/package.json` (script `dev` : `next dev -p XXXX`).
- **`supabase` introuvable** : les scripts utilisent `pnpm dlx supabase@latest`. Si ça échoue, installe la CLI en global : `npm i -g supabase` puis lance `supabase db push` à la main.
- **« Cannot find project ref »** : tu utilises probablement `db:push` (pour projet distant). En local, utilise **`pnpm run db:push:local`** après `pnpm run db:start`. Pour pousser vers le cloud, exécute d’abord `pnpm dlx supabase@latest link` (voir section 2, Option A).
- **« Access token not provided »** : connecte-toi avec `pnpm dlx supabase@latest login`, puis refais `link`.
