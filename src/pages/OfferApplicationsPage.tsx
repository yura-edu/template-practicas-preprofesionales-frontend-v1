import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  type ApplicationDecision,
  type OfferApplication,
  decideApplication,
  listApplicationsForOffer,
} from '@/api/companies'
import { ApiError } from '@/api/client'
import { type Offer, getOffer } from '@/api/offers'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Ledger } from '@/components/ledger/Ledger'
import { parseLocalDate } from '@/lib/date'

type DecisionState = 'interviewing' | 'accepting' | 'rejecting' | null

function formatDate(dateValue: string): string {
  const parsed = parseLocalDate(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function acceptedCount(applications: OfferApplication[]): number {
  return applications.filter((application) => application.status === 'ACCEPTED').length
}

function LedgerColumnHeader() {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 font-display text-12 uppercase tracking-wide text-inkSoft sm:flex-row sm:items-center sm:gap-3">
      <span className="sm:w-40">Estudiante</span>
      <span className="flex-1">Motivación</span>
      <span className="sm:w-28">Enviada</span>
      <span className="sm:w-24">Estado</span>
      <span className="sm:w-60 sm:text-right">Acciones</span>
    </div>
  )
}

/**
 * Ledger de postulaciones de una oferta. A propósito no deshabilita
 * "Aceptar" al llegar al tope de cupos: el backend es la autoridad y
 * devuelve el error si dos aceptaciones simultáneas pasan la verificación
 * de cupos — ocultar el botón en el cliente escondería esa condición de
 * carrera real que el equipo debe poder encontrar.
 */
export function OfferApplicationsPage() {
  const { id } = useParams<{ id: string }>()
  const offerId = Number(id)

  const [offer, setOffer] = useState<Offer | null | undefined>(undefined)
  const [applications, setApplications] = useState<OfferApplication[] | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [decisionState, setDecisionState] = useState<Record<number, DecisionState>>({})
  const [decisionError, setDecisionError] = useState<string | null>(null)

  function refetchApplications() {
    return listApplicationsForOffer(offerId)
      .then((data) => setApplications(data))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'No se pudieron cargar las postulaciones'))
  }

  useEffect(() => {
    let cancelled = false
    getOffer(offerId)
      .then((data) => {
        if (!cancelled) setOffer(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setOffer(null)
          setLoadError(err instanceof ApiError ? err.message : 'No se pudo cargar la oferta')
        }
      })
    listApplicationsForOffer(offerId)
      .then((data) => {
        if (!cancelled) setApplications(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : 'No se pudieron cargar las postulaciones')
        }
      })
    return () => {
      cancelled = true
    }
  }, [offerId])

  async function decide(applicationId: number, status: ApplicationDecision, state: DecisionState) {
    setDecisionError(null)
    setDecisionState((prev) => ({ ...prev, [applicationId]: state }))
    try {
      await decideApplication(applicationId, status)
      await refetchApplications()
    } catch (err) {
      setDecisionError(err instanceof ApiError ? err.message : 'No se pudo enviar la decisión')
    } finally {
      setDecisionState((prev) => ({ ...prev, [applicationId]: null }))
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/ofertas-empresa" className="font-display text-14 text-stamp hover:underline">
          Volver a ofertas
        </Link>
        <p role="alert" className="font-display text-16 text-void">
          {loadError}
        </p>
      </div>
    )
  }

  if (offer === undefined || applications === undefined) {
    return <p className="font-display text-16 text-inkSoft">Cargando postulaciones…</p>
  }

  if (offer === null) {
    return null
  }

  const occupied = acceptedCount(applications)
  const remaining = offer.seats - occupied

  return (
    <div className="flex flex-col gap-6">
      <Link to="/ofertas-empresa" className="font-display text-14 text-stamp hover:underline">
        Volver a ofertas
      </Link>

      <header className="flex flex-col gap-1 border border-paperRule bg-surface p-4">
        <h1 className="font-display text-20 text-ink">{offer.title}</h1>
        <p className="font-data text-14 tabular-nums text-inkSoft">
          {remaining > 0
            ? `${remaining} de ${offer.seats} cupos restantes`
            : `${offer.seats} de ${offer.seats} cupos ocupados`}
        </p>
      </header>

      {decisionError ? (
        <p role="alert" className="font-display text-14 text-void">
          {decisionError}
        </p>
      ) : null}

      <div className="border border-paperRule bg-surface">
        {applications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="font-display text-16 text-ink">Todavía no hay postulaciones para esta oferta</p>
          </div>
        ) : (
          <Ledger header={<LedgerColumnHeader />}>
            {applications.map((application) => {
              const state = decisionState[application.id] ?? null
              const busy = state !== null
              const decidable = application.status === 'SUBMITTED' || application.status === 'INTERVIEW'
              return (
                <div key={application.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-14 text-ink sm:w-40">{application.student.fullName}</span>
                  <span className="flex-1 text-14 text-ink">{application.motivation}</span>
                  <span className="font-data text-12 tabular-nums text-inkSoft sm:w-28">
                    {formatDate(application.submittedAt)}
                  </span>
                  <span className="sm:w-24">
                    <StatusBadge status={application.status} />
                  </span>
                  <span className="flex flex-wrap items-center justify-end gap-2 sm:w-60">
                    {decidable ? (
                      <>
                        {application.status === 'SUBMITTED' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => decide(application.id, 'INTERVIEW', 'interviewing')}
                            disabled={busy}
                          >
                            {state === 'interviewing' ? 'Enviando…' : 'Entrevista'}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => decide(application.id, 'ACCEPTED', 'accepting')}
                          disabled={busy}
                        >
                          {state === 'accepting' ? 'Aceptando…' : 'Aceptar'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => decide(application.id, 'REJECTED', 'rejecting')}
                          disabled={busy}
                        >
                          {state === 'rejecting' ? 'Rechazando…' : 'Rechazar'}
                        </Button>
                      </>
                    ) : null}
                  </span>
                </div>
              )
            })}
          </Ledger>
        )}
      </div>
    </div>
  )
}
