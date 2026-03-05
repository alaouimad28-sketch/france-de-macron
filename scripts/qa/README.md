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

# 4) Vérifie l'intuition historique FCI (2020 bas, 2022 pic)
pnpm run qa:fci-intuition

# 5) Vérifie la cohérence d'unité des tarifs électricité (ct€/kWh)
pnpm run qa:electricity-unit

# 6) Vérifie l'intégrité des datasets autonomous (IPC + chômage jeunes)
pnpm run qa:autonomous-datasets

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

### FCI intuition

- Benchmark synthétique local (sans DB):
  - scénario « COVID bas » attendu `<= 30`
  - scénario « pic 2022 » attendu `>= 80`
- Validation live optionnelle (si env Supabase service role fournis):
  - fenêtre 2020-03 → 2020-06 : minimum attendu `<= 35`
  - fenêtre 2022-03 → 2022-10 : maximum attendu `>= 80`

### Électricité — cohérence unité

- Benchmark synthétique local sur conversions `€/kWh -> ct€/kWh`.
- Validation live optionnelle (si env Supabase service role fournis):
  - dataset `electricity_tariff_history` Option Base 6 kVA;
  - assertion stricte `value_eur_kwh × 100 = value_ct_kwh` (tolérance flottante minime);
  - bornes sanity `5 <= value_ct_kwh <= 100`.

### Autonomous datasets

Validation live optionnelle (si env Supabase service role fournis):

- `ipc_food_monthly` : volume minimal (`>= 12`), format des mois (`YYYY-MM-DD`), valeurs numériques valides.
- `youth_unemployment_monthly` : volume minimal (`>= 24`), format des mois (`YYYY-MM-DD`), valeurs numériques valides.

## Note CI

Les checks `qa:smoke` et `qa:security-headers` démarrent `next start` automatiquement.
Lancer `pnpm run build` avant `pnpm run qa:phase7`.
