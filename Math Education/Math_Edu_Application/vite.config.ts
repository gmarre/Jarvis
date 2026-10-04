import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Les dependances lourdes et stables sortent du chunk applicatif : elles
        // restent en cache d'un deploiement a l'autre, alors que le code de l'app
        // change a chaque livraison.
        //
        // Note de poids : supabase-js pese a lui seul environ 220 ko non
        // compresses, dont un client realtime que l'application n'utilise pas.
        // Reduire ca demanderait d'importer @supabase/auth-js et
        // @supabase/postgrest-js separement, au prix d'une API moins standard.
        // A trancher au sprint 4, quand la cible Lighthouse et le test sur
        // telephone reel seront au programme.
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  // Les tests portent sur le moteur (DAG, positionnement, correction), qui est
  // du TypeScript pur : pas besoin de DOM simule.
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Installe le contenu local avant chaque fichier de test (voir le fichier).
    setupFiles: ['src/testSetup.ts'],
  },
})
