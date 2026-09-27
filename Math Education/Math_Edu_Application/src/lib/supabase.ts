import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Les cles vivent dans .env.local en local (gitignore) et dans les Variables
// d'environnement de Netlify au deploiement. Voir CLAUDE.md, section
// "Variables d'environnement et deploiement".
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Indique si le backend est configure. */
export const isSupabaseConfigured = Boolean(url && anonKey)

// Client unique reutilisable. Reste null tant que les cles ne sont pas
// fournies, pour que l'application tourne en mode demonstration sans backend.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        // La session survit a un rechargement, et le jeton se rafraichit seul.
        persistSession: true,
        autoRefreshToken: true,
        // Necessaire au retour de redirection Google : le jeton arrive dans
        // l'URL et doit etre capte au chargement de la page.
        detectSessionInUrl: true,
      },
    })
  : null

/**
 * Client garanti non-null, pour le repository Supabase.
 *
 * Leve plutot que de rendre null : si on arrive ici sans cles, c'est une erreur
 * de configuration du deploiement (le piege n1 de CLAUDE.md section 5bis), et
 * elle doit etre bruyante et non silencieuse.
 */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase non configure : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquent. ' +
        'En local, les renseigner dans .env.local. En ligne, dans les Variables ' +
        "d'environnement de l'hebergeur.",
    )
  }
  return supabase
}
