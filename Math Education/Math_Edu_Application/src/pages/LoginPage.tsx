import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Field, Segmented, TextInput } from '@/components/ui/Field'
import { LoadingScreen, Notice } from '@/components/ui/Misc'
import { safeRedirect } from '@/lib/redirect'
import { LONGUEUR_MIN_MOT_DE_PASSE, verifierMotDePasse } from '@/lib/authErreurs'
import { Wordmark } from '@/components/layout/AppShell'
import { GoogleMark } from '@/components/ui/icons'
import { useSession } from '@/state/session'
import type { UserRole } from '@/types/domain'

// Ecran 1 des maquettes (1b desktop, 1c mobile).
//
// L'inscription ne demande que l'identite. Niveau scolaire, date de naissance et
// accord parental sont demandes sur /bienvenue, une fois le compte ouvert, pour
// Google comme pour l'email. Raison : quand la confirmation d'email est active,
// aucune session n'existe a la creation du compte, donc rien ne peut etre ecrit
// dans le profil depuis cet ecran. La recette du 3 octobre 2026 l'a montre.
//
// Le bloc d'accord parental reste visible, explique et bloquant : il vit
// simplement sur /bienvenue, ou il ne peut plus etre contourne.

type Mode = 'inscription' | 'connexion'

interface FormState {
  role: UserRole
  prenom: string
  email: string
  motDePasse: string
  /** Seconde saisie : une faute de frappe dans un champ masque bloque le compte. */
  confirmation: string
}

const INITIAL: FormState = {
  role: 'eleve',
  prenom: '',
  email: '',
  motDePasse: '',
  confirmation: '',
}

/** Delai avant de pouvoir redemander le lien : l'envoi d'emails est limite. */
const DELAI_RENVOI_S = 60

export default function LoginPage() {
  const { status, signUp, signInWithGoogle, signInWithPassword, resendConfirmation, isDemo } =
    useSession()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('inscription')
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  /** Erreur renvoyee par le serveur (mot de passe faux, email deja pris...). */
  const [authError, setAuthError] = useState<string | null>(null)
  /** Adresse a laquelle Supabase vient d'envoyer le lien de confirmation. */
  const [aConfirmer, setAConfirmer] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  /** Horodatage du dernier envoi du lien, pour limiter les renvois. */
  const [dernierEnvoi, setDernierEnvoi] = useState<number | null>(null)
  const [renvoi, setRenvoi] = useState<'envoye' | 'trop_tot' | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  if (status === 'loading') return <LoadingScreen label="Ouverture de ton espace…" />
  if (status === 'authenticated') {
    const from = safeRedirect((location.state as { from?: string } | null)?.from)
    return <Navigate to={from} replace />
  }

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {}

    if (!form.prenom.trim()) next.prenom = 'Indique ton prénom.'
    if (!form.email.trim()) next.email = 'Indique une adresse email.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Cette adresse semble incomplète.'
    Object.assign(next, verifierMotDePasse(form.motDePasse, form.confirmation))

    setErrors(next)
    return Object.keys(next).length === 0
  }

  /** Enveloppe commune : etat d'attente, et remontee de l'erreur serveur. */
  const tenter = async (action: () => Promise<void>) => {
    setAuthError(null)
    setPending(true)
    try {
      await action()
    } catch (cause: unknown) {
      setAuthError(cause instanceof Error ? cause.message : 'La connexion a échoué.')
    } finally {
      setPending(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (mode === 'connexion') {
      if (!form.email.trim() || !form.motDePasse) {
        setAuthError('Renseigne ton adresse et ton mot de passe.')
        return
      }
      void tenter(() => signInWithPassword(form.email, form.motDePasse))
      return
    }

    if (!validate()) return

    void tenter(async () => {
      const issue = await signUp({
        role: form.role,
        prenom: form.prenom,
        email: form.email,
        motDePasse: form.motDePasse,
      })
      if (issue === 'confirmation_requise') {
        setAConfirmer(form.email.trim())
        setDernierEnvoi(Date.now())
        setRenvoi(null)
        setMode('connexion')
        setForm((current) => ({ ...current, motDePasse: '', confirmation: '' }))
      }
    })
  }

  const renvoyerLien = () => {
    if (!aConfirmer) return
    if (dernierEnvoi && Date.now() - dernierEnvoi < DELAI_RENVOI_S * 1000) {
      setRenvoi('trop_tot')
      return
    }
    void tenter(async () => {
      await resendConfirmation(aConfirmer)
      setDernierEnvoi(Date.now())
      setRenvoi('envoye')
    })
  }

  return (
    <div className="flex min-h-full flex-col bg-canvas lg:flex-row">
      {/* Colonne d'accroche : bandeau en haut sur mobile, colonne a gauche en
          desktop. La photo est un decor ; le voile bleu garantit la lisibilite
          du texte blanc, quelle que soit la photo. */}
      <aside className="relative flex h-[200px] shrink-0 flex-col justify-between overflow-hidden bg-accent p-5 lg:h-auto lg:w-[46%] lg:max-w-[560px] lg:p-10">
        <img
          src="/images/connexion.webp"
          alt="Des collégiens travaillent leurs mathématiques sur un cahier, à côté d'un téléphone qui affiche leur progression."
          className="absolute inset-0 h-full w-full object-cover"
          width={1200}
          height={655}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-accent/90 via-accent/40 to-accent-700/95"
        />
        <Wordmark surFonce className="relative text-lg lg:text-xl" />
        <p className="relative max-w-[360px] font-display text-[15px] font-medium leading-snug text-white lg:text-[19px] lg:leading-relaxed">
          On remonte à la racine de la difficulté, puis on ne travaille que ça.
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">

          <h1 className="font-display text-[26px] font-medium leading-tight tracking-[-0.015em] text-ink sm:text-[30px]">
            {mode === 'inscription' ? 'Créer un compte' : 'Se connecter'}
          </h1>
          <p className="mb-6 mt-2 text-[13.5px] leading-relaxed text-ink-subtle">
            {mode === 'inscription' ? 'Déjà inscrit ? ' : 'Pas encore de compte ? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'inscription' ? 'connexion' : 'inscription')
                setAConfirmer(null)
              }}
              className="font-semibold text-accent hover:text-accent-600"
            >
              {mode === 'inscription' ? 'Se connecter' : 'Créer un compte'}
            </button>
          </p>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={pending}
            onClick={() => void tenter(signInWithGoogle)}
            className="mb-5"
          >
            <GoogleMark size={17} />
            Continuer avec Google
          </Button>

          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11.5px] text-ink-faint">ou par email</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {aConfirmer && (
            // Formulation conditionnelle volontaire : Supabase repond pareil quand
            // l'adresse a deja un compte, pour ne pas reveler qui est inscrit.
            // Affirmer "un email a ete envoye" serait donc parfois faux.
            <Notice tone="mastered" className="mb-4">
              Si {aConfirmer} n'avait pas encore de compte, un lien de confirmation vient d'y
              être envoyé. Clique dessus pour activer ton compte, puis connecte-toi ici.
              <span className="mt-2 block">
                Rien reçu après quelques minutes ? Regarde dans les indésirables, ou{' '}
                <button
                  type="button"
                  onClick={renvoyerLien}
                  disabled={pending}
                  className="min-h-[44px] font-semibold text-accent underline hover:text-accent-600"
                >
                  renvoie le lien
                </button>
                .
              </span>
              {renvoi === 'envoye' && <span className="mt-1 block">Lien renvoyé.</span>}
              {renvoi === 'trop_tot' && (
                <span className="mt-1 block">
                  Patiente une minute entre deux envois.
                </span>
              )}
            </Notice>
          )}

          {authError && (
            <Notice tone="progress" icon="!" className="mb-4">
              {authError}
            </Notice>
          )}

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
                    hint={`${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum. Évite ton prénom ou une date de naissance.`}
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

                  <Field
                    label="Confirme le mot de passe"
                    htmlFor="confirmation"
                    error={errors.confirmation}
                  >
                    <TextInput
                      id="confirmation"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={form.confirmation}
                      onChange={(e) => set('confirmation', e.target.value)}
                    />
                  </Field>
                </div>

                {form.role === 'eleve' && (
                  <p className="mt-4 text-[11.5px] leading-relaxed text-ink-subtle">
                    Tu indiqueras ensuite ton niveau et ta date de naissance. Avant 15 ans,
                    l'accord d'un parent sera demandé.
                  </p>
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

            <Button type="submit" size="lg" fullWidth className="mt-5" disabled={pending}>
              {pending
                ? 'Un instant…'
                : mode === 'inscription'
                  ? 'Créer mon compte'
                  : 'Me connecter'}
            </Button>
          </form>

          {/* Entrees de demonstration : uniquement quand l'app tourne sur
              donnees factices. En production elles n'ont rien a faire la, et
              surtout elles ne doivent pas occuper la place de Google. */}
          {isDemo && (
            <div className="mt-6 rounded-card border border-dashed border-locked-200 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-ink-faint">
                Mode démonstration
              </p>
              <p className="mb-3 text-[11.5px] leading-relaxed text-ink-subtle">
                Le backend n'est pas configuré. Ces deux comptes ouvrent des données factices.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  disabled={pending}
                  onClick={() => void tenter(() => signInWithPassword('lea.d@email.fr', 'demo'))}
                >
                  Élève de démonstration (Léa, 4e)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  disabled={pending}
                  onClick={() => void tenter(() => signInWithPassword('marc.b@email.fr', 'demo'))}
                >
                  Espace professeur
                </Button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-faint">
            Données hébergées dans l'Union européenne. Un parent peut retirer son accord et
            supprimer le compte à tout moment.
          </p>
        </div>
      </div>
    </div>
  )
}
