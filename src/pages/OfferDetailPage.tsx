import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { type Application, apply, listMine } from '@/api/applications'
import { ApiError } from '@/api/client'
import { type Offer, getOffer } from '@/api/offers'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { parseLocalDate } from '@/lib/date'

// El DTO del backend exige @MinLength(20) en la motivación.
const MIN_MOTIVATION_LENGTH = 20

function formatDate(dateValue: string): string {
  const parsed = parseLocalDate(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function formatPeriod(periodStart: string, periodEnd: string): string {
  return `${formatDate(periodStart)} – ${formatDate(periodEnd)}`
}

export function OfferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const offerId = Number(id)

  const [offer, setOffer] = useState<Offer | null | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [existingApplication, setExistingApplication] = useState<Application | null | undefined>(undefined)

  const [motivation, setMotivation] = useState('')
  const [motivationError, setMotivationError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

    listMine()
      .then((applications) => {
        if (!cancelled) setExistingApplication(applications.find((a) => a.offerId === offerId) ?? null)
      })
      .catch(() => {
        // Si no se puede confirmar el estado de la postulación, se deja el
        // formulario disponible: es preferible dejar postular de más que
        // esconder el botón por un error de red al consultar el historial.
        if (!cancelled) setExistingApplication(null)
      })

    return () => {
      cancelled = true
    }
  }, [offerId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const trimmed = motivation.trim()
    if (trimmed.length < MIN_MOTIVATION_LENGTH) {
      setMotivationError(`Escribe al menos ${MIN_MOTIVATION_LENGTH} caracteres`)
      return
    }
    setMotivationError(null)
    setSubmitting(true)

    try {
      const created = await apply(offerId, trimmed)
      setExistingApplication(created)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo enviar la postulación')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/ofertas" className="font-display text-14 text-stamp hover:underline">
          Volver a ofertas
        </Link>
        <p role="alert" className="font-display text-16 text-void">
          {loadError}
        </p>
      </div>
    )
  }

  if (offer === undefined) {
    return <p className="font-display text-16 text-inkSoft">Cargando oferta…</p>
  }

  if (offer === null) {
    return null
  }

  const remaining = MIN_MOTIVATION_LENGTH - motivation.trim().length

  return (
    <div className="flex flex-col gap-6">
      <Link to="/ofertas" className="font-display text-14 text-stamp hover:underline">
        Volver a ofertas
      </Link>

      <header className="flex flex-col gap-1 border border-paperRule bg-surface p-4">
        <h1 className="font-display text-20 text-ink">{offer.title}</h1>
        <p className="font-data text-14 text-inkSoft">
          {offer.company.name} · {offer.modality}
        </p>
      </header>

      <section className="border border-paperRule bg-surface">
        <h2 className="border-b border-paperRule px-3 py-2 font-display text-14 uppercase tracking-wide text-inkSoft">
          Descripción
        </h2>
        <p className="whitespace-pre-line px-3 py-3 text-14 text-ink">{offer.description}</p>
        <dl className="divide-y divide-paperRule border-t border-paperRule">
          <div className="flex items-center justify-between px-3 py-2">
            <dt className="font-display text-14 text-inkSoft">Cupos</dt>
            <dd className="font-data text-14 tabular-nums text-ink">{offer.seats}</dd>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <dt className="font-display text-14 text-inkSoft">Horas requeridas</dt>
            <dd className="font-data text-14 tabular-nums text-ink">{offer.requiredHours}</dd>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <dt className="font-display text-14 text-inkSoft">Periodo</dt>
            <dd className="font-data text-14 tabular-nums text-ink">
              {formatPeriod(offer.periodStart, offer.periodEnd)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="border border-paperRule bg-surface p-4">
        {existingApplication === undefined ? (
          <p className="font-display text-14 text-inkSoft">Comprobando si ya postulaste…</p>
        ) : existingApplication ? (
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-14 uppercase tracking-wide text-inkSoft">Tu postulación</h2>
            <div className="flex items-center gap-3">
              <StatusBadge status={existingApplication.status} />
              <span className="font-data text-12 tabular-nums text-inkSoft">
                Enviada el {formatDate(existingApplication.submittedAt)}
              </span>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
            <h2 className="font-display text-14 uppercase tracking-wide text-inkSoft">Postular</h2>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="motivation">Motivación</Label>
              <Textarea
                id="motivation"
                value={motivation}
                onChange={(event) => {
                  setMotivation(event.target.value)
                  if (motivationError) setMotivationError(null)
                }}
                rows={4}
                placeholder="Cuéntale a la empresa por qué te interesa esta práctica"
                aria-invalid={Boolean(motivationError)}
                aria-describedby="motivation-hint"
              />
              <p id="motivation-hint" className="font-data text-12 text-inkSoft">
                {remaining > 0 ? `Faltan ${remaining} caracteres (mínimo ${MIN_MOTIVATION_LENGTH})` : 'Longitud suficiente'}
              </p>
              {motivationError ? (
                <p role="alert" className="text-12 text-void">
                  {motivationError}
                </p>
              ) : null}
            </div>

            {submitError ? (
              <p role="alert" className="text-14 text-void">
                {submitError}
              </p>
            ) : null}

            <Button type="submit" disabled={submitting} className="self-start">
              {submitting ? 'Enviando…' : 'Postular'}
            </Button>
          </form>
        )}
      </section>
    </div>
  )
}
