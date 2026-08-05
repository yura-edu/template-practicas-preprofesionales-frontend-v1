import { type FormEvent, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { submitEvaluation } from '@/api/evaluations'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { parseLocalDate } from '@/lib/date'
import { db, type LocalPlacement } from '@/offline/db'

type ScoreField = 'technical' | 'communication' | 'punctuality'

// Rúbrica fija (technical, communication, punctuality, 1 a 5): una épica
// posterior del backlog la reemplaza por criterios configurables — no se
// adelanta esa flexibilidad aquí.
const CRITERIA: { field: ScoreField; label: string }[] = [
  { field: 'technical', label: 'Desempeño técnico' },
  { field: 'communication', label: 'Comunicación' },
  { field: 'punctuality', label: 'Puntualidad' },
]

const SCORE_OPTIONS = ['1', '2', '3', '4', '5']

// Periodo académico AAAA-1 (enero-junio) o AAAA-2 (julio-diciembre), tal
// como lo espera el backend (ver AccreditationService.reportForPeriod). Se
// deriva de la fecha de inicio del placement: la rúbrica no le pide este
// dato al tutor.
function periodFromStartDate(startDate: string): string {
  const parsed = parseLocalDate(startDate)
  const year = parsed.getFullYear()
  const term = parsed.getMonth() < 6 ? 1 : 2
  return `${year}-${term}`
}

/** Evaluación del tutor sobre un placement: rúbrica fija + comentario. No sincronizable: siempre requiere red. */
export function EvaluatePage() {
  const { id } = useParams<{ id: string }>()
  const placementId = Number(id)

  const placement = useLiveQuery<LocalPlacement | null | undefined>(async () => {
    const found = await db.placements.get(placementId)
    return found ?? null
  }, [placementId])

  const [scores, setScores] = useState<Record<ScoreField, string>>({
    technical: '',
    communication: '',
    punctuality: '',
  })
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<Partial<Record<ScoreField, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (placement === undefined) {
    return <p className="font-display text-16 text-inkSoft">Cargando practicante…</p>
  }

  if (placement === null) {
    return <p className="font-display text-16 text-inkSoft">No se encontró este practicante.</p>
  }

  const period = periodFromStartDate(placement.startDate)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const nextErrors: Partial<Record<ScoreField, string>> = {}
    for (const { field } of CRITERIA) {
      if (!scores[field]) nextErrors[field] = 'Selecciona un puntaje'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await submitEvaluation({
        placementId,
        kind: 'TUTOR',
        period,
        scores: {
          technical: Number(scores.technical),
          communication: Number(scores.communication),
          punctuality: Number(scores.punctuality),
        },
        comment: comment.trim() || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo enviar la evaluación')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-20 text-ink">Evaluar practicante</h1>
        <p className="font-data text-14 text-inkSoft">
          Estudiante #{placement.studentId} · Empresa #{placement.companyId}
        </p>
        <Link
          to={`/practicantes/${placementId}/horas`}
          className="self-start font-display text-14 text-stamp hover:underline"
        >
          Ver libro de horas
        </Link>
      </header>

      {submitted ? (
        <div className="flex flex-col items-center gap-2 border border-paperRule bg-surface px-4 py-10 text-center">
          <p className="font-display text-16 text-ink">Evaluación enviada</p>
          <Link to="/practicantes" className="font-display text-14 text-stamp hover:underline">
            Volver a mis practicantes
          </Link>
        </div>
      ) : (
        <form className="flex flex-col gap-4 border border-paperRule bg-surface p-4" onSubmit={handleSubmit} noValidate>
          {CRITERIA.map(({ field, label }) => (
            <div key={field} className="flex flex-col gap-1.5">
              <Label htmlFor={`eval-${field}`}>{label}</Label>
              <Select
                value={scores[field]}
                onValueChange={(value) => setScores((prev) => ({ ...prev, [field]: value }))}
              >
                <SelectTrigger id={`eval-${field}`} className="w-32 font-data" aria-invalid={Boolean(errors[field])}>
                  <SelectValue placeholder="1 a 5" />
                </SelectTrigger>
                <SelectContent>
                  {SCORE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option} className="font-data">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors[field] ? (
                <p role="alert" className="text-12 text-void">
                  {errors[field]}
                </p>
              ) : null}
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eval-comment">Comentario</Label>
            <Textarea
              id="eval-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              placeholder="Observaciones sobre el desempeño del practicante"
            />
          </div>

          {submitError ? (
            <p role="alert" className="text-14 text-void">
              {submitError}
            </p>
          ) : null}

          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Enviando…' : 'Enviar evaluación'}
          </Button>
        </form>
      )}
    </div>
  )
}
