// Couleurs pour les rendus qui ne passent pas par une classe Tailwind
// (traits SVG du graphe, branches des cartes mentales, dégradé conique).
//
// Miroir exact des jetons de tailwind.config.js : une couleur changée là-bas
// se change ici, sinon le graphe garderait l'ancienne palette (c'est arrivé
// lors du passage de l'indigo au bleu du logo, le 19 octobre 2026).

export const COULEURS = {
  ink: '#0F172A',
  accent: '#0265C8',
  accent700: '#034A8F',
  mastered: '#10B981',
  progress: '#F59E0B',
  locked200: '#CBD5E1',
  wrong: '#EF4444',
  line: '#E2E0D9',
  divider: '#EDEAE3',
} as const
