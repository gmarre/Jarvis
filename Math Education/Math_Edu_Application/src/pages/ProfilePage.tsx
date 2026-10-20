import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { formatDateLong, formatEuros, initials } from '@/lib/format'
import { ageFrom, estMineur, needsParentalConsent } from '@/lib/age'
import { ConnexionCard } from '@/components/compte/ConnexionCard'
import { ConsentementNotice } from '@/components/compte/ConsentementNotice'
import { RythmeCard } from '@/components/compte/RythmeCard'
import { ProfilPublicCard } from '@/components/prof/ProfilPublicCard'
import type { ModificationEnAttente } from '@/types/domain'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field, Select, TextInput, Toggle } from '@/components/ui/Field'
import { Avatar, EmptyState, Level, Notice } from '@/components/ui/Misc'
import { ProgressBar } from '@/components/ui/Progress'
import { IconCheck } from '@/components/ui/icons'
import { useAuthenticatedSession } from '@/state/session'
import { repository, RepositoryError } from '@/data'
import { telechargerJson } from '@/lib/telecharger'
import { useDailyPlan } from '@/state/usePlan'
import { SCHOOL_LEVELS, type SchoolLevel } from '@/types/content'

// Ecran 3 : profil. Maquettes 1k (desktop, compte rempli) et 1l (mobile,
// compte neuf en etat vide). Les deux etats vivent dans le meme composant :
// c'est la donnee qui decide, pas une page separee.

export default function ProfilePage() {
  const {
    session,
    updateProfile,
    modifierProfil,
    demanderModification,
    getModificationsEnAttente,
    signOut,
    isDemo,
  } = useAuthenticatedSession()
  const plan = useDailyPlan()
  const navigate = useNavigate()
  const { profile } = session

  const [editing, setEditing] = useState(false)
  const brouillonDe = () => ({
    prenom: profile.prenom,
    niveau: profile.niveau_scolaire ?? '',
    naissance: profile.date_naissance ?? '',
    emailParent: profile.email_parent ?? '',
  })
  const [draft, setDraft] = useState(brouillonDe)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [retour, setRetour] = useState<{ ton: 'mastered' | 'progress'; texte: string } | null>(null)
  const [pending, setPending] = useState(false)

  // Demandes soumises au parent, affichees tant qu'il n'a pas tranche.
  const [enAttente, setEnAttente] = useState<ModificationEnAttente[]>([])
  const relireEnAttente = useCallback(() => {
    if (profile.role !== 'eleve') return
    getModificationsEnAttente()
      .then(setEnAttente)
      .catch(() => setEnAttente([]))
  }, [getModificationsEnAttente, profile.role])
  useEffect(relireEnAttente, [relireEnAttente])

  // Un mineur ne change sa date de naissance qu'avec l'accord de son parent ;
  // la premiere saisie, elle, est libre (migration 0011).
  const mineur = estMineur(profile.date_naissance)

  const isTeacher = profile.role === 'prof'
  // Les blocs scolaires (niveau, consentement parental, progression, abonnement)
  // ne concernent que l'eleve. Un parent qui ouvre cet ecran ne doit pas se voir
  // proposer un test de positionnement de mathematiques.
  const isStudent = profile.role === 'eleve'
  const hasProgress = !plan.needsPlacement

  const save = async () => {
    const naissanceChangee = draft.naissance !== (profile.date_naissance ?? '')
    const viaParent = naissanceChangee && mineur
    const emailParent = draft.emailParent.trim()

    const suivantes: Record<string, string> = {}
    if (!draft.prenom.trim()) suivantes.prenom = 'Indique ton prénom.'
    if (isStudent && naissanceChangee && ageFrom(draft.naissance) === null) {
      suivantes.naissance = 'Cette date ne semble pas valide.'
    }
    if (emailParent && !/^\S+@\S+\.\S+$/.test(emailParent)) {
      suivantes.emailParent = 'Cette adresse semble incomplète.'
    } else if (isStudent && !emailParent && needsParentalConsent('eleve', draft.naissance)) {
      // Avant 15 ans, quelle que soit la voie (directe ou par le parent), il
      // faut l'adresse d'un parent.
      suivantes.emailParent = "Email d'un parent obligatoire avant 15 ans."
    }
    setErreurs(suivantes)
    if (Object.keys(suivantes).length > 0) return

    setPending(true)
    setRetour(null)
    try {
      await modifierProfil({
        prenom: draft.prenom.trim(),
        ...(isStudent
          ? {
              niveau_scolaire: (draft.niveau || null) as SchoolLevel | null,
              email_parent: emailParent || null,
              ...(naissanceChangee && !viaParent ? { date_naissance: draft.naissance } : {}),
            }
          : {}),
      })
      if (viaParent) {
        const { envoye_a } = await demanderModification('date_naissance', draft.naissance)
        relireEnAttente()
        setRetour({
          ton: 'mastered',
          texte: `Profil enregistré. Le changement de date de naissance attend l'accord de ${envoye_a}.`,
        })
      } else {
        setRetour({ ton: 'mastered', texte: 'Profil enregistré.' })
      }
      setEditing(false)
    } catch (cause: unknown) {
      setRetour({
        ton: 'progress',
        texte: cause instanceof Error ? cause.message : "L'enregistrement a échoué.",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <AppShell>
      <PageBody>
        <PageHeader title="Mon profil" />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            {/* Identite */}
            <Card>
              <div className="mb-6 flex items-center gap-4">
                <Avatar
                  initials={hasProgress || isTeacher ? initials(profile.prenom, profile.nom) : '?'}
                  size="xl"
                  tone={hasProgress || isTeacher ? 'accent' : 'neutral'}
                />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-display text-xl font-medium leading-tight text-ink">
                    {profile.prenom} {profile.nom}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-subtle">
                    {isTeacher ? (
                      <>Professeur · inscrit depuis {formatDateLong(profile.cree_le)}</>
                    ) : profile.niveau_scolaire ? (
                      <>
                        Élève · <Level value={profile.niveau_scolaire} /> · inscrit depuis{' '}
                        {formatDateLong(profile.cree_le)}
                      </>
                    ) : (
                      <span className="text-ink-faint">Niveau scolaire à renseigner</span>
                    )}
                  </p>
                </div>
                {!editing && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDraft(brouillonDe())
                      setErreurs({})
                      setRetour(null)
                      setEditing(true)
                    }}
                  >
                    Modifier
                  </Button>
                )}
              </div>

              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prénom" htmlFor="p-prenom" error={erreurs.prenom}>
                    <TextInput
                      id="p-prenom"
                      value={draft.prenom}
                      onChange={(e) => setDraft({ ...draft, prenom: e.target.value })}
                    />
                  </Field>
                  {isStudent && (
                    <Field label="Niveau scolaire" htmlFor="p-niveau">
                      <Select
                        id="p-niveau"
                        value={draft.niveau}
                        onChange={(e) => setDraft({ ...draft, niveau: e.target.value })}
                      >
                        <option value="">Choisir…</option>
                        {SCHOOL_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  {isStudent && (
                    <Field
                      label="Date de naissance"
                      htmlFor="p-naissance"
                      hint={mineur ? "Un changement attendra l'accord de ton parent." : undefined}
                      error={erreurs.naissance}
                    >
                      <TextInput
                        id="p-naissance"
                        type="date"
                        autoComplete="bday"
                        value={draft.naissance}
                        onChange={(e) => setDraft({ ...draft, naissance: e.target.value })}
                      />
                    </Field>
                  )}
                  {isStudent && (
                    <Field
                      label="Email du parent"
                      htmlFor="p-parent"
                      hint="Obligatoire avant 15 ans. Le changer redemande son accord."
                      error={erreurs.emailParent}
                    >
                      <TextInput
                        id="p-parent"
                        type="email"
                        value={draft.emailParent}
                        onChange={(e) => setDraft({ ...draft, emailParent: e.target.value })}
                      />
                    </Field>
                  )}
                  {retour && (
                    <Notice tone={retour.ton} className="sm:col-span-2">
                      {retour.texte}
                    </Notice>
                  )}
                  <div className="flex gap-2.5 sm:col-span-2">
                    <Button onClick={() => void save()} disabled={pending}>
                      {pending ? 'Un instant…' : 'Enregistrer'}
                    </Button>
                    <Button variant="secondary" onClick={() => setEditing(false)} disabled={pending}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <ReadOnlyField label="Prénom" value={profile.prenom} />
                  {isStudent && (
                    <ReadOnlyField
                      label="Niveau scolaire"
                      value={profile.niveau_scolaire ?? 'À renseigner'}
                      muted={!profile.niveau_scolaire}
                    />
                  )}
                  {isStudent && (
                    <ReadOnlyField
                      label="Date de naissance"
                      value={
                        profile.date_naissance
                          ? formatDateLong(profile.date_naissance)
                          : 'À renseigner'
                      }
                      muted={!profile.date_naissance}
                    />
                  )}
                  {isStudent && (
                    <ReadOnlyField
                      label="Email du parent"
                      value={profile.email_parent ?? 'À renseigner'}
                      muted={!profile.email_parent}
                    />
                  )}
                </dl>
              )}

              {!editing && retour && (
                <Notice tone={retour.ton} className="mt-5">
                  {retour.texte}
                </Notice>
              )}

              {enAttente.map((demande) => (
                <Notice key={demande.id} tone="progress" icon="!" className="mt-5">
                  {demande.champ === 'email'
                    ? `Nouvelle adresse ${demande.nouvelle_valeur}`
                    : `Nouvelle date de naissance (${formatDateLong(demande.nouvelle_valeur)})`}{' '}
                  en attente de l'accord de {demande.email_parent}, jusqu'au{' '}
                  {formatDateLong(demande.expire_le)}.
                </Notice>
              ))}

              <ConsentementNotice className="mt-5" afficherConfirme />
              {/* Raccourci de recette, mode demonstration uniquement. Contre la
                  vraie base, un trigger refuse cette ecriture : un mineur ne doit
                  pas pouvoir se confirmer a lui-meme l'accord de son parent. */}
              {isDemo && isStudent && !profile.consentement_parental_at && profile.email_parent && (
                <button
                  type="button"
                  onClick={() =>
                    updateProfile({ consentement_parental_at: new Date().toISOString() })
                  }
                  className="mt-2 min-h-[44px] text-[12px] font-semibold text-ink-subtle underline underline-offset-2"
                >
                  Simuler la confirmation du parent (démo)
                </button>
              )}
            </Card>

            {/* Progression */}
            {isStudent && (
              <Card>
                <CardTitle
                  action={
                    <Link to="/parcours" className="text-[12.5px] font-semibold text-accent">
                      Voir mon parcours
                    </Link>
                  }
                >
                  Où j'en suis
                </CardTitle>

                {hasProgress ? (
                  <div className="flex flex-col gap-4">
                    {plan.perDomain.map((domain) => (
                      <div key={domain.id}>
                        <div className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-medium text-ink-soft">
                          <span>{domain.name}</span>
                          <span className="text-ink-faint">
                            {domain.mastered} / {domain.total}
                          </span>
                        </div>
                        <ProgressBar
                          value={domain.mastered}
                          max={domain.total}
                          label={`${domain.name} : ${domain.mastered} sur ${domain.total}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-card border border-dashed border-locked-200 py-8">
                    <EmptyState
                      title="Pas encore de progression"
                      description="Fais le test de positionnement (environ 8 minutes) pour créer ton graphe de compétences."
                      action={
                        <ButtonLink to="/test" size="lg">
                          Faire le test
                        </ButtonLink>
                      }
                    />
                  </div>
                )}
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-5">
            {isStudent && <SubscriptionCard abonnement={profile.abonnement} />}

            {isStudent && <RythmeCard />}
            {profile.role === 'prof' && <ProfilPublicCard />}

            <ConnexionCard onDemandeEnvoyee={relireEnAttente} />

            <Card>
              <CardTitle>Données &amp; confidentialité</CardTitle>
              <div className="flex flex-col divide-y divide-divider">
                <Toggle
                  label="Partager ma progression avec mon professeur"
                  checked={profile.partage_progression_prof}
                  onChange={(value) => updateProfile({ partage_progression_prof: value })}
                />
                {/* « Résumé hebdo au parent » reviendra avec son envoi (sprint 4) :
                    un reglage qui n'envoie rien est un texte mensonger (regle 2).
                    Les rappels par email sont dans la carte « Mon rythme ». */}
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
                Données hébergées dans l'Union européenne. Seules les informations nécessaires au
                suivi pédagogique sont conservées.
              </p>

              <DataRights />
            </Card>

            <Card tone="flat">
              <p className="mb-3 text-[12.5px] leading-relaxed text-ink-subtle">
                Connecté en tant que {profile.email}.
              </p>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  void signOut()
                  navigate('/connexion')
                }}
              >
                Se déconnecter
              </Button>
            </Card>
          </div>
        </div>
      </PageBody>
    </AppShell>
  )
}

function ReadOnlyField({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div>
      <dt className="mb-1.5 text-[11.5px] font-semibold text-ink-faint">{label}</dt>
      <dd
        className={`min-h-[46px] rounded-xl border border-divider bg-canvas px-3.5 py-3 text-[13.5px] ${
          muted ? 'text-ink-faint' : 'text-ink'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function SubscriptionCard({
  abonnement,
}: {
  abonnement: ReturnType<typeof useAuthenticatedSession>['session']['profile']['abonnement']
}) {
  const features = [
    'Exercices adaptés illimités',
    'Cartes mémoire & révision espacée',
    'Graphe de compétences personnalisé',
  ]

  return (
    <Card>
      <CardTitle>Mon abonnement</CardTitle>

      {abonnement ? (
        <>
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className="font-display text-[30px] leading-none text-ink">
              {formatEuros(abonnement.prix_mensuel)}
            </span>
            <span className="text-[13px] text-ink-subtle">/ mois</span>
          </div>
          <p className="mb-4 text-[12.5px] leading-relaxed text-ink-subtle">
            Engagement {abonnement.engagement_mois} mois · renouvelé le{' '}
            {abonnement.jour_renouvellement} de chaque mois. Accès plateforme, hors cours
            particuliers.
          </p>
        </>
      ) : (
        <p className="mb-4 text-[12.5px] leading-relaxed text-ink-subtle">
          Aucun abonnement actif. La plateforme est gratuite pendant la phase de test.
        </p>
      )}

      <ul className="mb-5 flex flex-col gap-2.5 text-[12.5px] text-ink-muted">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5">
            <IconCheck size={15} className="shrink-0 text-mastered" />
            {feature}
          </li>
        ))}
        <li className="flex items-center gap-2.5 text-ink-faint">
          <span className="w-[15px] shrink-0 text-center">+</span>
          Cours particuliers : 20 € / 1h30 à la séance
        </li>
      </ul>

      <ButtonLink to="/abonnement" variant="secondary" fullWidth>
        {abonnement ? "Gérer l'abonnement" : "Découvrir l'abonnement"}
      </ButtonLink>
    </Card>
  )
}

/**
 * Export et suppression des donnees : deux droits RGPD que l'ecran annoncait
 * sans les rendre. L'export se fait cote client depuis la session courante, la
 * suppression efface le compte local puis deconnecte.
 *
 * Contre Supabase, la suppression n'efface encore rien (une deconnexion ne
 * supprime pas le compte) : le bouton n'y est donc pas affiche, il mentirait.
 * La vraie suppression, par une fonction serveur, arrive au sprint 4 (RGPD).
 */
function DataRights() {
  const { session, signOut, isDemo } = useAuthenticatedSession()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [exported, setExported] = useState(false)

  const [mot, setMot] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  // Export RGPD : tout ce que la base garde sur le compte (sprint 4), plus
  // les reservations de la session.
  const exportData = async () => {
    setErreur(null)
    try {
      const donnees = await repository.exporterDonnees(session.profile.id)
      telechargerJson(`racine-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`, {
        ...donnees,
        reservations: session.bookings,
      })
      setExported(true)
      window.setTimeout(() => setExported(false), 4000)
    } catch (cause) {
      setErreur(cause instanceof RepositoryError ? cause.message : 'L’export a échoué.')
    }
  }

  // Suppression definitive (fonction supprimer-compte) : le compte, son
  // profil et tout ce qui en depend, en cascade.
  const deleteAccount = async () => {
    setEnCours(true)
    setErreur(null)
    try {
      await repository.supprimerCompte()
      await signOut()
      navigate('/connexion')
    } catch (cause) {
      setErreur(cause instanceof RepositoryError ? cause.message : 'La suppression a échoué.')
      setEnCours(false)
    }
  }

  return (
    <div className="mt-4 border-t border-divider pt-4">
      <div className="flex flex-wrap gap-2.5">
        <Button variant="secondary" size="sm" onClick={() => void exportData()}>
          {exported ? 'Fichier téléchargé' : 'Exporter mes données'}
        </Button>
        {confirming ? (
          <>
            <TextInput
              aria-label="Tape SUPPRIMER pour confirmer"
              value={mot}
              onChange={(e) => setMot(e.target.value)}
              className="max-w-[160px]"
            />
            <Button
              size="sm"
              disabled={mot !== 'SUPPRIMER' || enCours}
              onClick={() => void deleteAccount()}
              className="bg-wrong-600 hover:bg-wrong-600"
            >
              Confirmer la suppression
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Supprimer mon compte
          </Button>
        )}
      </div>
      {confirming && (
        <p role="alert" className="mt-2.5 text-[11.5px] leading-relaxed text-wrong-600">
          Cette action efface définitivement ton compte, ta progression, tes tentatives et tes réservations.
          Elle est irréversible. Pense à exporter tes données avant. Tape SUPPRIMER pour confirmer.
          {isDemo && ' (Mode démonstration : la session locale est effacée.)'}
        </p>
      )}
      {erreur && (
        <p role="alert" className="mt-2 text-[11.5px] text-wrong-600">
          {erreur}
        </p>
      )}
    </div>
  )
}
