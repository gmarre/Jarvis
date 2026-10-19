import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field, TextInput } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Misc'
import { estMineur } from '@/lib/age'
import { verifierMotDePasse } from '@/lib/authErreurs'
import { useAuthenticatedSession } from '@/state/session'

// Carte « Connexion » de /profil : adresse email et mot de passe.
//
// Regles (decision de Gauthier, 19 octobre 2026) :
//   - un majeur change son email directement ; Supabase envoie un lien de
//     confirmation a la nouvelle adresse, rien ne change avant le clic ;
//   - un mineur soumet le changement a son parent (Edge Function
//     accord-parental), la base refuse tout autre chemin (migration 0011) ;
//   - le mot de passe exige l'ancien, et le nouveau saisi deux fois.

type Retour = { ton: 'mastered' | 'progress'; texte: string } | null

const EMAIL = /^\S+@\S+\.\S+$/

export function ConnexionCard({ onDemandeEnvoyee }: { onDemandeEnvoyee: () => void }) {
  const { session, isDemo, aUnMotDePasse, changerEmail, demanderModification } =
    useAuthenticatedSession()
  const { profile } = session
  const mineur = profile.role === 'eleve' && estMineur(profile.date_naissance)

  const [motDePasseActif, setMotDePasseActif] = useState<boolean | null>(null)
  useEffect(() => {
    let annule = false
    aUnMotDePasse()
      .then((oui) => !annule && setMotDePasseActif(oui))
      .catch(() => !annule && setMotDePasseActif(false))
    return () => {
      annule = true
    }
  }, [aUnMotDePasse])

  const [email, setEmail] = useState('')
  const [erreurEmail, setErreurEmail] = useState<string | undefined>()
  const [retourEmail, setRetourEmail] = useState<Retour>(null)
  const [pendingEmail, setPendingEmail] = useState(false)

  const soumettreEmail = (event: FormEvent) => {
    event.preventDefault()
    const adresse = email.trim()
    if (!EMAIL.test(adresse)) {
      setErreurEmail('Cette adresse semble incomplète.')
      return
    }
    if (adresse.toLowerCase() === profile.email.toLowerCase()) {
      setErreurEmail("C'est déjà ton adresse.")
      return
    }
    setErreurEmail(undefined)
    setRetourEmail(null)
    setPendingEmail(true)

    const action = mineur
      ? demanderModification('email', adresse).then(({ envoye_a }) => {
          onDemandeEnvoyee()
          return `Demande envoyée à ${envoye_a}. L'adresse changera quand ton parent l'aura acceptée.`
        })
      : changerEmail(adresse).then(() =>
          isDemo
            ? 'Adresse modifiée.'
            : `Un lien de confirmation vient de partir vers ${adresse}. L'adresse changera quand tu auras cliqué dessus.`,
        )

    action
      .then((texte) => {
        setRetourEmail({ ton: 'mastered', texte })
        setEmail('')
      })
      .catch((cause: unknown) =>
        setRetourEmail({
          ton: 'progress',
          texte: cause instanceof Error ? cause.message : 'La demande a échoué.',
        }),
      )
      .finally(() => setPendingEmail(false))
  }

  return (
    <Card>
      <CardTitle>Connexion</CardTitle>

      <form onSubmit={soumettreEmail} noValidate className="flex flex-col gap-3">
        <Field
          label="Nouvelle adresse email"
          htmlFor="c-email"
          hint={
            mineur
              ? `Adresse actuelle : ${profile.email}. Le changement attend l'accord de ton parent.`
              : `Adresse actuelle : ${profile.email}.`
          }
          error={erreurEmail}
        >
          <TextInput
            id="c-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {retourEmail && <Notice tone={retourEmail.ton}>{retourEmail.texte}</Notice>}
        <Button type="submit" variant="secondary" disabled={pendingEmail || !email.trim()}>
          {pendingEmail ? 'Un instant…' : mineur ? 'Demander à mon parent' : "Changer d'adresse"}
        </Button>
      </form>

      {motDePasseActif === true && <MotDePasseForm />}
      {motDePasseActif === false && (
        <p className="mt-5 border-t border-divider pt-4 text-[12px] leading-relaxed text-ink-subtle">
          Tu te connectes avec Google : ton mot de passe se gère dans ton compte Google.
        </p>
      )}
    </Card>
  )
}

function MotDePasseForm() {
  const { changerMotDePasse } = useAuthenticatedSession()
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreurs, setErreurs] = useState<{ ancien?: string; motDePasse?: string; confirmation?: string }>({})
  const [retour, setRetour] = useState<Retour>(null)
  const [pending, setPending] = useState(false)

  const soumettre = (event: FormEvent) => {
    event.preventDefault()
    const suivantes = {
      ...verifierMotDePasse(nouveau, confirmation),
      ...(ancien ? {} : { ancien: 'Indique ton mot de passe actuel.' }),
    }
    setErreurs(suivantes)
    if (Object.keys(suivantes).length > 0) return

    setRetour(null)
    setPending(true)
    changerMotDePasse(ancien, nouveau)
      .then(() => {
        setRetour({ ton: 'mastered', texte: 'Mot de passe modifié.' })
        setAncien('')
        setNouveau('')
        setConfirmation('')
      })
      .catch((cause: unknown) =>
        setRetour({
          ton: 'progress',
          texte: cause instanceof Error ? cause.message : 'La modification a échoué.',
        }),
      )
      .finally(() => setPending(false))
  }

  return (
    <form onSubmit={soumettre} noValidate className="mt-5 flex flex-col gap-3 border-t border-divider pt-4">
      <Field label="Mot de passe actuel" htmlFor="c-ancien" error={erreurs.ancien}>
        <TextInput
          id="c-ancien"
          type="password"
          autoComplete="current-password"
          value={ancien}
          onChange={(e) => setAncien(e.target.value)}
        />
      </Field>
      <Field
        label="Nouveau mot de passe"
        htmlFor="c-nouveau"
        hint="8 caractères minimum."
        error={erreurs.motDePasse}
      >
        <TextInput
          id="c-nouveau"
          type="password"
          autoComplete="new-password"
          value={nouveau}
          onChange={(e) => setNouveau(e.target.value)}
        />
      </Field>
      <Field label="Confirme le nouveau mot de passe" htmlFor="c-confirmation" error={erreurs.confirmation}>
        <TextInput
          id="c-confirmation"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </Field>
      {retour && <Notice tone={retour.ton}>{retour.texte}</Notice>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Un instant…' : 'Changer de mot de passe'}
      </Button>
    </form>
  )
}
