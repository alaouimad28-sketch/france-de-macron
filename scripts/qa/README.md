# QA automation (Phase 7)

Checks CI-friendly pour sécuriser le lancement MVP.

## Commandes

```bash
# 1) Vérifie la couverture reduced-motion
pnpm run qa:reduced-motion

# 2) Smoke checks routes/pages + APIs clés
pnpm run qa:smoke

# 3) Vérifie les headers de sécurité attendus
pnpm run qa:security-headers

# Tout-en-un
pnpm run qa:phase7
```

## Ce qui est couvert

### Smoke

- Routes SSR: `/`, `/about`, `/methodology`
- API votes: `GET /api/votes?scope=global` (contrat de réponse)
- API newsletter: validation `POST /api/newsletter`
  - payload invalide → `400`
  - honeypot rempli → `200 { success: true }`

### Reduced motion

- `globals.css` doit contenir `@media (prefers-reduced-motion: reduce)`
- `globals.css` doit forcer `scroll-behavior: auto`
- `ScrollReveal` doit garder un garde-fou `matchMedia('(prefers-reduced-motion: reduce)')`

### Security headers

Vérifie sur `/` la présence des headers du threat model:

- `content-security-policy`
- `x-frame-options`
- `x-content-type-options`
- `referrer-policy`
- `permissions-policy`

Avec assertions CSP minimales:

- `default-src 'self'`
- `frame-ancestors 'none'`

## Note CI

Les checks `qa:smoke` et `qa:security-headers` démarrent `next start` automatiquement.
Lancer `pnpm run build` avant `pnpm run qa:phase7`.
