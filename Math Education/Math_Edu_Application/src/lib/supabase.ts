import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Les cles vivent dans .env.local en local (gitignore) et dans les Variables
// d'environnement de Netlify/Vercel au deploiement. Voir CLAUDE.md, section
// "Variables d'environnement et deploiement".
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Indique si le backend est configure. Permet a l'app (Hello World inclus) de
// tourner sans cles au tout debut du projet.
export const isSupabaseConfigured = Boolean(url && anonKey)

// Client unique reutilisable. Reste null tant que les cles ne sont pas fournies,
// pour eviter un crash au demarrage. A remplacer par un client non-null une fois
// l'auth Supabase mise en place (Jalon 2).
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null
