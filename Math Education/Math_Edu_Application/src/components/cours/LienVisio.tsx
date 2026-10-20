import { useEffect, useState } from 'react'

import { repository } from '@/data'
import { IconVideo } from '@/components/ui/icons'

// Lien de la visio d'une seance (Jitsi, migration 0018), lu par un inscrit ou
// le professeur. Rien ne s'affiche tant que le lien n'est pas lu : pas de
// bouton inerte (regle 1).

export function LienVisio({ slotId }: { slotId: string }) {
  const [lien, setLien] = useState<string | null>(null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    let annule = false
    repository
      .getLienVisio(slotId)
      .then((l) => !annule && setLien(l))
      .catch(() => !annule && setErreur(true))
    return () => {
      annule = true
    }
  }, [slotId])

  if (erreur) return <p className="text-center text-[12px] text-ink-faint">Le lien de la visio n'a pas pu être lu.</p>
  if (!lien) return null
  return (
    <a
      href={lien}
      target="_blank"
      rel="noreferrer noopener"
      className="mb-2 flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-accent text-[13.5px] font-semibold text-white hover:bg-accent-600"
    >
      <IconVideo size={16} />
      Rejoindre la visio
    </a>
  )
}
