import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { LoadingScreen } from '@/components/ui/Misc'
import { SyncErrorBanner } from '@/components/layout/SyncErrorBanner'
import { isProfileComplete } from '@/data'
import { useSession } from '@/state/session'
import type { UserRole } from '@/types/domain'

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
const ParentPage = lazy(() => import('@/pages/ParentPage'))
const SubscriptionPage = lazy(() => import('@/pages/SubscriptionPage'))
const WelcomePage = lazy(() => import('@/pages/WelcomePage'))
const RecettePage = lazy(() => import('@/pages/RecettePage'))

/** Accueil propre a chaque role. */
function homeFor(role: UserRole): string {
  if (role === 'prof') return '/prof/cours'
  if (role === 'parent') return '/parent'
  return '/travail'
}

/**
 * Ecran reserve aux comptes connectes, et optionnellement a certains roles.
 *
 * Etre connecte ne suffit pas : sans le controle de role, un eleve pouvait
 * ouvrir /prof/cours en tapant l'URL. Un role qui n'a rien a faire sur un ecran
 * est renvoye vers son propre accueil, pas vers une page d'erreur.
 */
function RequireAuth({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { status, session } = useSession()
  const location = useLocation()

  if (status === 'loading') return <LoadingScreen label="Ouverture de ton espace…" />
  if (status === 'anonymous' || !session) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  }
  // Un compte eleve arrive sans niveau scolaire ni date de naissance, qu'il
  // vienne de Google ou de l'inscription par email :
  // on ne peut ni construire son parcours, ni appliquer la regle des 15 ans.
  // Tout le reste attend.
  if (!isProfileComplete(session.profile)) {
    return <Navigate to="/bienvenue" replace />
  }
  if (roles && !roles.includes(session.profile.role)) {
    return <Navigate to={homeFor(session.profile.role)} replace />
  }
  return <>{children}</>
}

/** Accueil : chaque role atterrit dans son espace, jamais dans celui d'un autre. */
function HomeRedirect() {
  const { status, session } = useSession()

  if (status === 'loading') return <LoadingScreen label="Ouverture de ton espace…" />
  if (status === 'anonymous' || !session) return <Navigate to="/connexion" replace />
  if (!isProfileComplete(session.profile)) return <Navigate to="/bienvenue" replace />
  return <Navigate to={homeFor(session.profile.role)} replace />
}

const ELEVE: UserRole[] = ['eleve']
const PROF: UserRole[] = ['prof']
const PARENT: UserRole[] = ['parent']

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SyncErrorBanner />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/bienvenue" element={<WelcomePage />} />

        {/* Espace eleve */}
        <Route
          path="/test"
          element={
            <RequireAuth roles={ELEVE}>
              <PlacementTestPage />
            </RequireAuth>
          }
        />
        <Route
          path="/travail"
          element={
            <RequireAuth roles={ELEVE}>
              <WorkspacePage />
            </RequireAuth>
          }
        />
        <Route
          path="/parcours"
          element={
            <RequireAuth roles={ELEVE}>
              <PathPage />
            </RequireAuth>
          }
        />
        <Route
          path="/exercice/:skillId"
          element={
            <RequireAuth roles={ELEVE}>
              <ExercisePage />
            </RequireAuth>
          }
        />
        {/* Recette du contenu : la page verifie elle-meme que le compte est relecteur. */}
        <Route
          path="/recette"
          element={
            <RequireAuth roles={ELEVE}>
              <RecettePage />
            </RequireAuth>
          }
        />
        <Route
          path="/cartes"
          element={
            <RequireAuth roles={ELEVE}>
              <MindmapListPage />
            </RequireAuth>
          }
        />
        <Route
          path="/cartes/:mindmapId"
          element={
            <RequireAuth roles={ELEVE}>
              <MindmapPage />
            </RequireAuth>
          }
        />
        <Route
          path="/cours"
          element={
            <RequireAuth roles={ELEVE}>
              <SchedulePage />
            </RequireAuth>
          }
        />

        {/* Espace professeur */}
        <Route
          path="/prof/cours"
          element={
            <RequireAuth roles={PROF}>
              <TeacherSchedulePage />
            </RequireAuth>
          }
        />

        {/* Espace parent */}
        <Route
          path="/parent"
          element={
            <RequireAuth roles={PARENT}>
              <ParentPage />
            </RequireAuth>
          }
        />

        {/* Commun */}
        <Route
          path="/abonnement"
          element={
            <RequireAuth>
              <SubscriptionPage />
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
