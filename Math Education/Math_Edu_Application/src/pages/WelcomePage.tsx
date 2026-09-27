import { useMemo, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { isProfileComplete } from '@/data'
import { ageFrom, needsParentalConsent as consentementRequis } from '@/lib/age'
import { Wordmark } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Segmented, Select, TextInput } from '@/components/ui/Field'
import { Card } from '@/components/ui/Card'
import { LoadingScreen, Notice } from '@/components/ui/Misc'
import { useSession } from '@/state/session'
import { SCHOOL_LEVELS, type SchoolLevel } from '@/types/content'
import type { Profile, UserRole } from '@/types/domain'

// Ecran de complementation de profil, apres une premiere connexion Google.
//
// Pourquoi il existe : Google ne fournit que l'identite (email, prenom). Ni le
// niveau scolaire, ni la date de naissance, ni l'email d'un parent. Sans cet
// ecran, impossible de construire un parcours, et surtout impossible d'appliquer
// la regle des 15 ans a un compte cree par OAuth. Ce n'est donc pas un ecran de
// confort, c'est la condition pour que la connexion Google soit legale.
//
// La regle d'age est partagee avec l'inscription classique via lib/age.ts : deux
// copies finiraient par diverger.

export default function WelcomePage() {
  const { status, session } = useSession()

  if (status === 'loading') return <LoadingScreen label="Ouverture de ton espace…" />
  if (status === 'anonymous' || !session) return <Navigate to="/connexion" replace />
  // Deja complet : cet ecran n'a plus rien a demander.
  if (isProfileComplete(session.profile)) return <Navigate to="/" replace />

  return <WelcomeForm profile={session.profile} />
}

/**
 * Le formulaire proprement dit. Separe pour que le profil soit garanti present :
 * les valeurs initiales viennent alors directement de Google, sans avoir a
 * corriger l'etat apres coup.
 */
function WelcomeForm({ profile }: { profile: Profile }) {
  const { completeProfile } = useSession()

  const [role, setRole] = useState<UserRole>('eleve')
  const [prenom, setPrenom] = useState(profile.prenom)
  // Le nom de famille n'est pas demande ici : Google le fournit quand il le
  // connait, et il n'est pas necessaire au parcours. Minimisation des donnees.
  const [nom] = useState(profile.nom)
  const [niveau, setNiveau] = useState<SchoolLevel | ''>('')
  const [naissance, setNaissance] = useState('')
  const [emailParent, setEmailParent] = useState('')
  const [consentement, setConsentement] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const levelOptions = useMemo(
    () => SCHOOL_LEVELS.map((level) => ({ value: level, label: level })),
    [],
  )

  const isStudent = role === 'eleve'
  const age = ageFrom(naissance)
  const needsConsent = consentementRequis(role, naissance)

  const validate = (): boolean => {
    const next: Record<string, string> = {}

    if (!prenom.trim()) next.prenom = 'Indique ton prénom.'
    if (isStudent && !niveau) next.niveau = 'Choisis ton niveau scolaire.'
    if (isStudent && !naissance) next.naissance = 'Indique ta date de naissance.'
    else if (isStudent && age === null) next.naissance = 'Cette date ne semble pas valide.'

    if (needsConsent) {
      if (!emailParent.trim()) next.emailParent = "Email d'un parent obligatoire avant 15 ans."
      else if (!/^\S+@\S+\.\S+$/.test(emailParent.trim()))
        next.emailParent = 'Cette adresse semble incomplète.'
      if (!consentement) next.consentement = "L'accord du parent est obligatoire."
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setServerError(null)
    setPending(true)
    void completeProfile({
      role,
      prenom,
      nom: nom || prenom,
      niveau_scolaire: niveau || null,
      date_naissance: naissance || null,
      email_parent: needsConsent ? emailParent : null,
    })
      .catch((cause: unknown) => {
        setServerError(
          cause instanceof Error ? cause.message : "L'enregistrement a échoué.",
        )
      })
      .finally(() => setPending(false))
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-5 py-10 sm:px-8">
      <div className="w-full max-w-[460px]">
        <Wordmark className="mb-6 text-base" />

        <h1 className="font-display text-[26px] font-medium leading-tight tracking-[-0.015em] text-ink sm:text-[30px]">
          Encore deux questions
        </h1>
        <p className="mb-6 mt-2 text-[13.5px] leading-relaxed text-ink-subtle">
          Connecté avec {profile.email}. Il nous manque juste de quoi construire ton parcours.
        </p>

        {serverError && (
          <Notice tone="progress" icon="!" className="mb-4">
            {serverError}
          </Notice>
        )}

        <Card>
          <form onSubmit={handleSubmit} noValidate>
            <p className="mb-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-ink-faint">
              Je suis
            </p>
            <Segmented<UserRole>
              ariaLabel="Je suis"
              value={role}
              onChange={setRole}
              className="mb-5"
              options={[
                { value: 'eleve', label: 'Élève' },
                { value: 'prof', label: 'Professeur' },
                { value: 'parent', label: 'Parent' },
              ]}
            />

            <div className="grid gap-3">
              <Field label="Prénom" htmlFor="w-prenom" error={errors.prenom}>
                <TextInput
                  id="w-prenom"
                  autoComplete="given-name"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                />
              </Field>

              {isStudent && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Niveau scolaire" htmlFor="w-niveau" error={errors.niveau}>
                    <Select
                      id="w-niveau"
                      value={niveau}
                      onChange={(e) => setNiveau(e.target.value as SchoolLevel)}
                    >
                      <option value="">Choisir…</option>
                      {levelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Date de naissance"
                    htmlFor="w-naissance"
                    error={errors.naissance}
                  >
                    <TextInput
                      id="w-naissance"
                      type="date"
                      autoComplete="bday"
                      value={naissance}
                      onChange={(e) => setNaissance(e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </div>

            {needsConsent && (
              <div className="mt-4 rounded-card border border-accent-100 bg-accent-50 p-4">
                <p className="mb-2.5 text-[12.5px] font-semibold leading-none text-accent-700">
                  {age === null
                    ? "Moins de 15 ans — accord d'un parent requis"
                    : `${age} ans — accord d'un parent requis`}
                </p>
                <Field label="Email du parent" htmlFor="w-parent" error={errors.emailParent}>
                  <TextInput
                    id="w-parent"
                    type="email"
                    placeholder="parent@email.fr"
                    value={emailParent}
                    onChange={(e) => setEmailParent(e.target.value)}
                  />
                </Field>
                <Checkbox
                  className="mt-3"
                  checked={consentement}
                  onChange={setConsentement}
                >
                  Mon parent autorise la création de ce compte et le traitement de mes données
                  scolaires. Il recevra un email de confirmation.
                </Checkbox>
                {errors.consentement && (
                  <p role="alert" className="mt-2 text-[11.5px] font-medium text-wrong-600">
                    {errors.consentement}
                  </p>
                )}
              </div>
            )}

            <Button type="submit" size="lg" fullWidth className="mt-5" disabled={pending}>
              {pending ? 'Un instant…' : 'Continuer'}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-faint">
          Données hébergées dans l'Union européenne. Un parent peut retirer son accord et
          supprimer le compte à tout moment.
        </p>
      </div>
    </div>
  )
}
