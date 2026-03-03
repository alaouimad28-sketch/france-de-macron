# Modèle de menaces — France de Macron

> Document de référence pour la sécurité du projet. À mettre à jour à chaque nouvelle fonctionnalité.

---

## 1. Contexte et surface d'attaque

France de Macron est un site public **sans authentification utilisateur** en MVP. La surface d'attaque est limitée mais réelle :

- **Newsletter** : capture d'emails → risque de spam / harvesting
- **Votes** : système anti-abus sans compte → risque de bourrage
- **APIs internes** : endpoints Next.js → risque d'abus
- **Pipeline de données** : cron backend → risque d'injection ou d'exposition de secrets
- **Supabase** : base de données → risque d'accès non autorisé si mal configuré

---

## 2. Menaces identifiées et mitigations

### 2.1 Spam sur la newsletter

**Menace** : Inscription en masse d'emails fictifs via scripts, bots, ou services de spam.

**Impact** : Pollution de la base d'emails, coûts d'envoi inutiles, dégradation du taux d'ouverture.

**Mitigations** :

| Couche            | Mesure                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------- |
| HTML              | Champ `website` caché (honeypot) — visible aux bots, invisible aux humains                |
| JavaScript        | Vérification côté client que le honeypot est vide (ne pas faire confiance seul)           |
| Serveur (Next.js) | Vérification honeypot côté serveur (seule vérification fiable)                            |
| Serveur           | Validation du format email (regex + MX check en v2)                                       |
| DB                | Contrainte UNIQUE sur l'email                                                             |
| DB                | RLS : aucun INSERT public possible (service role only)                                    |
| App               | Rate limit par IP : max 3 inscriptions / IP / heure (via Vercel Edge ou Upstash Redis v2) |

**Pourquoi pas de CAPTCHA ?** UX : les CAPTCHA dégradent fortement la conversion sur mobile. Le honeypot + rate limit est suffisant pour le MVP. Un CAPTCHA peut être ajouté si des abus sont détectés.

### 2.2 Bourrage de votes (vote stuffing)

**Menace** : Un utilisateur vote des centaines de fois pour fausser le ratio cooked/uncooked.

**Impact** : Résultats non représentatifs, crédibilité du module vote affectée.

**Mitigations** :

| Couche  | Mesure                                                                        |
| ------- | ----------------------------------------------------------------------------- |
| DB      | Index unique : `(scope, day, fingerprint_hash)` → 1 vote/scope/jour/empreinte |
| Serveur | Calcul de l'empreinte côté serveur (non spoofable)                            |
| Serveur | Vérification que le fingerprint_hash correspond au User-Agent + IP hash       |
| App     | Rate limit : max 10 votes / IP / heure                                        |
| Client  | Stockage `localStorage` du vote pour désactiver le bouton (UX, pas sécurité)  |

**Limites** : Un attaquant avec accès à de nombreuses IPs distinctes (VPN, botnet) peut contourner ces mesures. Le système de vote est affiché comme indicatif et non scientifique. C'est acceptable pour le MVP.

### 2.3 Injection SQL

**Menace** : Un attaquant injecte du SQL malicieux via les paramètres de l'API.

**Mitigations** :

- Utilisation exclusive du SDK Supabase (requêtes paramétrées, pas de SQL brut côté client)
- Validation des inputs avec des schémas stricts (Zod en v1.1)
- Pas d'interpolation de chaînes dans les requêtes

### 2.4 Exposition de la clé service role

**Menace** : La clé `SUPABASE_SERVICE_ROLE_KEY` est exposée côté client ou dans les logs.

**Impact** : Accès total à la base de données, bypass de toutes les RLS policies.

**Mitigations** :

| Règle          | Détail                                                                              |
| -------------- | ----------------------------------------------------------------------------------- |
| Variable d'env | Pas de préfixe `NEXT_PUBLIC_` → Next.js ne l'envoie jamais au client                |
| Code           | Fonction `createServiceClient()` lève une erreur si `typeof window !== 'undefined'` |
| Git            | `.env.local` dans `.gitignore` (jamais commité)                                     |
| CI/CD          | Secrets Vercel uniquement, pas dans le code                                         |
| Logs           | La clé n'est jamais loggée (vérifier les Cloud Functions logs)                      |

### 2.5 CSRF (Cross-Site Request Forgery)

**Menace** : Un site malveillant déclenche une action (newsletter signup, vote) en incitant un utilisateur connecté à cliquer.

**Contexte** : Pas d'auth → pas de sessions → risque CSRF très limité en MVP.

**Mitigations** :

- Les Route Handlers vérifient le `Content-Type: application/json`
- En v2 (si auth) : tokens CSRF via Next.js Server Actions (protection native)

### 2.6 XSS (Cross-Site Scripting)

**Menace** : Injection de scripts malicieux via des données contrôlées par l'utilisateur.

**Contexte** : MVP — aucune donnée utilisateur affichée dans le HTML (pas de commentaires, pas de profils).

**Mitigations** :

- React échappe automatiquement les données JSX
- Les données Supabase (events, labels) sont saisies manuellement (pas de saisie libre utilisateur)
- En v2 : si contenu utilisateur affiché, utiliser DOMPurify

### 2.7 Content Security Policy (CSP)

CSP configurée dans `next.config.ts` (voir le fichier).

En production : renforcer en remplaçant `unsafe-inline` et `unsafe-eval` par des nonces générés par Next.js.

### 2.8 Abuse du cron endpoint

**Menace** : Un attaquant appelle `/api/cron/fuel-daily` directement pour déclencher le job.

**Impact** : Surconsommation des ressources, potentiellement des quotas API carburant.

**Mitigation** :

```typescript
// Vérification du secret Vercel Cron
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

`CRON_SECRET` : chaîne aléatoire ≥ 32 caractères, stockée comme secret Vercel.

### 2.9 Data poisoning du pipeline

**Menace** : L'API officielle (roulez-eco.fr) retourne des données corrompues ou malveillantes.

**Mitigations** :

- Validation des données parsées (prix ∈ [0.5, 5.0] €/L)
- Comparaison avec J-1 : si variation > 50%, log une alerte
- Source officielle et en licence ouverte — risque faible mais non nul
- Les données brutes ne sont jamais affichées directement (agrégées d'abord)

---

## 3. Secrets et variables d'environnement

### Inventaire des secrets

| Secret                          | Usage                      | Exposition               | Stockage            |
| ------------------------------- | -------------------------- | ------------------------ | ------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`     | Écritures DB (server only) | Jamais client            | Vercel Secrets      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Lectures DB (client safe)  | Client OK (RLS en place) | .env.local + Vercel |
| `CRON_SECRET`                   | Authentifier le cron       | Jamais client            | Vercel Secrets      |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL Supabase               | Client OK                | .env.local + Vercel |

### Règles absolues

1. **Jamais** de secrets dans le code source (même en commentaire)
2. **Jamais** de préfixe `NEXT_PUBLIC_` sur une clé secrète
3. **Jamais** de `console.log(process.env)` en production
4. **Toujours** régénérer un secret si compromis (et auditer les logs)
5. **Rotation** : les clés service role Supabase peuvent être régénérées depuis le dashboard

---

## 4. RLS Strategy (Row Level Security)

Voir la migration `supabase/migrations/20240101000006_rls_policies.sql` pour le SQL complet.

### Résumé

```
Table             | SELECT (anon) | INSERT (anon) | Notes
------------------|---------------|---------------|------
data_sources      | ✅ oui        | ❌ non        |
fuel_daily_agg    | ✅ oui        | ❌ non        |
events            | ✅ oui        | ❌ non        |
fci_daily         | ✅ oui        | ❌ non        |
newsletter_signups| ❌ non        | ❌ non        | Service role only
votes             | ✅ oui        | ❌ non        | Service role only
```

### Défense en profondeur

La stratégie est volontairement redondante :

1. **Couche réseau** : HTTPS forcé
2. **Couche application** : validation des inputs dans les Route Handlers
3. **Couche RLS** : politiques Supabase qui bloquent l'accès non autorisé
4. **Couche clé** : service role key non exposée (jamais NEXT*PUBLIC*)

Si une couche est contournée, les autres tiennent.

---

## 5. Checklist sécurité (avant chaque release)

- [ ] Aucun secret dans le diff git (`git log --all -S "supabase_key"`)
- [ ] `.env.local` absent du repo (`.gitignore` vérifié)
- [ ] CSP headers actifs en production (vérifier via securityheaders.com)
- [ ] RLS activé sur toutes les tables (vérifier dans dashboard Supabase)
- [ ] `CRON_SECRET` configuré dans Vercel
- [ ] Route `/api/cron/fuel-daily` retourne 401 sans le bon header
- [ ] Honeypot actif sur le formulaire newsletter (tester avec un bot)
- [ ] Contrainte unique votes active (tester via l'API directement)
- [ ] `createServiceClient()` lance une erreur si appelé côté client (test en dev)
