# SEO & Partage social — France de Macron

---

## 1. Stratégie SEO

### 1.1 Pages indexables (MVP)

| Page         | URL            | Index | Description SEO            |
| ------------ | -------------- | ----- | -------------------------- |
| Landing      | `/`            | ✅    | Dashboard FCI + carburants |
| À propos     | `/about`       | ✅    | Présentation du projet     |
| Méthodologie | `/methodology` | ✅    | Transparence FCI           |
| Disclaimer   | `/disclaimer`  | ✅    | Avertissement légal        |

### 1.2 Metadata (Next.js `generateMetadata`)

Chaque page définit ses propres `title`, `description`, et OG tags via l'export `metadata` de Next.js App Router.

Structure dans `layout.tsx` :

```typescript
export const metadata: Metadata = {
  title: {
    default: 'France de Macron — French Cooked Index™',
    template: '%s | France de Macron',   // "Méthodologie | France de Macron"
  },
  description: '...', // max 155 caractères
  openGraph: { ... },
  twitter: { ... },
}
```

### 1.3 Robots.txt

Toutes les pages publiques sont indexables. Bloquer :

- `/api/*` (endpoints backend, pas de contenu pour les crawlers)
- `/_next/*` (assets Next.js)

Créer `apps/web/public/robots.txt` :

```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://france-de-macron.fr/sitemap.xml
```

### 1.4 Sitemap.xml

Générer via `apps/web/src/app/sitemap.ts` (Next.js App Router) :

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://france-de-macron.fr/', changeFrequency: 'daily', priority: 1 },
    { url: 'https://france-de-macron.fr/about', changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://france-de-macron.fr/methodology', changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://france-de-macron.fr/disclaimer', changeFrequency: 'yearly', priority: 0.3 },
  ]
}
```

### 1.5 Structured Data (JSON-LD)

Ajouter sur la landing page :

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "France de Macron",
  "url": "https://france-de-macron.fr",
  "description": "Dashboard satirique data-driven — French Cooked Index™",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://france-de-macron.fr/?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

---

## 2. OpenGraph & Twitter Cards

### 2.1 OG Image v1 (statique)

**MVP** : Une image OG statique `public/og-image.png` (1200×630px).

Design requis :

- Fond clair / blanc (thème light MVP)
- Logo + titre en gros
- Score FCI du jour (si dynamique) ou valeur fixe "74"
- Tagline : "À quel point on est cooked ?"
- URL du site en bas

Créer avec Figma ou Canva. Format : PNG, max 1 MB.

### 2.2 OG Image v2 (dynamique avec @vercel/og)

**Planifié v1.1** : génération dynamique côté serveur.

```
GET /api/og?score=74&label=On+est+cooked&date=2024-11-15

Retourne : image PNG 1200×630 générée en temps réel
```

Implémentation avec `@vercel/og` (ImageResponse) :

```typescript
// apps/web/src/app/api/og/route.tsx
import { ImageResponse } from 'next/og'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const score = searchParams.get('score') ?? '—'
  const label = searchParams.get('label') ?? 'Données en cours de chargement'

  return new ImageResponse(
    <div style={{ display: 'flex', background: '#0E1018', width: '1200px', height: '630px' }}>
      <div style={{ color: '#CED3E3', fontSize: '72px', fontWeight: 'bold' }}>
        FCI : {score}/100
      </div>
      <div style={{ color: '#6B7594', fontSize: '32px' }}>{label}</div>
    </div>,
    { width: 1200, height: 630 }
  )
}
```

Utiliser dans `generateMetadata` de la landing :

```typescript
openGraph: {
  images: [`/api/og?score=${fciScore}&label=${encodeURIComponent(fciLabel)}`]
}
```

### 2.3 OG par section (v2)

Chaque indicateur aurait sa propre OG image :

- `/api/og/fuel?price=1.879&trend=up`
- `/api/og/fci?score=74`

---

## 3. Stratégie de partage viral

### 3.1 Screenshots "viral-ready"

Chaque module est conçu pour être screenshot-able :

- Dimensions adaptées aux stories (ratio 9:16 ou 4:5)
- Contraste fort, lisible en petite taille
- Inclure le nom du site dans le module (watermark discret)

### 3.2 Bouton "Partager" (v1.2)

Bouton de partage sous chaque module :

```typescript
// Utilise Web Share API (mobile) avec fallback Twitter/X
async function shareModule(title: string, text: string, url: string) {
  if (navigator.share) {
    await navigator.share({ title, text, url })
  } else {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, '_blank')
  }
}
```

Texte de partage suggéré :

```
"FCI aujourd'hui : 74/100 — On est cooked.
Prix carburant en hausse de 3,2% en 30 jours.
france-de-macron.fr"
```

### 3.3 Vote "cooked" comme mème

Le ratio cooked/uncooked est partageable comme "poll" :

- `"74% des visiteurs pensent qu'on est cooked. Et toi ?"`
- URL avec pre-rempli → CTA vote

---

## 4. Performance et Core Web Vitals

### 4.1 Objectifs (Google PageSpeed)

| Métrique                       | Objectif | Actuel (à mesurer) |
| ------------------------------ | -------- | ------------------ |
| LCP (Largest Contentful Paint) | < 2.5s   | —                  |
| CLS (Cumulative Layout Shift)  | < 0.1    | —                  |
| FID / INP                      | < 100ms  | —                  |
| Lighthouse Score               | > 90     | —                  |

### 4.2 Mesures techniques

- **SSR** : toutes les données pré-rendues côté serveur (pas de waterfall client)
- **Fonts** : `next/font/google` avec `display: 'swap'` (pas de FOUT)
- **Images** : `next/image` avec dimensions explicites (pas de CLS)
- **Critical CSS** : Tailwind purge en production
- **Bundle** : code splitting automatique Next.js, pas de import masssifs côté client

---

## 5. Internationalisation (i18n) — Architecture préparée

### 5.1 Structure des dossiers (préparée, pas active)

```
apps/web/src/
├── messages/
│   ├── fr.json          # Français (défaut)
│   └── en.json          # Anglais (auto-généré en v2)
└── i18n/
    ├── config.ts         # Locales supportées
    └── request.ts        # next-intl configuration
```

### 5.2 Bibliothèque prévue

[next-intl](https://next-intl-docs.vercel.app/) — compatible App Router, SSR, Server Components.

### 5.3 Processus de traduction

v1 : FR uniquement.
v2 : EN auto-généré via DeepL API + révision manuelle pour le microcopy ironique.

### 5.4 URLs localisées

```
/         → FR (par défaut)
/en        → EN (v2)
/en/about  → EN About
```

Pas de sous-domaine (fr.france-de-macron.fr) pour simplifier le DNS et le déploiement.
