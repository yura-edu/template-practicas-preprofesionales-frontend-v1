import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { type Offer, listOffers } from '@/api/offers'
import { Ledger } from '@/components/ledger/Ledger'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ALL_MODALITIES = 'TODAS'

function formatDate(dateValue: string): string {
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function formatPeriod(periodStart: string, periodEnd: string): string {
  return `${formatDate(periodStart)} – ${formatDate(periodEnd)}`
}

function LedgerColumnHeader() {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 font-display text-12 uppercase tracking-wide text-inkSoft sm:flex-row sm:items-center sm:gap-3">
      <span className="sm:w-40">Empresa</span>
      <span className="flex-1">Título</span>
      <span className="sm:w-28">Modalidad</span>
      <span className="sm:w-16 sm:text-right">Cupos</span>
      <span className="sm:w-48 sm:text-right">Periodo</span>
    </div>
  )
}

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [modalityFilter, setModalityFilter] = useState(ALL_MODALITIES)

  useEffect(() => {
    let cancelled = false
    setError(null)
    listOffers()
      .then((data) => {
        if (!cancelled) setOffers(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las ofertas')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const modalities = useMemo(() => {
    if (!offers) return []
    return Array.from(new Set(offers.map((offer) => offer.modality))).sort()
  }, [offers])

  const visibleOffers = useMemo(() => {
    if (!offers) return undefined
    if (modalityFilter === ALL_MODALITIES) return offers
    return offers.filter((offer) => offer.modality === modalityFilter)
  }, [offers, modalityFilter])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-20 text-ink">Ofertas</h1>

        {offers && offers.length > 0 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="modality-filter" className="font-display text-14 text-inkSoft">
              Modalidad
            </label>
            <Select value={modalityFilter} onValueChange={setModalityFilter}>
              <SelectTrigger id="modality-filter" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MODALITIES}>Todas</SelectItem>
                {modalities.map((modality) => (
                  <SelectItem key={modality} value={modality}>
                    {modality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </header>

      <div className="border border-paperRule bg-surface">
        {error ? (
          <p role="alert" className="px-4 py-10 text-center font-display text-14 text-void">
            {error}
          </p>
        ) : offers === undefined ? (
          <p className="px-4 py-10 text-center font-display text-14 text-inkSoft">Cargando ofertas…</p>
        ) : visibleOffers && visibleOffers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="font-display text-16 text-ink">No hay ofertas publicadas para este periodo</p>
            <p className="font-display text-14 text-inkSoft">Vuelve a revisar más adelante</p>
          </div>
        ) : (
          <Ledger header={<LedgerColumnHeader />}>
            {visibleOffers?.map((offer) => (
              <Link
                key={offer.id}
                to={`/ofertas/${offer.id}`}
                className="flex flex-col gap-1 px-3 py-2 hover:bg-paper focus-visible:bg-paper sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="text-14 text-ink sm:w-40">{offer.company.name}</span>
                <span className="flex-1 text-14 text-ink">{offer.title}</span>
                <span className="font-data text-12 uppercase text-inkSoft sm:w-28">{offer.modality}</span>
                <span className="font-data text-14 tabular-nums text-ink sm:w-16 sm:text-right">{offer.seats}</span>
                <span className="font-data text-12 tabular-nums text-inkSoft sm:w-48 sm:text-right">
                  {formatPeriod(offer.periodStart, offer.periodEnd)}
                </span>
              </Link>
            ))}
          </Ledger>
        )}
      </div>
    </div>
  )
}
