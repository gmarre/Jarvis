import { useSession } from '@/state/session'
import { IconClose } from '@/components/ui/icons'

// Bandeau d'echec d'enregistrement.
//
// L'etat local avance avant la confirmation du serveur : c'est ce qui rend
// l'application vive. Le revers, c'est qu'une ecriture qui echoue laisse l'eleve
// croire que son travail est enregistre alors qu'il est perdu.
//
// Ce bandeau existe pour ne jamais lui mentir. Il est volontairement place au
// dessus de tout, non masquable par le contenu, et il explique quoi faire.
// On ne retire pas l'avancement affiche : le lui reprendre sous les yeux serait
// pire que de l'avertir.

export function SyncErrorBanner() {
  const { syncError, dismissSyncError } = useSession()

  if (!syncError) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-50 border-b border-wrong-600/30 bg-red-50 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]"
    >
      <div className="mx-auto flex w-full max-w-[1180px] items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-wrong-600 text-[12px] font-bold leading-none text-white"
        >
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-wrong-600">
            {syncError.message}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
            {/* Un refus de regle n'est pas une panne : envoyer l'eleve verifier
                son wifi lui ferait chercher un probleme qui n'existe pas. */}
            {syncError.refus
              ? "Rien n'a été enregistré, et ta connexion n'est pas en cause."
              : 'Vérifie ta connexion, puis recharge la page pour repartir de ce qui est réellement enregistré.'}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissSyncError}
          aria-label="Masquer l'avertissement"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-wrong-600 transition hover:bg-red-100"
        >
          <IconClose size={16} />
        </button>
      </div>
    </div>
  )
}
