import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Card, CardTitle, SectionLabel } from '@/components/ui/Card'
import { Notice } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { IconCheck } from '@/components/ui/icons'
import { useAuthenticatedSession } from '@/state/session'

// Espace parent.
//
// Le role "parent" etait propose a l'inscription mais n'avait aucun ecran : un
// parent atterrissait dans l'espace eleve et se voyait proposer un test de
// positionnement de mathematiques. Cette page ferme ce trou.
//
// Le contenu reel (suivi de l'enfant, consentement, export RGPD, resume hebdo)
// arrive au sprint 5 : il suppose le rattachement parent/enfant en base, donc
// Supabase. En attendant on dit ou en est chaque brique, plutot que d'afficher
// des cartes vides ou de promettre ce qui n'existe pas.

interface Section {
  titre: string
  description: string
}

const SECTIONS: Section[] = [
  {
    titre: 'Suivi de mon enfant',
    description:
      'Sa progression par domaine, la compétence sur laquelle il travaille, sa dernière connexion. En lecture seule, sans note ni classement.',
  },
  {
    titre: 'Consentement',
    description:
      'Donner ou retirer votre accord, et consulter la liste exacte des données collectées et de leur usage.',
  },
  {
    titre: 'Mes données',
    description:
      'Exporter ou supprimer définitivement le compte de votre enfant, à tout moment et sans justification.',
  },
  {
    titre: 'Résumé hebdomadaire',
    description:
      'Un point par email chaque semaine, et une alerte si votre enfant décroche.',
  },
]

export default function ParentPage() {
  const { session, signOut } = useAuthenticatedSession()
  const { profile } = session

  return (
    <AppShell>
      <PageBody className="max-w-[820px]">
        <PageHeader
          title={`Bonjour ${profile.prenom}`}
          subtitle="Votre espace parent est en construction. Voici ce qu'il contiendra, et où en est chaque brique."
        />

        <Notice tone="progress" icon="!" className="mb-5">
          Aucun enfant n'est encore rattaché à votre compte. Le rattachement se fera par le lien de
          confirmation envoyé à votre adresse lors de l'inscription de votre enfant. Cet envoi
          arrive au prochain jalon.
        </Notice>

        <Card>
          <CardTitle>Ce que vous pourrez faire ici</CardTitle>
          <ul className="flex flex-col divide-y divide-divider">
            {SECTIONS.map((section) => (
              <li key={section.titre} className="flex gap-3.5 py-4 first:pt-0 last:pb-0">
                <span
                  aria-hidden
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-ink-faint"
                >
                  <IconCheck size={12} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-snug text-ink">
                    {section.titre}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-subtle">
                    {section.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="mt-5">
          <CardTitle>Vos droits, dès maintenant</CardTitle>
          <p className="text-[12.5px] leading-relaxed text-ink-subtle">
            En dessous de 15 ans, le compte de votre enfant nécessite votre accord. Vous pouvez le
            retirer et demander la suppression du compte à tout moment, par simple demande à
            l'adresse ci-dessous, sans avoir à vous justifier. Les données sont hébergées dans
            l'Union européenne et limitées à ce qui sert le suivi pédagogique.
          </p>
          <SectionLabel className="mb-2 mt-5">Nous écrire</SectionLabel>
          <p className="text-[13px] font-medium text-ink">gauthier.marre40@gmail.com</p>
        </Card>

        <Card tone="flat" className="mt-5">
          <p className="mb-3 text-[12.5px] leading-relaxed text-ink-subtle">
            Connecté en tant que {profile.email}.
          </p>
          <Button variant="secondary" onClick={() => void signOut()}>
            Se déconnecter
          </Button>
        </Card>
      </PageBody>
    </AppShell>
  )
}
