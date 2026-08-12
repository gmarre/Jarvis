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

        // Accent produit
        accent: {
          50: '#EEF2FF',
          100: '#DDD9F7',
          200: '#C7D2FE',
          300: '#818CF8',
          DEFAULT: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
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
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        panel: '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.04)',
        panel: '0 1px 2px rgba(15,23,42,.04), 0 12px 32px rgba(15,23,42,.05)',
        focus: '0 0 0 4px rgba(99,102,241,.12)',
        accent: '0 8px 22px rgba(99,102,241,.14)',
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
