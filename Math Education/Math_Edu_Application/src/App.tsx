import { isSupabaseConfigured } from '@/lib/supabase'

function App() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-6 bg-brand-50 px-6 text-center">
      <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
        MVP en construction
      </span>

      <h1 className="text-4xl font-bold text-brand-700 sm:text-5xl">
        Hello World, MATH EDUCATION
      </h1>

      <p className="max-w-md text-lg text-slate-600">
        On trouve exactement ou ca bloque, et on debloque. Base technique prete
        pour la suite du projet.
      </p>

      <p className="text-sm text-slate-500">
        Backend Supabase :{' '}
        {isSupabaseConfigured ? (
          <span className="font-medium text-green-600">configure</span>
        ) : (
          <span className="font-medium text-amber-600">
            non configure (renseignez .env.local)
          </span>
        )}
      </p>
    </main>
  )
}

export default App
