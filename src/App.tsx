import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, type Role, useAuth } from '@/auth/AuthContext'
import { RequireRole } from '@/auth/RequireRole'
import { AppLayout } from '@/components/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { HourLogsPage } from '@/pages/HourLogsPage'
import { MyPlacementPage } from '@/pages/MyPlacementPage'
import { OffersPage } from '@/pages/OffersPage'
import { OfferDetailPage } from '@/pages/OfferDetailPage'
import { MyApplicationsPage } from '@/pages/MyApplicationsPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { Placeholder } from '@/pages/Placeholder'

const ALL_ROLES: Role[] = ['STUDENT', 'TUTOR', 'COMPANY', 'COORDINATOR']

const HOME_BY_ROLE: Record<Role, string> = {
  STUDENT: '/mi-practica',
  TUTOR: '/practicantes',
  COMPANY: '/ofertas-empresa',
  COORDINATOR: '/acreditacion',
}

interface RouteDef {
  path: string
  roles: Role[]
  name: string
  element?: ReactNode
}

const ROUTES: RouteDef[] = [
  { path: '/ofertas', roles: ['STUDENT'], name: 'Ofertas', element: <OffersPage /> },
  { path: '/ofertas/:id', roles: ['STUDENT'], name: 'Detalle de oferta', element: <OfferDetailPage /> },
  { path: '/postulaciones', roles: ['STUDENT'], name: 'Postulaciones', element: <MyApplicationsPage /> },
  { path: '/mi-practica', roles: ['STUDENT'], name: 'Mi práctica', element: <MyPlacementPage /> },
  { path: '/horas', roles: ['STUDENT'], name: 'Horas', element: <HourLogsPage /> },
  { path: '/documentos', roles: ['STUDENT'], name: 'Documentos', element: <DocumentsPage /> },
  { path: '/practicantes', roles: ['TUTOR'], name: 'Practicantes' },
  { path: '/practicantes/:id/horas', roles: ['TUTOR'], name: 'Horas del practicante' },
  { path: '/practicantes/:id/evaluar', roles: ['TUTOR'], name: 'Evaluar practicante' },
  { path: '/ofertas-empresa', roles: ['COMPANY'], name: 'Ofertas de la empresa' },
  { path: '/ofertas-empresa/:id/postulaciones', roles: ['COMPANY'], name: 'Postulaciones a la oferta' },
  { path: '/acreditacion', roles: ['COORDINATOR'], name: 'Acreditación' },
]

function HomeRedirect() {
  const { role } = useAuth()
  return <Navigate to={role ? HOME_BY_ROLE[role] : '/login'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireRole roles={ALL_ROLES}>
            <AppLayout />
          </RequireRole>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        {ROUTES.map(({ path, roles, name, element }) => (
          <Route
            key={path}
            path={path}
            element={<RequireRole roles={roles}>{element ?? <Placeholder name={name} />}</RequireRole>}
          />
        ))}
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
