import { useMemo, useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Segmented, Select, TextInput } from '@/components/ui/Field'
import { LoadingScreen } from '@/components/ui/Misc'
import { Wordmark } from '@/components/layout/AppShell'
import { useSession } from '@/state/session'
import { SCHOOL_LEVELS, type SchoolLevel } from '@/types/content'
import type { UserRole } from '@/types/domain'

// Ecran 1 des maquettes (1b desktop, 1c mobile).
//
// Point sensible : la quasi-totalite des utilisateurs sont mineurs. En France,
// en dessous de 15 ans, le traitement des donnees exige l'accord d'un titulaire
// de l'autorite parentale. Le bloc de consentement n'est donc pas un detail de
// conformite range dans les CGU : il est visible, explique, et bloquant.

const MINIMUM_AGE_WITHOUT_CONSENT = 15

type Mode = 'inscription' | 'connexion'

interface FormState {
  role: UserRole
  prenom: string
  nom: string
  email: string
  niveau: SchoolLevel | ''
  naissance: string
  motDePasse: string
  emailParent: string
  consentement: boolean
}

const INITIAL: FormState = {
  role: 'eleve',
  prenom: '',
  nom: '',
  email: '',
  niveau: '',
  naissance: '',
  motDePasse: '',
  emailParent: '',
  consentement: false,
}

/** Age revolu a la date du jour. */
function ageFrom(birthDate: string): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null

  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

export default function LoginPage() {
  const { status, signUp, signInDemo, signInTeacher } = useSession()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('inscription')
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const age = ageFrom(form.naissance)
  const isStudent = form.role === 'eleve'
  // Tant que la date de naissance n'est pas saisie, on affiche le bloc parental
  // par defaut pour un eleve : mieux vaut le montrer a tort que l'oublier.
  const needsParentalConsent =
    isStudent && (age === null || age < MINIMUM_AGE_WITHOUT_CONSENT)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const levelOptions = useMemo(
    () => SCHOOL_LEVELS.map((level) => ({ value: level, label: level })),
    [],
  )

  if (status === 'loading') return <LoadingScreen label="Ouverture de ton espace…" />
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/connexion' ? from : '/'} replace />
  }

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {}

    if (!form.prenom.trim()) next.prenom = 'Indique ton prénom.'
    if (!form.email.trim()) next.email = 'Indique une adresse email.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Cette adresse semble incomplète.'
    if (form.motDePasse.length < 8) next.motDePasse = 'Au moins 8 caractères.'
    if (isStudent && !form.niveau) next.niveau = 'Choisis ton niveau scolaire.'

    if (needsParentalConsent) {
      if (!form.emailParent.trim()) next.emailParent = "Email d'un parent obligatoire avant 15 ans."
      else if (!/^\S+@\S+\.\S+$/.test(form.emailParent.trim()))
        next.emailParent = 'Cette adresse semble incomplète.'
      if (!form.consentement) next.consentement = "L'accord du parent est obligatoire."
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'connexion') {
      // L'authentification reelle arrive avec Supabase (Jalon 2). En attendant,
      // se connecter ouvre le compte de demonstration.
      void signInDemo()
      return
    }
    if (!validate()) return

    void signUp({
      role: form.role,
      prenom: form.prenom,
      nom: form.nom || form.prenom,
      email: form.email,
      motDePasse: form.motDePasse,
      niveau_scolaire: form.niveau || null,
      date_naissance: form.naissance || null,
      email_parent: needsParentalConsent ? form.emailParent : null,
      consentement_parental: form.consentement,
    })
  }

  return (
    <div className="flex min-h-full flex-col bg-canvas lg:flex-row">
      {/* Colonne d'accroche, desktop uniquement */}
      <aside className="relative hidden w-[46%] max-w-[520px] shrink-0 flex-col justify-between bg-muted p-10 lg:flex">
        <Wordmark className="text-xl" />
        <IllustrationPlaceholder />
        <p className="max-w-[340px] font-display text-[17px] font-medium leading-relaxed text-ink">
          On remonte à la racine de la difficulté, puis on ne travaille que ça.
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <Wordmark className="mb-6 text-base lg:hidden" />

          <h1 className="font-display text-[26px] font-medium leading-tight tracking-[-0.015em] text-ink sm:text-[30px]">
            {mode === 'inscription' ? 'Créer un compte' : 'Se connecter'}
          </h1>
          <p className="mb-6 mt-2 text-[13.5px] leading-relaxed text-ink-subtle">
            {mode === 'inscription' ? 'Déjà inscrit ? ' : 'Pas encore de compte ? '}
            <button
              type="button"
              onClick={() => setMode(mode === 'inscription' ? 'connexion' : 'inscription')}
              className="font-semibold text-accent hover:text-accent-600"
            >
              {mode === 'inscription' ? 'Se connecter' : 'Créer un compte'}
            </button>
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'inscription' && (
              <>
                <p className="mb-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-ink-faint">
                  Je suis
                </p>
                <Segmented<UserRole>
                  ariaLabel="Je suis"
                  value={form.role}
                  onChange={(role) => set('role', role)}
                  className="mb-5"
                  options={[
                    { value: 'eleve', label: 'Élève' },
                    { value: 'prof', label: 'Professeur' },
                    { value: 'parent', label: 'Parent' },
                  ]}
                />

                <div className="grid gap-3">
                  <Field label="Prénom" htmlFor="prenom" error={errors.prenom}>
                    <TextInput
                      id="prenom"
                      autoComplete="given-name"
                      placeholder="Léa"
                      value={form.prenom}
                      onChange={(e) => set('prenom', e.target.value)}
                    />
                  </Field>

                  {isStudent && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Niveau scolaire" htmlFor="niveau" error={errors.niveau}>
                        <Select
                          id="niveau"
                          value={form.niveau}
                          onChange={(e) => set('niveau', e.target.value as SchoolLevel)}
                        >
                          <option value="">Choisir…</option>
                          {levelOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Date de naissance" htmlFor="naissance">
                        <TextInput
                          id="naissance"
                          type="date"
                          autoComplete="bday"
                          value={form.naissance}
                          onChange={(e) => set('naissance', e.target.value)}
                        />
                      </Field>
                    </div>
                  )}

                  <Field label="Email" htmlFor="email" error={errors.email}>
                    <TextInput
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="lea.d@email.fr"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Mot de passe"
                    htmlFor="motdepasse"
                    hint="8 caractères minimum."
                    error={errors.motDePasse}
                  >
                    <TextInput
                      id="motdepasse"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={form.motDePasse}
                      onChange={(e) => set('motDePasse', e.target.value)}
                    />
                  </Field>
                </div>

                {needsParentalConsent && (
                  <div className="mt-4 rounded-card border border-accent-100 bg-accent-50 p-4">
                    <p className="mb-2.5 text-[12.5px] font-semibold leading-none text-accent-700">
                      {age === null
                        ? "Moins de 15 ans — accord d'un parent requis"
                        : `${age} ans — accord d'un parent requis`}
                    </p>
                    <Field label="Email du parent" htmlFor="emailparent" error={errors.emailParent}>
                      <TextInput
                        id="emailparent"
                        type="email"
                        placeholder="parent@email.fr"
                        value={form.emailParent}
                        onChange={(e) => set('emailParent', e.target.value)}
                      />
                    </Field>
                    <Checkbox
                      className="mt-3"
                      checked={form.consentement}
                      onChange={(checked) => set('consentement', checked)}
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
              </>
            )}

            {mode === 'connexion' && (
              <div className="grid gap-3">
                <Field label="Email" htmlFor="email-connexion">
                  <TextInput
                    id="email-connexion"
                    type="email"
                    autoComplete="email"
                    placeholder="lea.d@email.fr"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </Field>
                <Field label="Mot de passe" htmlFor="motdepasse-connexion">
                  <TextInput
                    id="motdepasse-connexion"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={form.motDePasse}
                    onChange={(e) => set('motDePasse', e.target.value)}
                  />
                </Field>
              </div>
            )}

            <Button type="submit" size="lg" fullWidth className="mt-5">
              {mode === 'inscription' ? 'Créer mon compte' : 'Me connecter'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11.5px] text-ink-faint">ou</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <Button variant="secondary" size="lg" fullWidth onClick={() => void signInDemo()}>
            Continuer avec le compte de démonstration
          </Button>

          <button
            type="button"
            onClick={() => void signInTeacher()}
            className="mt-4 w-full text-center text-[12.5px] font-semibold text-accent hover:text-accent-600"
          >
            Voir l'espace professeur
          </button>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-faint">
            Données hébergées dans l'Union européenne. Un parent peut retirer son accord et
            supprimer le compte à tout moment.
          </p>
        </div>
      </div>
    </div>
  )
}

/** Emplacement de l'illustration maths, en attendant le visuel definitif. */
function IllustrationPlaceholder() {
  return (
    <div className="relative my-10 flex-1 overflow-hidden rounded-[20px] border border-dashed border-[#C7C3B8]">
      <svg width="100%" height="100%" className="block">
        <defs>
          <pattern
            id="hatch"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="12" fill="#E7E4DC" />
            <rect x="6" width="6" height="12" fill="#EFEDE6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hatch)" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="max-w-[280px] rounded-lg border border-[#DAD6CC] bg-canvas/90 px-3.5 py-2.5 text-center font-mono text-[11.5px] leading-relaxed text-ink-subtle">
          illustration maths
        </p>
      </div>
    </div>
  )
}
