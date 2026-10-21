/** @type {import('tailwindcss').Config} */

// Direction artistique "Studio Clair" (cf. Brief_Design_MVP.md et maquettes
// Claude Design). Regle de fond : la couleur porte un etat de maitrise, jamais
// une decoration. Toute nouvelle couleur doit se justifier ici avant d'arriver
// dans un composant.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fonds et surfaces
        canvas: '#FAFAF8', // fond d'application
        surface: '#FFFFFF', // cartes, panneaux
        muted: '#F1F0EC', // fond secondaire, boutons neutres
        line: '#E2E0D9', // bordure de carte
        divider: '#EDEAE3', // separateur interne, plus discret

        // Encre
        ink: {
          DEFAULT: '#0F172A', // titres, texte fort
          soft: '#334155',
          muted: '#475569', // corps de texte
          subtle: '#64748B', // texte secondaire
          faint: '#94A3B8', // meta, legendes
        },

        // Accent produit : le bleu du logo (#0265C8), adopte le 19 octobre
        // 2026 a la place de l'indigo #6366F1. Contrastes : blanc sur accent
        // 5,7 ; accent sur canvas 5,4 ; accent-700 sur accent-50 7,9 (AA).
        // L'orange, le jaune, le vert et le bleu ciel du logo ne servent qu'en
        // decor (jetons brand) : aucun n'atteint 4,5 sur fond blanc.
        accent: {
          50: '#EAF3FC',
          100: '#D3E5F8',
          200: '#A9CDF1',
          300: '#5C9FE2',
          DEFAULT: '#0265C8',
          600: '#0257AD',
          700: '#034A8F',
        },

        // Couleurs du logo, decor seulement (jamais pour du texte).
        brand: {
          pi: '#F8B810',
          vert: '#91D94F',
          orange: '#FC7243',
          ciel: '#88D0F8',
          jaune: '#FCD05A',
        },

        // Etats de maitrise : le coeur du langage visuel
        mastered: {
          50: '#ECFDF5',
          200: '#A7F3D0',
          DEFAULT: '#10B981',
          700: '#047857',
          900: '#065F46',
        },
        progress: {
          50: '#FFFBEB',
          200: '#FDE68A',
          DEFAULT: '#F59E0B',
          700: '#B45309',
          900: '#92400E',
        },
        locked: {
          50: '#F8FAFC',
          200: '#CBD5E1',
          DEFAULT: '#94A3B8',
        },
        wrong: {
          DEFAULT: '#EF4444',
          600: '#DC2626',
        },
      },
      fontFamily: {
        // Titres : serif douce. UI et corps de texte : Inter.
        display: ['Fraunces Variable', 'Fraunces', 'Georgia', 'serif'],
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        panel: '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.04)',
        panel: '0 1px 2px rgba(15,23,42,.04), 0 12px 32px rgba(15,23,42,.05)',
        focus: '0 0 0 4px rgba(2,101,200,.14)',
        accent: '0 8px 22px rgba(2,101,200,.16)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up .28s ease-out both',
        'fade-in': 'fade-in .2s ease-out both',
      },
    },
  },
  plugins: [],
}
