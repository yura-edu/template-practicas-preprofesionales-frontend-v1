import { useEffect, useState } from 'react'
import { type AccreditationRow, reportForPeriod } from '@/api/accreditation'
import { ApiError } from '@/api/client'
import { StatusBadge } from '@/components/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Ledger } from '@/components/ledger/Ledger'

// El backend exige `period` con formato AAAA-1/AAAA-2 (ver AccreditationQueryDto);
// el selector nunca debe poder mandar un valor vacío, así que se restringe a
// estas dos opciones fijas del periodo académico vigente.
const PERIODS = ['2026-1', '2026-2'] as const

function LedgerColumnHeader() {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 font-display text-12 uppercase tracking-wide text-inkSoft sm:flex-row sm:items-start sm:gap-3">
      <span className="sm:w-32">Estudiante</span>
      <span className="sm:w-56">Nivel</span>
      <span className="sm:w-20 sm:text-right">Horas</span>
      <span className="flex-1">Razones</span>
    </div>
  )
}

/** Acta de acreditación por periodo académico. No sincronizable: siempre requiere red. */
export function AccreditationPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[0])
  const [rows, setRows] = useState<AccreditationRow[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setRows(undefined)
    setError(null)
    reportForPeriod(period)
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo generar el acta')
      })
    return () => {
      cancelled = true
    }
  }, [period])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-20 text-ink">Acreditación</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="accreditation-period" className="font-display text-14 text-inkSoft">
            Periodo
          </label>
          <Select value={period} onValueChange={(value) => setPeriod(value as (typeof PERIODS)[number])}>
            <SelectTrigger id="accreditation-period" className="w-32 font-data">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((option) => (
                <SelectItem key={option} value={option} className="font-data">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="border border-paperRule bg-surface">
        {error ? (
          <p role="alert" className="px-4 py-10 text-center font-display text-14 text-void">
            {error}
          </p>
        ) : rows === undefined ? (
          <p className="px-4 py-10 text-center font-display text-14 text-inkSoft">Generando acta…</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="font-display text-16 text-ink">No hay placements en este periodo.</p>
          </div>
        ) : (
          <Ledger header={<LedgerColumnHeader />}>
            {rows.map((row) => (
              <div key={row.placementId} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
                <span className="text-14 text-ink sm:w-32">{row.studentName}</span>
                <span className="sm:w-56">
                  <StatusBadge status={row.level} />
                </span>
                <span className="font-data text-14 tabular-nums text-ink sm:w-20 sm:text-right">
                  {row.completionPercentage}%
                </span>
                <span className="flex-1 font-data text-12 text-inkSoft">
                  {row.reasons.length > 0 ? row.reasons.join(' · ') : '—'}
                </span>
              </div>
            ))}
          </Ledger>
        )}
      </div>
    </div>
  )
}
