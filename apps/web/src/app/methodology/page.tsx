import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Méthodologie',
  description:
    "Comment on calcule le French Cooked Index™ ? Méthodologie transparente, sources, limites et formules.",
}

export default function MethodologyPage() {
  return (
    <article className="prose prose-invert max-w-3xl mx-auto px-4 py-16">
      <h1>Méthodologie</h1>

      <p>
        Cette page explique comment le <strong>French Cooked Index™ (FCI)</strong> est calculé,
        quelles données sont utilisées et quelles sont ses limites.
      </p>

      <h2>French Cooked Index™ v1</h2>

      <h3>Principe général</h3>
      <p>
        Le FCI est un score composite de 0 à 100 qui agrège plusieurs indicateurs économiques.
        Plus le score est élevé, plus "on est cooked". La formule est transparente et documentée.
      </p>

      <h3>Composantes MVP (v1)</h3>
      <p>En v1, le FCI est calculé uniquement sur les données carburants :</p>
      <ul>
        <li>
          <strong>Stress carburant (100% du poids en v1)</strong> : combinaison du niveau absolu
          du prix moyen Gazole + SP95-E10 et de leur variation sur 30 jours, normalisés sur une
          baseline 2010–2019.
        </li>
      </ul>

      <h3>Formule (conceptuelle)</h3>
      <pre>
        <code>{`FCI_day = Σ (composante_i × poids_i)
où :
  - composante_i ∈ [0, 100]
  - Σ poids_i = 1

Composante carburant (v1) :
  fuel_stress = 0.6 × niveau_normalisé + 0.4 × variation_30j_normalisée`}</code>
      </pre>

      <h3>Limites et transparence</h3>
      <ul>
        <li>Le FCI v1 est très simplifié (un seul indicateur).</li>
        <li>La pondération est arbitraire et sera améliorée en v2 avec consultation publique.</li>
        <li>Le score peut varier selon la qualité des données sources.</li>
        <li>Ce n'est pas un indicateur économique officiel.</li>
      </ul>

      <h2>Données carburants</h2>
      <p>
        Source : <strong>Prix des carburants — données officielles</strong> (roulez-eco.fr,
        data.gouv.fr). Licence Ouverte / Open Licence. Voir{' '}
        <a href="/docs/data/sources" target="_blank" rel="noopener noreferrer">
          docs/data/sources.md
        </a>{' '}
        pour le détail.
      </p>

      {/* TODO: ajouter graphique de pondération, historique des versions FCI */}
    </article>
  )
}
