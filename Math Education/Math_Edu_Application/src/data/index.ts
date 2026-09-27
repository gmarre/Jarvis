// Selection du repository actif.
//
// Supabase des que les cles sont presentes, sinon le mock. Ce basculement
// automatique a deux vertus : l'application tourne sans backend (demonstration,
// premiere prise en main, tests), et un oubli de variables d'environnement au
// deploiement se voit immediatement puisque l'app repart en mode demonstration
// au lieu de planter.
//
// Forcer le mock malgre des cles presentes : VITE_USE_MOCK=true dans .env.local.
// Utile pour faire une demonstration sans toucher aux vraies donnees.

import { isSupabaseConfigured } from '@/lib/supabase'
import { mockRepository } from './mockRepository'
import { supabaseRepository } from './supabaseRepository'
import type { DataRepository } from './repository'

const forcerMock = import.meta.env.VITE_USE_MOCK === 'true'

export const useMockData = forcerMock || !isSupabaseConfigured

export const repository: DataRepository = useMockData ? mockRepository : supabaseRepository

export type {
  Catalog,
  DataRepository,
  NewSlot,
  ProfileCompletion,
  Session,
  SignUpInput,
} from './repository'
export { RepositoryError, isProfileComplete } from './repository'
