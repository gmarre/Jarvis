// Selection du repository actif.
//
// Aujourd'hui : donnees factices. Au branchement de Supabase (Jalon 2), on
// remplace la ligne ci-dessous par le repository Supabase, apres avoir cree les
// tables et les politiques RLS. Les ecrans, eux, ne changent pas.
//
//   export const repository: DataRepository = isSupabaseConfigured
//     ? supabaseRepository
//     : mockRepository

import { mockRepository } from './mockRepository'
import type { DataRepository } from './repository'

export const repository: DataRepository = mockRepository

export type { Catalog, Session, SignUpInput, DataRepository } from './repository'
