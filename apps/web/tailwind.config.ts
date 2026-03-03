import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'
import animate from 'tailwindcss-animate'
import typography from '@tailwindcss/typography'

// Cooked Authority Design System — palette basée sur le drapeau FR distordu
// Voir docs/design/design-system.md pour la justification complète
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Palette primaire "Cooked Authority" ---
        // Bleu republicain (légèrement désaturé, sérieux mais pas institutionnel)
        republic: {
          50: '#f0f4ff',
          100: '#dce8ff',
          200: '#b9d1ff',
          300: '#87b0ff',
          400: '#4d85ff',
          500: '#2355ee', // Primaire
          600: '#1840d9',
          700: '#1530b0',
          800: '#162a8f',
          900: '#172772',
        },
        // Rouge alerte (carburant en hausse, danger)
        alert: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e', // Primaire
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        // Vert soulagement ("on respire")
        relief: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Primaire
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Ambre (avertissement, variation modérée)
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Primaire
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Surfaces neutres (fond dashboard)
        surface: {
          50: '#f8f9fc',
          100: '#f1f3f9',
          200: '#e4e7f0',
          300: '#ced3e3',
          400: '#9da5c0',
          500: '#6b7594',
          600: '#505b7a',
          700: '#3e4861',
          800: '#2d3349', // Fond carte
          900: '#1a1e2e', // Fond principal dark
          950: '#0e1018', // Fond très sombre
        },
        // Aliases sémantiques (utilisés dans les composants)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        // Headlines — gras, impactant, meme-friendly
        display: ['var(--font-display)', ...fontFamily.sans],
        // Corps de texte — lisible, analytique
        body: ['var(--font-body)', ...fontFamily.sans],
        // Données / chiffres — monospace clair
        mono: ['var(--font-mono)', ...fontFamily.mono],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        // Micro-animation jauge FCI
        'gauge-fill': {
          from: { 'stroke-dashoffset': '251.2' },
          to: { 'stroke-dashoffset': 'var(--gauge-offset)' },
        },
        // Shimmer pour les skeletons de chargement
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Pulse léger pour les annotations d'événements
        'event-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        // Fondu d'apparition
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'gauge-fill': 'gauge-fill 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        shimmer: 'shimmer 2s linear infinite',
        'event-pulse': 'event-pulse 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out forwards',
      },
      backgroundImage: {
        // Grain subtil (bruit SVG encodé en base64)
        grain:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [animate, typography],
}

export default config
