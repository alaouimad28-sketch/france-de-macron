import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'Avertissement légal et satirique — France de Macron.',
}

export default function DisclaimerPage() {
  return (
    <article className="prose prose-invert mx-auto max-w-3xl px-4 py-16">
      <h1>Disclaimer</h1>

      <p>
        <strong>France de Macron</strong> est un projet satirique à but informatif. Il n'est affilié
        à aucun parti politique, institution gouvernementale, ni à aucune figure publique
        mentionnée.
      </p>

      <h2>Nature du contenu</h2>
      <ul>
        <li>
          Les données présentées proviennent de sources officielles françaises en open data. Nous
          nous efforçons de les représenter fidèlement, mais elles peuvent comporter des erreurs ou
          des délais de mise à jour.
        </li>
        <li>
          Le <strong>French Cooked Index™</strong> est un indicateur composite maison,
          semi-scientifique, non officiel. Il ne doit pas être utilisé comme base pour des décisions
          financières ou politiques.
        </li>
        <li>
          Le ton ironique et les expressions argotiques ("cooked", etc.) sont des choix éditoriaux
          destinés à rendre les données accessibles. Ils ne constituent pas des jugements de valeur
          politiques.
        </li>
      </ul>

      <h2>Données personnelles</h2>
      <p>
        En vous inscrivant à la newsletter, vous acceptez que votre adresse email soit stockée afin
        de vous envoyer des mises à jour. Aucune donnée n'est revendue à des tiers. Vous pouvez vous
        désinscrire à tout moment.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Ce site est fourni "tel quel", sans garantie d'exactitude ou d'exhaustivité. Les auteurs ne
        sauraient être tenus responsables d'une décision prise sur la base des informations
        présentées ici.
      </p>

      <p className="text-muted-foreground text-sm">Dernière mise à jour : Mars 2025.</p>
    </article>
  )
}
