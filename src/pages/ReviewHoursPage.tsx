import { type FormEvent, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { ApiError, api } from '@/api/client'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Ledger } from '@/components/ledger/Ledger'
import { LedgerRow } from '@/components/ledger/LedgerRow'
import { parseLocalDate } from '@/lib/date'
import { db, type LocalHourLog, type LocalPlacement } from '@/offline/db'
import { syncNow } from '@/offline/sync/scheduler'

type ActionState = 'approving' | 'rejecting' | 'approved' | 'rejected' | null

function formatDate(dateValue: string): string {
  const parsed = parseLocalDate(dateValue)
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
        <span className="sm:w-24">Estado</span>
        <span className="sm:w-40 sm:text-right">Revisión</span>
      </div>
    </div>
  )
}

/**
 * Cola de aprobación de un placement. Las horas viven en Dexie (sincronizadas
 * por pull/push); aprobar o rechazar llama al backend y luego re-sincroniza
 * para traer el estado nuevo — el servidor es la autoridad, nunca se escribe
 * el resultado de la revisión a mano en Dexie.
 *
 * Nota: el backend no valida que quien revisa sea el tutor asignado a este
 * placement (deuda del backend). Esta pantalla no lo compensa ocultando ni
 * deshabilitando nada.
 */
export function ReviewHoursPage() {
  const { id } = useParams<{ id: string }>()
  const placementId = Number(id)

  const placement = useLiveQuery<LocalPlacement | null | undefined>(async () => {
    const found = await db.placements.get(placementId)
    return found ?? null
  }, [placementId])

  const logs = useLiveQuery<LocalHourLog[] | undefined>(
    () => db.hourLogs.where('placementId').equals(placementId).sortBy('date'),
    [placementId],
  )

  const [actionState, setActionState] = useState<Record<number, ActionState>>({})
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [rejectingLog, setRejectingLog] = useState<LocalHourLog | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectNoteError, setRejectNoteError] = useState<string | null>(null)

  if (placement === undefined || logs === undefined) {
    return <p className="font-display text-16 text-inkSoft">Cargando libro de horas…</p>
  }

  if (placement === null) {
    return <p className="font-display text-16 text-inkSoft">No se encontró este practicante.</p>
  }

  const requiredHours = placement.requiredHours
  let approvedHours = 0
  for (const log of logs) {
    if (log.status === 'APPROVED') approvedHours += log.hours
  }
  const approvedPct = requiredHours > 0 ? Math.min(100, (approvedHours / requiredHours) * 100) : 0
  const pendingCount = logs.filter((log) => log.status === 'SUBMITTED').length

  async function reviewLog(logId: number, status: 'APPROVED' | 'REJECTED', note?: string) {
    setReviewError(null)
    setActionState((prev) => ({ ...prev, [logId]: status === 'APPROVED' ? 'approving' : 'rejecting' }))
    try {
      await api(`/hour-logs/${logId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      })
      await syncNow()
      setActionState((prev) => ({ ...prev, [logId]: status === 'APPROVED' ? 'approved' : 'rejected' }))
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : 'No se pudo enviar la revisión')
      setActionState((prev) => ({ ...prev, [logId]: null }))
    }
  }

  function openReject(log: LocalHourLog) {
    setRejectingLog(log)
    setRejectNote('')
    setRejectNoteError(null)
  }

  async function confirmReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rejectingLog) return
    const trimmed = rejectNote.trim()
    if (!trimmed) {
      setRejectNoteError('Escribe una nota para el rechazo')
      return
    }
    const logId = rejectingLog.id
    setRejectingLog(null)
    await reviewLog(logId, 'REJECTED', trimmed)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-20 text-ink">Horas del practicante</h1>
        <p className="font-data text-14 text-inkSoft">
          Estudiante #{placement.studentId} · Empresa #{placement.companyId}
        </p>
        <p className="font-data text-14 tabular-nums text-inkSoft">
          {approvedHours.toFixed(1)} / {requiredHours} horas aprobadas
        </p>
        <div
          role="progressbar"
          aria-valuenow={Math.round(approvedPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de horas aprobadas"
          className="flex h-2 w-full max-w-md overflow-hidden border border-paperRule bg-paper"
        >
          <span className="block h-full bg-stamp" style={{ width: `${approvedPct}%` }} />
        </div>
        <Link
          to={`/practicantes/${placementId}/evaluar`}
          className="self-start font-display text-14 text-stamp hover:underline"
        >
          Evaluar practicante
        </Link>
      </header>

      {reviewError ? (
        <p role="alert" className="font-display text-14 text-void">
          {reviewError}
        </p>
      ) : null}

      {logs.length > 0 && pendingCount === 0 ? (
        <p className="font-display text-14 text-inkSoft">No tienes horas pendientes de revisar.</p>
      ) : null}

      <div className="border border-paperRule bg-surface">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="font-display text-16 text-ink">No tienes horas pendientes de revisar.</p>
          </div>
        ) : (
          <Ledger header={<LedgerColumnHeader />}>
            {logs
              .slice()
              .reverse()
              .map((log) => {
                const state = actionState[log.id] ?? null
                const busy = state === 'approving' || state === 'rejecting'
                return (
                  <LedgerRow key={log.id} syncState={log.syncState}>
                    <span className="font-data text-14 tabular-nums text-ink sm:w-28">{formatDate(log.date)}</span>
                    <span className="font-data text-14 tabular-nums text-inkSoft sm:w-28">
                      {log.startTime}–{log.endTime}
                    </span>
                    <span className="font-data text-14 tabular-nums text-ink sm:w-14">{log.hours}</span>
                    <span className="flex-1 text-14 text-ink">{log.activity}</span>
                    <span className="sm:w-24">
                      <StatusBadge status={log.status} />
                    </span>
                    <span className="flex justify-end gap-2 sm:w-40">
                      {state === 'approved' ? (
                        <span className="font-display text-14 text-stamp">Aprobada</span>
                      ) : state === 'rejected' ? (
                        <span className="font-display text-14 text-void">Rechazada</span>
                      ) : log.status === 'SUBMITTED' ? (
                        <>
                          <Button type="button" size="sm" onClick={() => reviewLog(log.id, 'APPROVED')} disabled={busy}>
                            {state === 'approving' ? 'Aprobando…' : 'Aprobar'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openReject(log)}
                            disabled={busy}
                          >
                            Rechazar
                          </Button>
                        </>
                      ) : null}
                    </span>
                  </LedgerRow>
                )
              })}
          </Ledger>
        )}
      </div>

      <Dialog
        open={rejectingLog !== null}
        onOpenChange={(open) => {
          if (!open) setRejectingLog(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar horas</DialogTitle>
            <DialogDescription>Explica por qué se rechaza este registro</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-3" onSubmit={confirmReject} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reject-note">Nota</Label>
              <Textarea
                id="reject-note"
                value={rejectNote}
                onChange={(event) => setRejectNote(event.target.value)}
                rows={3}
                aria-invalid={Boolean(rejectNoteError)}
                aria-describedby={rejectNoteError ? 'reject-note-error' : undefined}
              />
              {rejectNoteError ? (
                <p id="reject-note-error" role="alert" className="text-12 text-void">
                  {rejectNoteError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="submit">Rechazar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
