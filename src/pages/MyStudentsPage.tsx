import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Ledger } from '@/components/ledger/Ledger'
import { db, type LocalPlacement } from '@/offline/db'

interface StudentRow {
  placement: LocalPlacement
  approvedHours: number
  submittedHours: number
}

function LedgerColumnHeader() {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 font-display text-12 uppercase tracking-wide text-inkSoft sm:flex-row sm:items-center sm:gap-3">
      <span className="sm:w-32">Estudiante</span>
      <span className="flex-1">Empresa</span>
      <span className="sm:w-44">Progreso de horas</span>
      <span className="sm:w-32 sm:text-right">Horas por revisar</span>
    </div>
  )
}

/**
 * Cola de trabajo del tutor: sus placements con el conteo de horas
 * pendientes de revisión por estudiante. Lee de Dexie, no de la red — tiene
 * que funcionar sin señal, igual que el resto de la app.
 */
export function MyStudentsPage() {
  const { user } = useAuth()

  const rows = useLiveQuery<StudentRow[] | undefined>(async () => {
    if (!user) return undefined
    const placements = await db.placements.where('tutorId').equals(user.id).toArray()
    return Promise.all(
      placements.map(async (placement) => {
        const logs = await db.hourLogs.where('placementId').equals(placement.id).toArray()
        let approvedHours = 0
        let submittedHours = 0
        for (const log of logs) {
          if (log.status === 'APPROVED') approvedHours += log.hours
          if (log.status === 'SUBMITTED') submittedHours += log.hours
        }
        return { placement, approvedHours, submittedHours }
      }),
    )
  }, [user?.id])

  if (rows === undefined) {
    return <p className="font-display text-16 text-inkSoft">Cargando tus practicantes…</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-20 text-ink">Mis practicantes</h1>

      <div className="border border-paperRule bg-surface">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="font-display text-16 text-ink">Todavía no tienes practicantes asignados</p>
          </div>
        ) : (
          <Ledger header={<LedgerColumnHeader />}>
            {rows.map(({ placement, approvedHours, submittedHours }) => {
              const requiredHours = placement.requiredHours
              const approvedPct = requiredHours > 0 ? Math.min(100, (approvedHours / requiredHours) * 100) : 0
              return (
                <Link
                  key={placement.id}
                  to={`/practicantes/${placement.id}/horas`}
                  className="flex flex-col gap-2 px-3 py-2 hover:bg-paper focus-visible:bg-paper sm:flex-row sm:items-center sm:gap-3"
                >
                  <span className="text-14 text-ink sm:w-32">Estudiante #{placement.studentId}</span>
                  <span className="flex-1 text-14 text-ink">Empresa #{placement.companyId}</span>
                  <span className="flex items-center gap-2 sm:w-44">
                    <span className="flex h-1.5 flex-1 overflow-hidden border border-paperRule bg-paper">
                      <span className="block h-full bg-stamp" style={{ width: `${approvedPct}%` }} />
                    </span>
                    <span className="font-data text-12 tabular-nums text-inkSoft">
                      {approvedHours.toFixed(1)}/{requiredHours}
                    </span>
                  </span>
                  <span className="font-data text-14 tabular-nums sm:w-32 sm:text-right">
                    {submittedHours > 0 ? (
                      <span className="text-pending">{submittedHours.toFixed(1)} h</span>
                    ) : (
                      <span className="text-inkSoft">—</span>
                    )}
                  </span>
                </Link>
              )
            })}
          </Ledger>
        )}
      </div>
    </div>
  )
}
