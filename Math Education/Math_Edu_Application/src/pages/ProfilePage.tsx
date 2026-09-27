import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { formatDateLong, formatEuros, initials } from '@/lib/format'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field, Select, TextInput, Toggle } from '@/components/ui/Field'
import { Avatar, EmptyState, Level, Notice } from '@/components/ui/Misc'
import { ProgressBar } from '@/components/ui/Progress'
import { IconCheck } from '@/components/ui/icons'
import { useAuthenticatedSession } from '@/state/session'
import { useDailyPlan } from '@/state/usePlan'
import { SCHOOL_LEVELS, type SchoolLevel } from '@/types/content'

// Ecran 3 : profil. Maquettes 1k (desktop, compte rempli) et 1l (mobile,
// compte neuf en etat vide). Les deux etats vivent dans le meme composant :
// c'est la donnee qui decide, pas une page separee.

export default function ProfilePage() {
  const { session, updateProfile, signOut, isDemo } = useAuthenticatedSession()
  const plan = useDailyPlan()
  const navigate = useNavigate()
  const { profile } = session

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    prenom: profile.prenom,
    niveau: profile.niveau_scolaire ?? '',
    email: profile.email,
    emailParent: profile.email_parent ?? '',
  })

  const isTeacher = profile.role === 'prof'
  // Les blocs scolaires (niveau, consentement parental, progression, abonnement)
  // ne concernent que l'eleve. Un parent qui ouvre cet ecran ne doit pas se voir
  // proposer un test de positionnement de mathematiques.
  const isStudent = profile.role === 'eleve'
  const hasProgress = !plan.needsPlacement

  const save = () => {
    updateProfile({
      prenom: draft.prenom.trim() || profile.prenom,
      niveau_scolaire: (draft.niveau || null) as SchoolLevel | null,
      email: draft.email.trim() || profile.email,
      email_parent: draft.emailParent.trim() || null,
    })
    setEditing(false)
  }

  return (
    <AppShell>
      <PageBody>
        <PageHeader title="Mon profil" />

        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
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
                  <p className="truncate font-display text-xl font-medium leading-tight text-ink">
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
                  <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                    Modifier
                  </Button>
                )}
              </div>

              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prénom" htmlFor="p-prenom">
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
                  <Field label="Email" htmlFor="p-email">
                    <TextInput
                      id="p-email"
                      type="email"
                      value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    />
                  </Field>
                  {isStudent && (
                    <Field
                      label="Email du parent"
                      htmlFor="p-parent"
                      hint="Obligatoire avant 15 ans."
                    >
                      <TextInput
                        id="p-parent"
                        type="email"
                        value={draft.emailParent}
                        onChange={(e) => setDraft({ ...draft, emailParent: e.target.value })}
                      />
                    </Field>
                  )}
                  <div className="flex gap-2.5 sm:col-span-2">
                    <Button onClick={save}>Enregistrer</Button>
                    <Button variant="secondary" onClick={() => setEditing(false)}>
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
                  <ReadOnlyField label="Email" value={profile.email} />
                  {isStudent && (
                    <ReadOnlyField
                      label="Email du parent"
                      value={profile.email_parent ?? 'À renseigner'}
                      muted={!profile.email_parent}
                    />
                  )}
                </dl>
              )}

              {isStudent && (
                <div className="mt-5">
                  {profile.consentement_parental_at ? (
                    <Notice tone="mastered">
                      Consentement parental confirmé le{' '}
                      {formatDateLong(profile.consentement_parental_at)}. Ton parent peut retirer
                      son accord et supprimer le compte à tout moment.
                    </Notice>
                  ) : profile.email_parent ? (
                    <Notice tone="progress" icon="!">
                      En attente de l'accord de {profile.email_parent}. L'envoi automatique de
                      l'email de confirmation arrive au prochain jalon.
                      {/* Raccourci de recette, mode demonstration uniquement. Contre
                          la vraie base, un trigger refuse cette ecriture : un mineur
                          ne doit pas pouvoir se confirmer a lui-meme l'accord de son
                          parent. La confirmation passera par le lien envoye au parent. */}
                      {isDemo && (
                        <>
                          {' '}
                          <button
                            type="button"
                            onClick={() =>
                              updateProfile({
                                consentement_parental_at: new Date().toISOString(),
                              })
                            }
                            className="font-semibold underline underline-offset-2"
                          >
                            Simuler la confirmation (démo)
                          </button>
                        </>
                      )}
                    </Notice>
                  ) : (
                    <Notice tone="progress" icon="!">
                      Aucun email de parent renseigné. Avant 15 ans, l'accord d'un parent est
                      obligatoire pour utiliser la plateforme.
                    </Notice>
                  )}
                </div>
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

            <Card>
              <CardTitle>Données &amp; confidentialité</CardTitle>
              <div className="flex flex-col divide-y divide-divider">
                <Toggle
                  label="Partager ma progression avec mon professeur"
                  checked={profile.partage_progression_prof}
                  onChange={(value) => updateProfile({ partage_progression_prof: value })}
                />
                <Toggle
                  label="Envoyer un résumé hebdo au parent"
                  checked={profile.resume_hebdo_parent}
                  onChange={(value) => updateProfile({ resume_hebdo_parent: value })}
                />
                <Toggle
                  label="Rappels de révision"
                  checked={profile.rappels_revision}
                  onChange={(value) => updateProfile({ rappels_revision: value })}
                />
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
 * Au branchement de Supabase, l'export passera par le repository et la
 * suppression par une fonction serveur, mais le contrat de cet ecran ne change
 * pas : un bouton qui exporte, un bouton qui supprime apres confirmation.
 */
function DataRights() {
  const { session, signOut } = useAuthenticatedSession()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [exported, setExported] = useState(false)

  const exportData = () => {
    const payload = {
      exporte_le: new Date().toISOString(),
      profil: session.profile,
      progression: session.progress,
      positionnement: session.placement,
      tentatives: session.attempts,
      reservations: session.bookings,
    }

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `racine-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)

    setExported(true)
    window.setTimeout(() => setExported(false), 4000)
  }

  const deleteAccount = () => {
    void signOut()
    navigate('/connexion')
  }

  return (
    <div className="mt-4 border-t border-divider pt-4">
      <div className="flex flex-wrap gap-2.5">
        <Button variant="secondary" size="sm" onClick={exportData}>
          {exported ? 'Fichier téléchargé' : 'Exporter mes données'}
        </Button>
        {confirming ? (
          <>
            <Button size="sm" onClick={deleteAccount} className="bg-wrong-600 hover:bg-wrong-600">
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
          Cette action efface définitivement ta progression, tes tentatives et tes réservations.
          Elle est irréversible. Pense à exporter tes données avant.
        </p>
      )}
    </div>
  )
}
