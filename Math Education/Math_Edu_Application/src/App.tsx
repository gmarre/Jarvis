import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { LoadingScreen } from '@/components/ui/Misc'
import { useSession } from '@/state/session'

import LoginPage from '@/pages/LoginPage'
import WorkspacePage from '@/pages/WorkspacePage'

// Les ecrans qui embarquent une grosse dependance sont charges a la demande :
// react-flow pour le graphe, markmap pour les cartes mentales. La majorite du
// trafic sera mobile, le premier chargement doit rester leger.
const PathPage = lazy(() => import('@/pages/PathPage'))
const MindmapPage = lazy(() => import('@/pages/MindmapPage'))
const MindmapListPage = lazy(() => import('@/pages/MindmapListPage'))
const ExercisePage = lazy(() => import('@/pages/ExercisePage'))
const PlacementTestPage = lazy(() => import('@/pages/PlacementTestPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SchedulePage = lazy(() => import('@/pages/SchedulePage'))
const TeacherSchedulePage = lazy(() => import('@/pages/TeacherSchedulePage'))

/** Ecran reserve aux comptes connectes. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'loading') return <LoadingScreen label="Ouverture de ton espace…" />
  if (status === 'anonymous') {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

/** Accueil : l'eleve va sur son espace de travail, le professeur sur ses creneaux. */
function HomeRedirect() {
  const { status, session } = useSession()

  if (status === 'loading') return <LoadingScreen label="Ouverture de ton espace…" />
  if (status === 'anonymous' || !session) return <Navigate to="/connexion" replace />
  return <Navigate to={session.profile.role === 'prof' ? '/prof/cours' : '/travail'} replace />
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/connexion" element={<LoginPage />} />

        <Route
          path="/test"
          element={
            <RequireAuth>
              <PlacementTestPage />
            </RequireAuth>
          }
        />
        <Route
          path="/travail"
          element={
            <RequireAuth>
              <WorkspacePage />
            </RequireAuth>
          }
        />
        <Route
          path="/parcours"
          element={
            <RequireAuth>
              <PathPage />
            </RequireAuth>
          }
        />
        <Route
          path="/exercice/:skillId"
          element={
            <RequireAuth>
              <ExercisePage />
            </RequireAuth>
          }
        />
        <Route
          path="/cartes"
          element={
            <RequireAuth>
              <MindmapListPage />
            </RequireAuth>
          }
        />
        <Route
          path="/cartes/:mindmapId"
          element={
            <RequireAuth>
              <MindmapPage />
            </RequireAuth>
          }
        />
        <Route
          path="/cours"
          element={
            <RequireAuth>
              <SchedulePage />
            </RequireAuth>
          }
        />
        <Route
          path="/prof/cours"
          element={
            <RequireAuth>
              <TeacherSchedulePage />
            </RequireAuth>
          }
        />
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
