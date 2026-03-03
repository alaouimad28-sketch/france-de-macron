import type { Metadata, Viewport } from 'next'
import './globals.css'

// TODO: installer les fonts via next/font/google
// import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e1018',
}

export const metadata: Metadata = {
  title: {
    default: 'France de Macron — French Cooked Index™',
    template: '%s | France de Macron',
  },
  description:
    "Dashboard satirique & data-driven. À quel point on est cooked ? Le French Cooked Index™ répond avec des vraies données.",
  keywords: ['france', 'économie', 'carburant', 'inflation', 'gen z', 'cooked', 'données'],
  authors: [{ name: 'France de Macron' }],
  creator: 'France de Macron',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://france-de-macron.fr'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    siteName: 'France de Macron',
    title: 'France de Macron — French Cooked Index™',
    description: "À quel point on est cooked ? Le dashboard économique satirique pour Gen Z.",
    images: [
      {
        url: '/og-image.png', // TODO: générer via @vercel/og
        width: 1200,
        height: 630,
        alt: 'France de Macron — French Cooked Index™',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'France de Macron — French Cooked Index™',
    description: "À quel point on est cooked ? Le dashboard économique satirique pour Gen Z.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <body>
        {/* TODO: ajouter Header + Footer globaux */}
        <main>{children}</main>
      </body>
    </html>
  )
}
