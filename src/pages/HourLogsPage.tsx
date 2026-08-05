import { useState } from 'react'
import { HourLogForm } from '@/components/HourLogForm'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Ledger } from '@/components/ledger/Ledger'
import { LedgerRow } from '@/components/ledger/LedgerRow'
import { useHourLogs } from '@/offline/hooks/useHourLogs'
import { usePlacement } from '@/offline/hooks/usePlacement'

function formatDate(dateValue: string): string {
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function LedgerColumnHeader() {
  return (
    <div className="flex items-stretch gap-3 px-3 py-2">
      <span aria-hidden="true" className="block w-1 self-stretch" />
      <div className="flex flex-1 flex-col gap-1 font-display text-12 uppercase tracking-wide text-inkSoft sm:flex-row sm:items-center sm:gap-3">
        <span className="sm:w-28">Fecha</span>
        <span className="sm:w-28">Horario</span>
        <span className="sm:w-14">Horas</span>
        <span className="flex-1">Actividad</span>
        <span className="sm:w-24 sm:text-right">Estado</span>
      </div>
    </div>
  )
}

export function HourLogsPage() {
  const placement = usePlacement()
  const logs = useHourLogs(placement?.id ?? -1)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (placement === undefined) {
    return <p className="font-display text-16 text-inkSoft">Cargando tu práctica…</p>
  }

  if (placement === null) {
    return <p className="font-display text-16 text-inkSoft">No tienes una práctica activa todavía.</p>
  }

  if (logs === undefined) {
    return <p className="font-display text-16 text-inkSoft">Cargando registros de horas…</p>
  }

  // Totales recalculados en cada render a propósito: con esta pantalla no
  // hace falta más que sumar un arreglo, así que no se envuelve en useMemo.
  let approvedHours = 0
  let submittedHours = 0
  for (const log of logs) {
    if (log.status === 'APPROVED') approvedHours += log.hours
    if (log.status === 'SUBMITTED') submittedHours += log.hours
  }

  const requiredHours = placement.requiredHours
  const approvedPct = requiredHours > 0 ? Math.min(100, (approvedHours / requiredHours) * 100) : 0
  const submittedPct =
    requiredHours > 0 ? Math.min(100 - approvedPct, (submittedHours / requiredHours) * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border border-paperRule bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-20 text-ink">Libro de horas</h1>
            <p className="font-data text-14 tabular-nums text-inkSoft">
              {approvedHours.toFixed(1)} / {requiredHours} horas aprobadas
              {submittedHours > 0 ? (
                <span className="text-pending"> · {submittedHours.toFixed(1)} enviadas, sin aprobar</span>
              ) : null}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button">Registrar horas</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar horas</DialogTitle>
                <DialogDescription>
                  Se guardan en este dispositivo y se sincronizan cuando haya conexión
                </DialogDescription>
              </DialogHeader>
              <HourLogForm placementId={placement.id} onSaved={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
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
      </header>

      <div className="border border-paperRule bg-surface">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="font-display text-16 text-ink">Todavía no has registrado horas</p>
            <p className="font-display text-14 text-inkSoft">Puedes hacerlo sin conexión</p>
          </div>
        ) : (
          <Ledger header={<LedgerColumnHeader />}>
            {logs
              .slice()
              .reverse()
              .map((log, index) => (
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
      </div>
    </div>
  )
}
