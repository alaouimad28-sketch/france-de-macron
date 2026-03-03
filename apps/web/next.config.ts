import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Strict mode React activé pour détecter les effets de bord
  reactStrictMode: true,

  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // À restreindre en prod
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}`,
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // Rewrites pour les crons Vercel (à activer en prod)
  // async rewrites() { return [] },
}

export default nextConfig
