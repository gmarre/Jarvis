import { cn } from '@/lib/cn'
import { libelleNiveau, type Niveau } from '@/lib/maitrise'

// Niveau de maitrise sur 5, en cinq ronds (sprint 2, point 2). Le texte
// accessible dit le niveau et son sens : la couleur seule ne suffit pas.

export function NiveauMaitrise({ niveau, className }: { niveau: Niveau; className?: string }) {
  const teinte = niveau >= 4 ? 'bg-mastered' : niveau === 3 ? 'bg-wrong' : 'bg-progress'
  return (
    <span
      role="img"
      aria-label={`Niveau ${niveau} sur 5 : ${libelleNiveau(niveau)}`}
      title={libelleNiveau(niveau)}
      className={cn('inline-flex items-center gap-1', className)}
    >
      {[1, 2, 3, 4, 5].map((rang) => (
        <span
          key={rang}
          aria-hidden
          className={cn('h-2.5 w-2.5 rounded-full', rang <= niveau ? teinte : 'bg-locked-200')}
        />
      ))}
    </span>
  )
}
