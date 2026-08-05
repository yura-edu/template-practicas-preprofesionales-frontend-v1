import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/StatusBadge'
import { Ledger } from '@/components/ledger/Ledger'
import { LedgerRow } from '@/components/ledger/LedgerRow'
import { parseLocalDate } from '@/lib/date'
import { db, type LocalDocument } from '@/offline/db'
import { useHourLogs } from '@/offline/hooks/useHourLogs'
import { usePlacement } from '@/offline/hooks/usePlacement'

function formatDate(dateValue: string): string {
  const parsed = parseLocalDate(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function formatPeriod(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}

export function MyPlacementPage() {
  const placement = usePlacement()
  const logs = useHourLogs(placement?.id ?? -1)
  const documents = useLiveQuery<LocalDocument[] | undefined>(async () => {
    if (!placement) return undefined
    return db.documents.where('placementId').equals(placement.id).toArray()
  }, [placement?.id])

  if (placement === undefined) {
    return <p className="font-display text-16 text-inkSoft">Cargando tu práctica…</p>
  }

  if (placement === null) {
    return <p className="font-display text-16 text-inkSoft">No tienes una práctica activa todavía.</p>
  }

  const pendingDocuments = documents?.filter((doc) => doc.status === 'PENDING') ?? []

  let approvedHours = 0
  let submittedHours = 0
  for (const log of logs ?? []) {
    if (log.status === 'APPROVED') approvedHours += log.hours
    if (log.status === 'SUBMITTED') submittedHours += log.hours
  }

  const requiredHours = placement.requiredHours
  const approvedPct = requiredHours > 0 ? Math.min(100, (approvedHours / requiredHours) * 100) : 0
  const submittedPct =
    requiredHours > 0 ? Math.min(100 - approvedPct, (submittedHours / requiredHours) * 100) : 0

  const recentLogs = logs ? logs.slice(-5).reverse() : undefined

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-20 text-ink">Mi práctica</h1>

      <section className="border border-paperRule bg-surface">
        <h2 className="border-b border-paperRule px-3 py-2 font-display text-14 uppercase tracking-wide text-inkSoft">
          Datos de la práctica
        </h2>
        <dl className="divide-y divide-paperRule">
          <div className="flex items-center justify-between px-3 py-2">
            <dt className="font-display text-14 text-inkSoft">Empresa</dt>
            <dd className="font-data text-14 text-ink">Empresa #{placement.companyId}</dd>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <dt className="font-display text-14 text-inkSoft">Tutor</dt>
            <dd className="font-data text-14 text-ink">Tutor #{placement.tutorId}</dd>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <dt className="font-display text-14 text-inkSoft">Periodo</dt>
            <dd className="font-data text-14 tabular-nums text-ink">
              {formatPeriod(placement.startDate, placement.endDate)}
            </dd>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <dt className="font-display text-14 text-inkSoft">Estado</dt>
            <dd>
              <StatusBadge status={placement.status} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-2 border border-paperRule bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-14 uppercase tracking-wide text-inkSoft">Progreso de horas</h2>
          <p className="font-data text-14 tabular-nums text-inkSoft">
            {approvedHours.toFixed(1)} / {requiredHours} horas aprobadas
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(approvedPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de horas aprobadas"
          className="flex h-2 w-full overflow-hidden border border-paperRule bg-paper"
        >
          <span className="block h-full bg-stamp" style={{ width: `${approvedPct}%` }} />
          <span className="block h-full bg-pending" style={{ width: `${submittedPct}%` }} />
        </div>
        {submittedHours > 0 ? (
          <p className="font-data text-12 tabular-nums text-pending">
            {submittedHours.toFixed(1)} horas enviadas, todavía sin aprobar
          </p>
        ) : null}
      </section>

      <section className="border border-paperRule bg-surface">
        <Ledger header="Documentos pendientes">
          {documents === undefined ? (
            <p className="px-3 py-4 font-display text-14 text-inkSoft">Cargando documentos…</p>
          ) : pendingDocuments.length === 0 ? (
            <p className="px-3 py-4 font-display text-14 text-inkSoft">No tienes documentos pendientes</p>
          ) : (
            pendingDocuments.map((doc, index) => (
              <div key={index} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-14 text-ink">{doc.filename}</span>
                  <span className="font-data text-12 uppercase text-inkSoft">{doc.kind}</span>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            ))
          )}
        </Ledger>
      </section>

      <section className="border border-paperRule bg-surface">
        <div className="flex items-center justify-between border-b border-paperRule px-3 py-2">
          <h2 className="font-display text-14 uppercase tracking-wide text-inkSoft">Últimos registros de horas</h2>
          <Link to="/horas" className="font-display text-14 text-stamp hover:underline">
            Ver el libro de horas
          </Link>
        </div>
        {recentLogs === undefined ? (
          <p className="px-3 py-4 font-display text-14 text-inkSoft">Cargando registros…</p>
        ) : recentLogs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <p className="font-display text-16 text-ink">Todavía no has registrado horas</p>
            <p className="font-display text-14 text-inkSoft">Puedes hacerlo sin conexión</p>
          </div>
        ) : (
          <Ledger>
            {recentLogs.map((log, index) => (
              <LedgerRow key={index} syncState={log.syncState}>
                <span className="font-data text-14 tabular-nums text-ink sm:w-28">{formatDate(log.date)}</span>
                <span className="font-data text-14 tabular-nums text-inkSoft sm:w-28">
                  {log.startTime}–{log.endTime}
                </span>
                <span className="font-data text-14 tabular-nums text-ink sm:w-14">{log.hours}</span>
                <span className="flex-1 text-14 text-ink">{log.activity}</span>
                <span className="sm:w-24 sm:text-right">
                  <StatusBadge status={log.status} />
                </span>
              </LedgerRow>
            ))}
          </Ledger>
        )}
      </section>
    </div>
  )
}
