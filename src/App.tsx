import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, type Role, useAuth } from '@/auth/AuthContext'
import { RequireRole } from '@/auth/RequireRole'
import { LoginPage } from '@/pages/LoginPage'
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
}

const ROUTES: RouteDef[] = [
  { path: '/ofertas', roles: ['STUDENT'], name: 'Ofertas' },
  { path: '/ofertas/:id', roles: ['STUDENT'], name: 'Detalle de oferta' },
  { path: '/postulaciones', roles: ['STUDENT'], name: 'Postulaciones' },
  { path: '/mi-practica', roles: ['STUDENT'], name: 'Mi práctica' },
  { path: '/horas', roles: ['STUDENT'], name: 'Horas' },
  { path: '/documentos', roles: ['STUDENT'], name: 'Documentos' },
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
        path="/"
        element={
          <RequireRole roles={ALL_ROLES}>
            <HomeRedirect />
          </RequireRole>
        }
      />
      {ROUTES.map(({ path, roles, name }) => (
        <Route
          key={path}
          path={path}
          element={
            <RequireRole roles={roles}>
              <Placeholder name={name} />
            </RequireRole>
          }
        />
      ))}
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
