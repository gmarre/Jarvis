import { NavLink, useLocation } from 'react-router-dom'
import type { ComponentType, ReactNode, SVGProps } from 'react'

import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'
import { useSession } from '@/state/session'
import { Avatar, Level } from '@/components/ui/Misc'
import {
  IconCalendar,
  IconCards,
  IconPath,
  IconStreak,
  IconUser,
  IconWorkspace,
} from '@/components/ui/icons'

// Coquille de navigation : rail lateral en desktop, barre du bas au pouce en
// mobile (maquettes 1f, 1h, 1l, 1n). Un seul composant pour les deux, la
// navigation ne doit pas diverger entre les deux surfaces.

interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
}

const STUDENT_NAV: NavItem[] = [
  { to: '/travail', label: 'Espace de travail', shortLabel: 'Travail', icon: IconWorkspace },
  { to: '/parcours', label: 'Mon parcours', shortLabel: 'Parcours', icon: IconPath },
  { to: '/cartes', label: 'Cartes mémoire', shortLabel: 'Cartes', icon: IconCards },
  { to: '/cours', label: 'Cours particuliers', shortLabel: 'Cours', icon: IconCalendar },
  { to: '/profil', label: 'Mon profil', shortLabel: 'Profil', icon: IconUser },
]

const TEACHER_NAV: NavItem[] = [
  { to: '/prof/cours', label: 'Mes créneaux', shortLabel: 'Créneaux', icon: IconCalendar },
  { to: '/profil', label: 'Mon profil', shortLabel: 'Profil', icon: IconUser },
]

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-lg font-semibold leading-none text-ink', className)}>
      Racine
    </span>
  )
}

interface AppShellProps {
  children: ReactNode
  /** Encart place juste sous la navigation (filtres, domaines). */
  railTop?: ReactNode
  /** Encart cale en bas du rail lateral (serie de jours, rappel). */
  railBottom?: ReactNode
}

export function AppShell({ children, railTop, railBottom }: AppShellProps) {
  const { session } = useSession()
  const location = useLocation()
  const profile = session?.profile
  const nav = profile?.role === 'prof' ? TEACHER_NAV : STUDENT_NAV
  const current = nav.find((item) => location.pathname.startsWith(item.to))

  return (
    <div className="flex min-h-full bg-canvas">
      {/* Rail lateral, desktop uniquement */}
      <nav
        aria-label="Navigation principale"
        className="hidden w-[232px] shrink-0 flex-col border-r border-divider bg-surface px-4 py-6 lg:flex"
      >
        <Wordmark className="px-2.5 pb-6" />
        <ul className="flex flex-col gap-0.5">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] transition-colors',
                    isActive
                      ? 'bg-accent-50 font-semibold text-accent-700'
                      : 'font-medium text-ink-muted hover:bg-muted',
                  )
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        {railTop && <div className="mt-7 px-2.5">{railTop}</div>}
        <div className="flex-1" />
        {railBottom}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* En-tete mobile */}
        <header className="flex items-center justify-between border-b border-divider bg-surface px-5 py-3.5 lg:hidden">
          <Wordmark className="text-base" />
          {profile && (
            <div className="flex items-center gap-2.5">
              {profile.niveau_scolaire && (
                <span className="rounded-[10px] border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted">
                  <Level value={profile.niveau_scolaire} />
                </span>
              )}
              <Avatar initials={initials(profile.prenom, profile.nom)} size="sm" />
            </div>
          )}
        </header>

        <main className="flex-1 pb-[86px] lg:pb-0">{children}</main>

        {/* Barre du bas, mobile uniquement */}
        <nav
          aria-label="Navigation principale"
          className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-divider bg-surface px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-2.5 lg:hidden"
        >
          {nav.map((item) => {
            const isActive = current?.to === item.to
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-[52px] w-full max-w-[76px] flex-col items-center justify-center gap-1.5 rounded-xl transition-colors',
                  isActive ? 'text-accent-700' : 'text-ink-faint',
                )}
              >
                <item.icon size={21} strokeWidth={isActive ? 2 : 1.6} />
                <span className={cn('text-[10.5px] leading-none', isActive ? 'font-semibold' : 'font-medium')}>
                  {item.shortLabel}
                </span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

/** Encart "serie de N jours" du bas de rail (maquette 1f). */
export function StreakCard({ days }: { days: number }) {
  return (
    <div className="rounded-card border border-divider bg-canvas p-3.5">
      <div className="mb-1 flex items-center gap-2 text-[12.5px] font-semibold leading-snug text-ink">
        <IconStreak size={16} className="text-progress" />
        Série de {days} jours
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-subtle">
        Reviens demain pour tenir le rythme.
      </p>
    </div>
  )
}

/** En-tete de page : titre serif, sous-titre, actions a droite. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
      <div>
        <h1 className="font-display text-[26px] font-medium leading-tight tracking-[-0.015em] text-ink sm:text-[28px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-subtle">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}

/** Conteneur de page : marges et largeur maximale communes a tous les ecrans. */
export function PageBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1180px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8', className)}>
      {children}
    </div>
  )
}
