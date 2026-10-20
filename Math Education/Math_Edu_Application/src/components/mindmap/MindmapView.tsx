import { useEffect, useRef } from 'react'
import { Markmap } from 'markmap-view'

import { parseMindmap } from '@/lib/mindmapTree'
import { COULEURS } from '@/lib/couleurs'

// Rendu d'une carte mentale.
//
// Marius ecrit du Markdown hierarchique dans `mindmaps.json`, l'application le
// transforme en carte. C'est le choix pose dans CLAUDE.md : le contenu reste du
// texte relisible en PR, le rendu est homogene et automatique.
//
// L'analyse du Markdown vit dans `lib/mindmapTree.ts`, le rendu est confie a
// markmap-view.

/** Profondeur -> couleur de branche. On reste dans la palette Studio Clair. */
const BRANCH_COLORS = [
  COULEURS.ink,
  COULEURS.accent,
  COULEURS.mastered,
  COULEURS.progress,
  COULEURS.accent700,
]

interface MindmapViewProps {
  markdown: string
  title?: string
  className?: string
  /** Toutes les branches ouvertes (bouton « Tout déplier »), sinon deux niveaux. */
  toutDeplie?: boolean
}

export function MindmapView({ markdown, title, className, toutDeplie = false }: MindmapViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const root = parseMindmap(markdown, title)

    const markmap = Markmap.create(
      svg,
      {
        autoFit: true,
        duration: 260,
        spacingVertical: 10,
        spacingHorizontal: 90,
        paddingX: 14,
        // Deux niveaux ouverts a l'arrivee : la carte doit tenir d'un coup
        // d'oeil, l'eleve deplie ce qui l'interesse.
        initialExpandLevel: toutDeplie ? -1 : 2,
        maxWidth: 320,
        color: (node) =>
          BRANCH_COLORS[(node.state?.depth ?? 0) % BRANCH_COLORS.length],
      },
      root,
    )

    // Recadrage apres la mise en page initiale, sinon la carte deborde.
    const timer = window.setTimeout(() => void markmap.fit(), 60)
    const handleResize = () => void markmap.fit()
    window.addEventListener('resize', handleResize)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
      markmap.destroy()
    }
  }, [markdown, title, toutDeplie])

  return (
    <div className={className}>
      <svg
        ref={svgRef}
        className="markmap-root h-full w-full"
        role="img"
        aria-label={title ? `Carte mentale : ${title}` : 'Carte mentale'}
      />
    </div>
  )
}
