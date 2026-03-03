// Home page — Server Component (SSR)
// Fetche les agrégats FCI + carburants depuis Supabase côté serveur
// Le client reçoit les données pré-rendues (pas de waterfall)
//
// TODO (implémentation) :
//   1. Importer createServerClient depuis @/lib/supabase/server
//   2. Fetcher fci_daily (latest) + fuel_daily_agg (last 30d) + events
//   3. Passer les données aux composants client FCIHero + FuelChart

export default async function HomePage() {
  // Placeholder — à remplacer par le vrai fetch Supabase
  return (
    <div className="min-h-screen">
      {/* Section hero FCI */}
      <section id="hero" aria-label="French Cooked Index">
        {/* TODO: <FCIHero score={fciData} /> */}
        <p className="text-center text-muted-foreground py-20">
          [FCI Hero — à implémenter]
        </p>
      </section>

      {/* Section carburants */}
      <section id="carburants" aria-label="Prix des carburants">
        {/* TODO: <FuelSection data={fuelData} events={events} /> */}
        <p className="text-center text-muted-foreground py-20">
          [Module carburants J-30 — à implémenter]
        </p>
      </section>

      {/* Section vote */}
      <section id="vote" aria-label="Vote cooked / uncooked">
        {/* TODO: <CookedVote scope="global" /> */}
        <p className="text-center text-muted-foreground py-20">
          [Module vote — à implémenter]
        </p>
      </section>

      {/* Section newsletter */}
      <section id="newsletter" aria-label="Newsletter">
        {/* TODO: <NewsletterCapture /> */}
        <p className="text-center text-muted-foreground py-20">
          [CTA newsletter — à implémenter]
        </p>
      </section>
    </div>
  )
}
