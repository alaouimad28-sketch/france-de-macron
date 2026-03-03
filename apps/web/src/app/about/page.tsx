import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'À propos',
  description:
    "France de Macron : qui sommes-nous ? Un projet open source satirique pour rendre les données économiques accessibles.",
}

export default function AboutPage() {
  return (
    <article className="prose prose-invert max-w-3xl mx-auto px-4 py-16">
      <h1>À propos</h1>

      <p>
        <strong>France de Macron</strong> est un projet satirique et factuel, pas un manifeste
        politique. Son objectif : rendre les données économiques accessibles, lisibles et
        un peu moins déprimantes pour les 15–35 ans.
      </p>

      <h2>Ce qu'on fait</h2>
      <p>
        On agrège des données économiques officielles françaises (carburants, inflation, etc.),
        on les visualise de façon claire, et on calcule le{' '}
        <strong>French Cooked Index™</strong> — un score semi-scientifique qui mesure "à quel
        point on est cooked".
      </p>

      <h2>Ce qu'on ne fait pas</h2>
      <ul>
        <li>Pas de positionnement politique</li>
        <li>Pas de propagande ni de manipulation</li>
        <li>Pas de données non sourcées</li>
      </ul>

      <h2>Sources</h2>
      <p>
        Toutes les données proviennent de sources officielles françaises en open data.
        Voir la page <a href="/methodology">Méthodologie</a> pour le détail.
      </p>

      {/* TODO: ajouter la liste des contributeurs, le dépôt GitHub, la licence */}
    </article>
  )
}
