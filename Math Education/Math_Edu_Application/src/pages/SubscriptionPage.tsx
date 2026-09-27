import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card, CardTitle, SectionLabel } from '@/components/ui/Card'
import { IconCheck } from '@/components/ui/icons'
import { formatEuros } from '@/lib/format'
import { useAuthenticatedSession } from '@/state/session'

// Ecran abonnement.
//
// Le bouton "Decouvrir l'abonnement" du profil n'etait relie a rien : il
// n'existait aucune page derriere. Celle-ci la fournit.
//
// Parti pris assume : pas de paiement ici. Le modele economique est arrete
// (9,99 EUR/mois pour la plateforme, 20 EUR les 1h30 pour un cours), mais la
// plateforme est gratuite pendant la phase de test, et Stripe est planifie en
// iteration 2. On informe donc, on n'encaisse pas, et on le dit clairement
// plutot que d'afficher un bouton de paiement qui ne marche pas.

const PRIX_MENSUEL = 9.99
const PRIX_COURS = 20

const INCLUS = [
  'Test de positionnement sur le graphe de compétences',
  'Exercices adaptés illimités, trois niveaux de difficulté',
  'Remontée à la lacune racine, même deux classes en arrière',
  'Cartes mémoire et révision espacée',
  'Suivi de progression par domaine',
  'Partage de la progression avec le professeur, si vous l’autorisez',
]

const NON_INCLUS = [
  {
    titre: 'Cours particuliers',
    detail: `${PRIX_COURS} € pour 1h30, jusqu’à 3 élèves, facturés à la séance. Indépendants de l’abonnement.`,
  },
]

export default function SubscriptionPage() {
  const { session } = useAuthenticatedSession()
  const abonnement = session.profile.abonnement

  return (
    <AppShell>
      <PageBody className="max-w-[860px]">
        <PageHeader
          title="L’abonnement"
          subtitle="Ce que couvre la plateforme, ce qu’elle coutera, et ce que vous payez aujourd’hui."
        />

        <Card tone="accent" className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge tone="mastered" className="mb-2.5">
                Gratuit pendant la phase de test
              </Badge>
              <p className="font-display text-[19px] font-medium leading-snug text-ink">
                Vous ne payez rien pour l’instant
              </p>
              <p className="mt-1.5 max-w-[520px] text-[12.5px] leading-relaxed text-ink-muted">
                La plateforme est ouverte gratuitement le temps de la phase de test. Aucun moyen de
                paiement ne vous est demandé, et rien ne sera prélevé sans que vous l’ayez
                accepté explicitement.
              </p>
            </div>
            <ButtonLink to="/travail" size="lg">
              Continuer gratuitement
            </ButtonLink>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <Card>
            <CardTitle>Formule plateforme</CardTitle>

            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="font-display text-[34px] leading-none text-ink">
                {formatEuros(abonnement?.prix_mensuel ?? PRIX_MENSUEL)}
              </span>
              <span className="text-[13px] text-ink-subtle">/ mois</span>
            </div>
            <p className="mb-5 text-[12.5px] leading-relaxed text-ink-subtle">
              {abonnement
                ? `Votre abonnement est actif. Engagement ${abonnement.engagement_mois} mois, renouvelé le ${abonnement.jour_renouvellement} de chaque mois.`
                : 'Tarif prévu à la fin de la phase de test. Sans engagement, résiliable à tout moment.'}
            </p>

            <SectionLabel className="mb-2.5">Inclus</SectionLabel>
            <ul className="flex flex-col gap-2.5">
              {INCLUS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[12.5px] text-ink-muted">
                  <IconCheck size={15} className="mt-px shrink-0 text-mastered" />
                  {item}
                </li>
              ))}
            </ul>

            <SectionLabel className="mb-2.5 mt-6">Facturé séparément</SectionLabel>
            <ul className="flex flex-col gap-3">
              {NON_INCLUS.map((item) => (
                <li key={item.titre} className="rounded-xl border border-divider px-3.5 py-3">
                  <p className="text-[13px] font-semibold text-ink">{item.titre}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-subtle">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex flex-col gap-5">
            <Card>
              <CardTitle>Calendrier</CardTitle>
              <ol className="flex flex-col divide-y divide-divider">
                <Etape
                  titre="Aujourd’hui"
                  detail="Phase de test. Accès complet, gratuit, sans moyen de paiement."
                />
                <Etape
                  titre="Fin de la phase de test"
                  detail="Ouverture de l’abonnement. Vous serez prévenu avant, et libre de ne pas continuer."
                />
                <Etape
                  titre="Ensuite"
                  detail="Résiliation en un clic depuis cette page, sans pénalité."
                />
              </ol>
            </Card>

            <Card tone="flat">
              <CardTitle>Une question sur le tarif</CardTitle>
              <p className="text-[12.5px] leading-relaxed text-ink-subtle">
                Écrivez-nous, on répond. C’est aussi le bon moment pour nous dire si ce prix vous
                parait juste.
              </p>
              <p className="mt-3 text-[13px] font-medium text-ink">gauthier.marre40@gmail.com</p>
            </Card>
          </div>
        </div>
      </PageBody>
    </AppShell>
  )
}

function Etape({ titre, detail }: { titre: string; detail: string }) {
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <p className="text-[13px] font-semibold leading-snug text-ink">{titre}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-subtle">{detail}</p>
    </li>
  )
}
