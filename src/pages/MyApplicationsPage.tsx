import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { type Application, listMine } from '@/api/applications'
import { ApiError } from '@/api/client'
import { StatusBadge } from '@/components/StatusBadge'
import { Ledger } from '@/components/ledger/Ledger'
import { parseLocalDate } from '@/lib/date'

function formatDate(dateValue: string): string {
  const parsed = parseLocalDate(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function LedgerColumnHeader() {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 font-display text-12 uppercase tracking-wide text-inkSoft sm:flex-row sm:items-center sm:gap-3">
      <span className="sm:w-40">Empresa</span>
      <span className="flex-1">Oferta</span>
      <span className="sm:w-32">Enviada</span>
      <span className="sm:w-24 sm:text-right">Estado</span>
    </div>
  )
}

export function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listMine()
      .then((data) => {
        if (!cancelled) setApplications(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus postulaciones')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-20 text-ink">Mis postulaciones</h1>

      <div className="border border-paperRule bg-surface">
        {error ? (
          <p role="alert" className="px-4 py-10 text-center font-display text-14 text-void">
            {error}
          </p>
        ) : applications === undefined ? (
          <p className="px-4 py-10 text-center font-display text-14 text-inkSoft">Cargando postulaciones…</p>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="font-display text-16 text-ink">Todavía no has postulado a ninguna oferta</p>
            <Link to="/ofertas" className="font-display text-14 text-stamp hover:underline">
              Explora las ofertas disponibles
            </Link>
          </div>
        ) : (
          <Ledger header={<LedgerColumnHeader />}>
            {applications.map((application) => (
              <Link
                key={application.id}
                to={`/ofertas/${application.offerId}`}
                className="flex flex-col gap-1 px-3 py-2 hover:bg-paper focus-visible:bg-paper sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="text-14 text-ink sm:w-40">{application.offer.company.name}</span>
                <span className="flex-1 text-14 text-ink">{application.offer.title}</span>
                <span className="font-data text-12 tabular-nums text-inkSoft sm:w-32">
                  {formatDate(application.submittedAt)}
                </span>
                <span className="sm:w-24 sm:text-right">
                  <StatusBadge status={application.status} />
                </span>
              </Link>
            ))}
          </Ledger>
        )}
      </div>
    </div>
  )
}
