import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://france-de-macron.fr'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/about', '/methodology', '/disclaimer']
  const now = new Date()

  return routes.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))
}
