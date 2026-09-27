import type { SVGProps } from 'react'

// Jeu d'icones minimal, dessine a la main pour rester dans le trait de Studio
// Clair : traits de 1,6px, angles arrondis, aucune icone pleine. Une librairie
// entiere serait du poids inutile pour la quinzaine de symboles necessaires.

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Espace de travail : la cible du jour. */
export const IconWorkspace = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </Icon>
)

/** Mon parcours : trois noeuds relies, le DAG en miniature. */
export const IconPath = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="6" cy="18" r="2.6" />
    <circle cx="12" cy="7" r="2.6" />
    <circle cx="18.5" cy="16" r="2.6" />
    <path d="M7.4 15.7 10.7 9.4M13.9 8.9l3.3 4.8" />
  </Icon>
)

/** Cartes memoire : une pile de cartes. */
export const IconCards = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="7.5" width="13" height="13" rx="2.6" />
    <path d="M7.5 4.5h10a3 3 0 0 1 3 3v9" />
  </Icon>
)

export const IconCalendar = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="5.5" width="17" height="15" rx="2.6" />
    <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
  </Icon>
)

export const IconUser = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
  </Icon>
)

export const IconCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
)

export const IconClose = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const IconChevronRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
)

export const IconChevronLeft = (props: IconProps) => (
  <Icon {...props}>
    <path d="m15 5-7 7 7 7" />
  </Icon>
)

export const IconArrowLeft = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
)

export const IconArrowRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)

export const IconLock = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.4" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Icon>
)

export const IconClock = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
)

export const IconPlus = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const IconMinus = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
)

/** Ampoule : indice d'exercice. */
export const IconHint = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9.5 18h5M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9V16h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3Z" />
  </Icon>
)

/** Flamme : serie de jours consecutifs. */
export const IconStreak = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3s4.5 3.6 4.5 8a4.5 4.5 0 0 1-9 0c0-1.4.5-2.6 1.2-3.6.3 1 .9 1.8 1.8 2.1C11 8 12 5.4 12 3Z" />
  </Icon>
)

/** Video : le cours a lieu en visio. */
export const IconVideo = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="6.5" width="12.5" height="11" rx="2.4" />
    <path d="m15.5 11 5.5-3v8l-5.5-3z" />
  </Icon>
)

/** Carte mentale : un noeud central et ses branches. */
export const IconMindmap = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2.5" y="9.5" width="6" height="5" rx="1.8" />
    <rect x="15.5" y="4" width="6" height="5" rx="1.8" />
    <rect x="15.5" y="15" width="6" height="5" rx="1.8" />
    <path d="M8.5 12h3.5v-5.5h3.5M12 12v5.5h3.5" />
  </Icon>
)

/**
 * Logo Google, pour le bouton de connexion.
 *
 * Seule icone du jeu a etre pleine et multicolore : les regles de marque de
 * Google imposent le logo officiel dans ses quatre couleurs, on ne le redessine
 * pas au trait comme les autres. Elle n'herite donc ni de `stroke` ni de
 * `currentColor`, et ne passe pas par le composant Icon.
 */
export const GoogleMark = ({ size = 18, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    aria-hidden
    focusable="false"
    {...props}
  >
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H1v2.34A8.997 8.997 0 0 0 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.11-1.17.29-1.71V4.96H1A8.997 8.997 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A8.997 8.997 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
    />
  </svg>
)
