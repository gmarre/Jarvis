import { useMemo } from 'react'

import { cn } from '@/lib/cn'

// Figure d'un exercice (demi-droite graduee, regle, horloge, quadrillage...).
//
// Le contenu decrit ses figures en JSON et scripts/figures.py les dessine : le
// champ `image` arrive ici sous forme de SVG complet. On l'affiche comme une
// image (data URI dans <img>) et non en l'injectant dans la page : un SVG ainsi
// charge ne peut executer aucun script, quoi qu'il contienne.

/** Texte alternatif : le <title> que le generateur place dans chaque SVG. */
function titreDe(svg: string): string {
  const titre = svg.match(/<title>([^<]*)<\/title>/)?.[1]
  return (titre ?? 'Figure de l’exercice')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export function ExerciseFigure({ image, className }: { image: string | null; className?: string }) {
  const source = useMemo(() => {
    // Une reference "figures/<nom>" non resolue (contenu mal publie) ne
    // s'affiche pas : mieux vaut pas de figure qu'une image cassee.
    if (!image || !image.trimStart().startsWith('<svg')) return null
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image)}`
  }, [image])

  if (!source || !image) return null

  return (
    <figure className={cn('my-5 flex justify-center', className)}>
      <img
        src={source}
        alt={titreDe(image)}
        className="h-auto max-w-full rounded-card border border-divider bg-white"
        draggable={false}
      />
    </figure>
  )
}
