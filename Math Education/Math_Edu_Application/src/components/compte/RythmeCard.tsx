import { useEffect, useState } from 'react'

import { repository, RepositoryError } from '@/data'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field, TextInput } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Misc'
import { ageFrom } from '@/lib/age'
import { cn } from '@/lib/cn'
import { useAuthenticatedSession } from '@/state/session'
import type { Rappel } from '@/types/domain'

// Carte « Mon rythme » de /profil (sprint 2, point 8 ; migration 0017).
//
// L'eleve choisit combien de seances par semaine il vise (2 a 5, 3 par
// defaut) et ses jours ; /travail affiche « 2 séances sur 3 cette semaine ».
// Le rappel par email ne part que ces jours-la, si rien n'est fait, a l'heure
// choisie : vers l'eleve a 15 ans et plus, vers le parent avant, et seulement
// une fois que le parent l'a accepte par le lien recu (fonction rappel-revision).
// Etude : Management de Projet/Etude_engagement.md, points 2 et 5.

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const RYTHMES = [2, 3, 4, 5]

export function RythmeCard() {
  const { session, isDemo, updateProfile } = useAuthenticatedSession()
  const { profile } = session
  const age = profile.date_naissance ? ageFrom(profile.date_naissance) : null
  const pourParent = age !== null && age < 15

  const [rappel, setRappel] = useState<Rappel | null>(null)
  const [heure, setHeure] = useState('17:00')
  const [enCours, setEnCours] = useState(false)
  const [retour, setRetour] = useState<{ ton: 'mastered' | 'progress'; texte: string } | null>(null)

  useEffect(() => {
    let annule = false
    repository
      .getRappel()
      .then((r) => {
        if (annule) return
        setRappel(r)
        if (r) setHeure(r.heure)
      })
      .catch(() => {
        if (!annule) setRetour({ ton: 'progress', texte: 'L’état de ton rappel n’a pas pu être lu.' })
      })
    return () => {
      annule = true
    }
  }, [])

  const basculerJour = (jour: number) => {
    const choisis = profile.jours_travail.includes(jour)
      ? profile.jours_travail.filter((j) => j !== jour)
      : [...profile.jours_travail, jour].sort((a, b) => a - b)
    // Au plus 5 jours (contrainte de la base) ; le rythme suit les jours
    // quand l'eleve en choisit plus qu'il n'en visait.
    if (choisis.length > 5) return
    updateProfile({
      jours_travail: choisis,
      ...(choisis.length > profile.rythme_jours ? { rythme_jours: Math.max(2, choisis.length) } : {}),
    })
  }

  async function agir(action: () => Promise<Rappel | null>, succes: (r: Rappel | null) => string) {
    setEnCours(true)
    setRetour(null)
    try {
      const r = await action()
      setRappel(r)
      setRetour({ ton: 'mastered', texte: succes(r) })
    } catch (cause) {
      setRetour({
        ton: 'progress',
        texte: cause instanceof RepositoryError ? cause.message : 'Le serveur n’a pas répondu. Réessaie.',
      })
    } finally {
      setEnCours(false)
    }
  }

  const actif = rappel?.etat === 'actif'
  const enAttente = rappel?.etat === 'en_attente'

  return (
    <Card>
      <CardTitle>Mon rythme</CardTitle>

      <p className="mb-2 text-[12.5px] font-semibold text-ink-soft">Séances visées par semaine</p>
      <div className="mb-4 flex gap-2" role="radiogroup" aria-label="Séances visées par semaine">
        {RYTHMES.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={profile.rythme_jours === n}
            onClick={() => updateProfile({ rythme_jours: n })}
            className={cn(
              'h-11 min-w-[44px] rounded-xl border px-3 text-[13px] font-semibold',
              profile.rythme_jours === n ? 'border-accent bg-accent-50 text-accent-700' : 'border-line text-ink-soft',
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[12.5px] font-semibold text-ink-soft">Mes jours de travail</p>
      <div className="mb-1 flex flex-wrap gap-2">
        {JOURS.map((nom, i) => {
          const jour = i + 1
          const choisi = profile.jours_travail.includes(jour)
          return (
            <button
              key={nom}
              type="button"
              aria-pressed={choisi}
              onClick={() => basculerJour(jour)}
              className={cn(
                'h-11 min-w-[44px] rounded-xl border px-2.5 text-[12.5px] font-semibold',
                choisi ? 'border-accent bg-accent-50 text-accent-700' : 'border-line text-ink-soft',
              )}
            >
              {nom}
            </button>
          )
        })}
      </div>
      <p className="mb-5 text-[11.5px] leading-relaxed text-ink-faint">
        Change-les quand tu veux : rien ne se perd si tu sautes un jour.
      </p>

      <div className="border-t border-divider pt-4">
        <p className="mb-1 text-[12.5px] font-semibold text-ink-soft">Rappel par email</p>
        <p className="mb-3 text-[11.5px] leading-relaxed text-ink-subtle">
          {pourParent
            ? 'Un petit email à ton parent, tes jours de travail, si tu n’as encore rien fait. Il partira seulement si ton parent l’accepte.'
            : 'Un petit email tes jours de travail, si tu n’as encore rien fait : au plus un par jour et trois par semaine.'}
        </p>

        {isDemo && (
          <Notice tone="accent" className="mb-3">
            Mode démonstration : aucun email ne part.
          </Notice>
        )}

        {actif && (
          <p className="mb-3 text-[12.5px] font-medium text-mastered-700">
            Activé, vers {rappel?.destinataire}, à {rappel?.heure}.
            {rappel?.pause_jusqu_au && ` En pause jusqu’au ${rappel.pause_jusqu_au.split('-').reverse().join('/')}.`}
          </p>
        )}
        {enAttente && (
          <p className="mb-3 text-[12.5px] font-medium text-progress-700">
            Demande envoyée à {rappel?.destinataire} : le rappel partira quand ton parent l’aura acceptée.
          </p>
        )}
        {rappel?.etat === 'arrete' && rappel.motif_arret === 'sans_effet' && (
          <p className="mb-3 text-[12.5px] text-ink-subtle">
            Les rappels se sont arrêtés d’eux-mêmes après deux rappels sans séance. Tu peux les relancer.
          </p>
        )}

        {!actif && (
          <Field label="Heure du rappel" htmlFor="heure-rappel" hint="Entre 7 h 30 et 19 h.">
            <TextInput
              id="heure-rappel"
              type="time"
              min="07:30"
              max="19:00"
              value={heure}
              onChange={(event) => setHeure(event.target.value)}
            />
          </Field>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {!actif && (
            <Button
              size="sm"
              disabled={enCours || profile.jours_travail.length === 0}
              onClick={() =>
                void agir(
                  () => repository.activerRappel(heure),
                  (r) =>
                    r?.etat === 'en_attente'
                      ? `Demande envoyée à ${r.destinataire}.`
                      : 'Rappel activé.',
                )
              }
            >
              {pourParent ? (enAttente ? 'Renvoyer la demande' : 'Demander à mon parent') : 'Activer le rappel'}
            </Button>
          )}
          {actif && (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={enCours}
                onClick={() => {
                  const fin = new Date()
                  fin.setDate(fin.getDate() + 14)
                  const jusqu = rappel?.pause_jusqu_au ? null : fin.toISOString().slice(0, 10)
                  void agir(
                    () => repository.reglerRappel({ pause_jusqu_au: jusqu }),
                    () => (jusqu ? 'Rappels en pause pour deux semaines.' : 'Rappels repris.'),
                  )
                }}
              >
                {rappel?.pause_jusqu_au ? 'Reprendre' : 'Pause de 2 semaines'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={enCours}
                onClick={() => void agir(() => repository.desactiverRappel(), () => 'Rappels arrêtés.')}
              >
                Arrêter les rappels
              </Button>
            </>
          )}
        </div>
        {profile.jours_travail.length === 0 && !actif && (
          <p className="mt-2 text-[11.5px] text-ink-faint">Choisis d’abord tes jours de travail.</p>
        )}
        {retour && (
          <Notice tone={retour.ton} className="mt-3">
            {retour.texte}
          </Notice>
        )}
      </div>
    </Card>
  )
}
