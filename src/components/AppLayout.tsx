import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth, type Role } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { SyncIndicator } from '@/components/SyncIndicator'
import { startSync } from '@/offline/sync/scheduler'
import { cn } from '@/lib/utils'

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Estudiante',
  TUTOR: 'Tutor',
  COMPANY: 'Empresa',
  COORDINATOR: 'Coordinador',
}

interface NavItem {
  path: string
  label: string
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  STUDENT: [
    { path: '/mi-practica', label: 'Mi práctica' },
    { path: '/horas', label: 'Horas' },
    { path: '/documentos', label: 'Documentos' },
    { path: '/ofertas', label: 'Ofertas' },
    { path: '/postulaciones', label: 'Mis postulaciones' },
  ],
  TUTOR: [{ path: '/practicantes', label: 'Mis practicantes' }],
  COMPANY: [{ path: '/ofertas-empresa', label: 'Mis ofertas' }],
  COORDINATOR: [{ path: '/acreditacion', label: 'Acreditación' }],
}

export function AppLayout() {
  const { user, role, logout } = useAuth()

  // Se llama una sola vez para toda la sesión autenticada: AppLayout envuelve
  // todas las rutas protegidas vía <Outlet />, así que no se remonta al
  // navegar entre pantallas y no se crean timers duplicados.
  useEffect(() => {
    return startSync()
  }, [])

  const navItems = role ? NAV_BY_ROLE[role] : []

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-paperRule bg-surface">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <div className="flex flex-col leading-tight">
            <span className="font-display text-16 text-ink">{user?.fullName}</span>
            <span className="font-data text-12 uppercase text-inkSoft">
              {role ? ROLE_LABEL[role] : ''}
            </span>
          </div>

          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Navegación principal">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'border-b-2 border-transparent py-1 font-display text-14 text-inkSoft hover:text-ink',
                    isActive && 'border-stamp text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex flex-wrap items-center gap-4">
            <SyncIndicator />
            <Button type="button" variant="outline" size="sm" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
