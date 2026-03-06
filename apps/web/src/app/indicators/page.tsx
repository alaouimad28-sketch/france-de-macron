import Link from 'next/link'
import { createReadClient } from '@/lib/supabase/server'
import { formatFuelPrice, getFCILabel } from '@/lib/utils'

interface IndicatorCard {
  id: string
  title: string
  summary: string
  value: string
  details: string
  href: string
}

export default async function IndicatorsPage() {
  const supabase = await createReadClient()

  const [fciResult, fuelResult, foodResult, youthResult, electricityResult, rentResult] =
    await Promise.all([
    supabase.from('fci_daily').select('day, score').order('day', { ascending: false }).limit(1),
    supabase
      .from('fuel_daily_agg')
      .select('day, avg_price_eur_per_l')
      .eq('fuel_code', 'gazole')
      .order('day', { ascending: false })
      .limit(1),
    supabase
      .from('ipc_food_monthly')
      .select('month, index_value')
      .order('month', { ascending: false })
      .limit(1),
    supabase
      .from('youth_unemployment_monthly')
      .select('month, unemployment_rate')
      .eq('geo', 'FR')
      .order('month', { ascending: false })
      .limit(1),
    supabase
      .from('electricity_tariff_history')
      .select('effective_date, value_ct_kwh')
      .eq('option_code', 'BASE')
      .eq('subscribed_power_kva', 6)
      .eq('tariff_component', 'BASE')
      .order('effective_date', { ascending: false })
      .limit(1),
    supabase
      .from('rent_monthly')
      .select('month, city, city_label, avg_rent_m2')
      .eq('city', 'paris')
      .order('month', { ascending: false })
      .limit(1),
  ])

  const fci = (fciResult.data?.[0] as { day: string; score: number } | undefined) ?? null
  const fuel =
    (fuelResult.data?.[0] as { day: string; avg_price_eur_per_l: number } | undefined) ?? null
  const food = (foodResult.data?.[0] as { month: string; index_value: number } | undefined) ?? null
  const youth =
    (youthResult.data?.[0] as { month: string; unemployment_rate: number } | undefined) ?? null
  const electricity =
    (electricityResult.data?.[0] as { effective_date: string; value_ct_kwh: number } | undefined) ??
    null
  const rent =
    (rentResult.data?.[0] as
      | { month: string; city: string; city_label: string; avg_rent_m2: number }
      | undefined) ?? null

  const cards: IndicatorCard[] = [
    {
      id: 'fci',
      title: 'French Cooked Index™',
      summary: 'Score agrégé du niveau de pression économique perçue.',
      value: fci ? `${fci.score.toFixed(0)} / 100` : 'Donnée indisponible',
      details: fci ? getFCILabel(fci.score).label : 'Score en attente',
      href: '/#fci',
    },
    {
      id: 'fuel',
      title: 'Prix carburants',
      summary: 'Point de suivi quotidien des prix à la pompe.',
      value: fuel ? `Gazole ${formatFuelPrice(fuel.avg_price_eur_per_l)}` : 'Donnée indisponible',
      details: fuel ? `Dernière date : ${fuel.day}` : 'Historique non disponible',
      href: '/#carburants',
    },
    {
      id: 'food',
      title: 'IPC alimentaire',
      summary: 'Indice mensuel des prix alimentaires (INSEE).',
      value: food ? `Indice ${food.index_value.toFixed(1)}` : 'Donnée indisponible',
      details: food ? `Dernier mois : ${food.month}` : 'Historique non disponible',
      href: '/#alimentation',
    },
    {
      id: 'youth',
      title: 'Chômage jeunes 15–24',
      summary: 'Taux mensuel France (source Eurostat).',
      value: youth ? `${youth.unemployment_rate.toFixed(1)}%` : 'Donnée indisponible',
      details: youth ? `Dernier mois : ${youth.month}` : 'Historique non disponible',
      href: '/#jeunesse',
    },
    {
      id: 'electricity',
      title: 'Électricité TRVE',
      summary: 'Historique tarifaire Option Base 6 kVA.',
      value: electricity ? `${electricity.value_ct_kwh.toFixed(3)} ct€/kWh` : 'Donnée indisponible',
      details: electricity
        ? `Date d'effet : ${electricity.effective_date}`
        : 'Historique non disponible',
      href: '/#electricite',
    },
    {
      id: 'rent',
      title: 'Loyers — 5 villes',
      summary: 'Loyer moyen au m² pour Paris, Lyon, Marseille, Lille, Toulouse.',
      value: rent
        ? `Paris ${rent.avg_rent_m2.toFixed(2).replace('.', ',')} €/m²`
        : 'Donnée indisponible',
      details: rent ? `Données : ${rent.month}` : 'Historique non disponible',
      href: '/#loyers',
    },
  ]

  return (
    <main className="px-4 pb-16 pt-28 md:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 md:mb-10">
          <p className="text-surface-600 mb-2 font-mono text-xs uppercase tracking-widest">
            Hub indicateurs
          </p>
          <h1 className="font-display text-surface-900 text-4xl font-bold tracking-tight md:text-5xl">
            Tous les indicateurs, au même endroit
          </h1>
          <p className="text-surface-600 mt-3 max-w-2xl text-sm md:text-base">
            Cette page regroupe les modules live du projet : FCI, carburants, IPC alimentaire,
            chômage jeunes, électricité TRVE et loyers. Chaque carte te renvoie vers la section
            détaillée de la home.
          </p>
        </header>

        <section aria-label="Liste des indicateurs" className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <article
              key={card.id}
              className="border-surface-200 rounded-xl border bg-white p-5 shadow-sm"
            >
              <h2 className="font-display text-surface-900 text-2xl font-semibold">{card.title}</h2>
              <p className="text-surface-600 mt-2 text-sm">{card.summary}</p>
              <p className="text-surface-900 mt-4 font-mono text-xl font-semibold">{card.value}</p>
              <p className="text-surface-600 mt-1 text-xs">{card.details}</p>
              <Link
                href={card.href}
                className="text-republic-600 hover:text-republic-500 mt-4 inline-flex text-sm font-medium underline underline-offset-4"
              >
                Voir le module détaillé
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
