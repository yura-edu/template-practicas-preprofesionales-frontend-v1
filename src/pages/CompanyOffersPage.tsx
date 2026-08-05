import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  type Company,
  type CompanyOffer,
  type CreateOfferDto,
  closeOffer,
  createOffer,
  listCompanies,
  listMyOffers,
  publishOffer,
} from '@/api/companies'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Ledger } from '@/components/ledger/Ledger'

type OfferActionState = 'publishing' | 'closing' | 'published' | 'closed' | null

interface CreateOfferFormState {
  title: string
  description: string
  modality: string
  seats: string
  requiredHours: string
  periodStart: string
  periodEnd: string
}

type CreateOfferFormErrors = Partial<Record<keyof CreateOfferFormState, string>>

const EMPTY_FORM: CreateOfferFormState = {
  title: '',
  description: '',
  modality: '',
  seats: '',
  requiredHours: '',
  periodStart: '',
  periodEnd: '',
}

function formatDate(dateValue: string): string {
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function formatPeriod(periodStart: string, periodEnd: string): string {
  return `${formatDate(periodStart)} – ${formatDate(periodEnd)}`
}

function acceptedCount(offer: CompanyOffer): number {
  return offer.applications.filter((application) => application.status === 'ACCEPTED').length
}

function validateRequiredText(form: CreateOfferFormState): CreateOfferFormErrors {
  const errors: CreateOfferFormErrors = {}
  if (!form.title.trim()) errors.title = 'El título es obligatorio'
  if (!form.description.trim()) errors.description = 'La descripción es obligatoria'
  if (!form.modality.trim()) errors.modality = 'La modalidad es obligatoria'
  return errors
}

function validateSeatsAndHours(form: CreateOfferFormState): CreateOfferFormErrors {
  const errors: CreateOfferFormErrors = {}
  const seatsValue = Number(form.seats)
  if (!form.seats || Number.isNaN(seatsValue) || seatsValue < 1) errors.seats = 'Ingresa al menos 1 cupo'

  const hoursValue = Number(form.requiredHours)
  if (!form.requiredHours || Number.isNaN(hoursValue) || hoursValue < 1) {
    errors.requiredHours = 'Ingresa al menos 1 hora requerida'
  }
  return errors
}

function validatePeriod(form: CreateOfferFormState): CreateOfferFormErrors {
  const errors: CreateOfferFormErrors = {}
  if (!form.periodStart) errors.periodStart = 'La fecha de inicio es obligatoria'
  if (!form.periodEnd) errors.periodEnd = 'La fecha de fin es obligatoria'
  if (form.periodStart && form.periodEnd && form.periodEnd < form.periodStart) {
    errors.periodEnd = 'La fecha de fin debe ser posterior al inicio'
  }
  return errors
}

function validateForm(form: CreateOfferFormState): CreateOfferFormErrors {
  return { ...validateRequiredText(form), ...validateSeatsAndHours(form), ...validatePeriod(form) }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-12 text-void">
      {message}
    </p>
  )
}

function LedgerColumnHeader() {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 font-display text-12 uppercase tracking-wide text-inkSoft sm:flex-row sm:items-center sm:gap-3">
      <span className="flex-1">Título</span>
      <span className="sm:w-28">Modalidad</span>
      <span className="sm:w-16 sm:text-right">Cupos</span>
      <span className="sm:w-48">Periodo</span>
      <span className="sm:w-24">Estado</span>
      <span className="sm:w-36 sm:text-right">Acciones</span>
    </div>
  )
}

interface OfferRowProps {
  offer: CompanyOffer
  state: OfferActionState
  onPublish: (offerId: number) => void
  onClose: (offerId: number) => void
}

function OfferRow({ offer, state, onPublish, onClose }: OfferRowProps) {
  const busy = state === 'publishing' || state === 'closing'
  const occupied = acceptedCount(offer)
  return (
    <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
      <Link
        to={`/ofertas-empresa/${offer.id}/postulaciones`}
        className="flex-1 text-14 text-ink hover:underline focus-visible:underline"
      >
        {offer.title}
      </Link>
      <span className="font-data text-12 uppercase text-inkSoft sm:w-28">{offer.modality}</span>
      <span className="font-data text-14 tabular-nums text-ink sm:w-16 sm:text-right">
        {occupied}/{offer.seats}
      </span>
      <span className="font-data text-12 tabular-nums text-inkSoft sm:w-48">
        {formatPeriod(offer.periodStart, offer.periodEnd)}
      </span>
      <span className="sm:w-24">
        <StatusBadge status={offer.status} />
      </span>
      <span className="flex flex-wrap items-center justify-end gap-2 sm:w-36">
        {state === 'published' ? <span className="font-display text-14 text-stamp">Publicada</span> : null}
        {state === 'closed' ? <span className="font-display text-14 text-void">Cerrada</span> : null}
        {offer.status === 'DRAFT' ? (
          <Button type="button" size="sm" onClick={() => onPublish(offer.id)} disabled={busy}>
            {state === 'publishing' ? 'Publicando…' : 'Publicar'}
          </Button>
        ) : null}
        {offer.status === 'PUBLISHED' ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onClose(offer.id)} disabled={busy}>
            {state === 'closing' ? 'Cerrando…' : 'Cerrar'}
          </Button>
        ) : null}
      </span>
    </div>
  )
}

interface CreateOfferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: CreateOfferFormState
  formErrors: CreateOfferFormErrors
  creating: boolean
  createError: string | null
  onFieldChange: (field: keyof CreateOfferFormState, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function CreateOfferDialog({
  open,
  onOpenChange,
  form,
  formErrors,
  creating,
  createError,
  onFieldChange,
  onSubmit,
}: CreateOfferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear oferta</DialogTitle>
          <DialogDescription>Se crea en borrador — publícala cuando esté lista</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offer-title">Título</Label>
            <Input
              id="offer-title"
              value={form.title}
              onChange={(event) => onFieldChange('title', event.target.value)}
              aria-invalid={Boolean(formErrors.title)}
            />
            <FieldError message={formErrors.title} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offer-description">Descripción</Label>
            <Textarea
              id="offer-description"
              value={form.description}
              onChange={(event) => onFieldChange('description', event.target.value)}
              rows={3}
              aria-invalid={Boolean(formErrors.description)}
            />
            <FieldError message={formErrors.description} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offer-modality">Modalidad</Label>
            <Input
              id="offer-modality"
              value={form.modality}
              onChange={(event) => onFieldChange('modality', event.target.value)}
              placeholder="PRESENCIAL, HIBRIDA o REMOTA"
              aria-invalid={Boolean(formErrors.modality)}
            />
            <FieldError message={formErrors.modality} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="offer-seats">Cupos</Label>
              <Input
                id="offer-seats"
                type="number"
                min={1}
                value={form.seats}
                onChange={(event) => onFieldChange('seats', event.target.value)}
                className="font-data tabular-nums"
                aria-invalid={Boolean(formErrors.seats)}
              />
              <FieldError message={formErrors.seats} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="offer-hours">Horas requeridas</Label>
              <Input
                id="offer-hours"
                type="number"
                min={1}
                value={form.requiredHours}
                onChange={(event) => onFieldChange('requiredHours', event.target.value)}
                className="font-data tabular-nums"
                aria-invalid={Boolean(formErrors.requiredHours)}
              />
              <FieldError message={formErrors.requiredHours} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="offer-period-start">Inicio</Label>
              <Input
                id="offer-period-start"
                type="date"
                value={form.periodStart}
                onChange={(event) => onFieldChange('periodStart', event.target.value)}
                className="font-data"
                aria-invalid={Boolean(formErrors.periodStart)}
              />
              <FieldError message={formErrors.periodStart} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="offer-period-end">Fin</Label>
              <Input
                id="offer-period-end"
                type="date"
                value={form.periodEnd}
                onChange={(event) => onFieldChange('periodEnd', event.target.value)}
                className="font-data"
                aria-invalid={Boolean(formErrors.periodEnd)}
              />
              <FieldError message={formErrors.periodEnd} />
            </div>
          </div>

          {createError ? (
            <p role="alert" className="text-14 text-void">
              {createError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creando…' : 'Crear oferta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CompanyOffersPage() {
  const { user } = useAuth()
  const [offers, setOffers] = useState<CompanyOffer[] | undefined>(undefined)
  const [companies, setCompanies] = useState<Company[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const [actionState, setActionState] = useState<Record<number, OfferActionState>>({})
  const [actionError, setActionError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CreateOfferFormState>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<CreateOfferFormErrors>({})
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  function refetchOffers() {
    return listMyOffers()
      .then((data) => setOffers(data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus ofertas'))
  }

  useEffect(() => {
    let cancelled = false
    listMyOffers()
      .then((data) => {
        if (!cancelled) setOffers(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus ofertas')
      })
    listCompanies()
      .then((data) => {
        if (!cancelled) setCompanies(data)
      })
      .catch(() => {
        // La empresa es solo un dato de contexto en el encabezado: si falla,
        // se omite en vez de bloquear el resto de la pantalla.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const myCompany = companies?.find((company) => company.id === user?.companyId)

  async function handlePublish(offerId: number) {
    setActionError(null)
    setActionState((prev) => ({ ...prev, [offerId]: 'publishing' }))
    try {
      await publishOffer(offerId)
      await refetchOffers()
      setActionState((prev) => ({ ...prev, [offerId]: 'published' }))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo publicar la oferta')
      setActionState((prev) => ({ ...prev, [offerId]: null }))
    }
  }

  async function handleClose(offerId: number) {
    setActionError(null)
    setActionState((prev) => ({ ...prev, [offerId]: 'closing' }))
    try {
      await closeOffer(offerId)
      await refetchOffers()
      setActionState((prev) => ({ ...prev, [offerId]: 'closed' }))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo cerrar la oferta')
      setActionState((prev) => ({ ...prev, [offerId]: null }))
    }
  }

  function openDialog() {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setCreateError(null)
    setDialogOpen(true)
  }

  function handleFieldChange(field: keyof CreateOfferFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)

    if (!user?.companyId) {
      setCreateError('Tu usuario no tiene una empresa asociada')
      return
    }

    const nextErrors = validateForm(form)
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const dto: CreateOfferDto = {
      companyId: user.companyId,
      title: form.title.trim(),
      description: form.description.trim(),
      modality: form.modality.trim(),
      seats: Number(form.seats),
      requiredHours: Number(form.requiredHours),
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
    }

    setCreating(true)
    try {
      await createOffer(dto)
      await refetchOffers()
      setDialogOpen(false)
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'No se pudo crear la oferta')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-20 text-ink">Ofertas</h1>
          {myCompany ? <p className="font-data text-14 text-inkSoft">{myCompany.name}</p> : null}
        </div>
        <Button type="button" onClick={openDialog}>
          Crear oferta
        </Button>
      </header>

      {actionError ? (
        <p role="alert" className="font-display text-14 text-void">
          {actionError}
        </p>
      ) : null}

      <div className="border border-paperRule bg-surface">
        {error ? (
          <p role="alert" className="px-4 py-10 text-center font-display text-14 text-void">
            {error}
          </p>
        ) : offers === undefined ? (
          <p className="px-4 py-10 text-center font-display text-14 text-inkSoft">Cargando ofertas…</p>
        ) : offers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="font-display text-16 text-ink">Todavía no has publicado ofertas.</p>
          </div>
        ) : (
          <Ledger header={<LedgerColumnHeader />}>
            {offers.map((offer) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                state={actionState[offer.id] ?? null}
                onPublish={handlePublish}
                onClose={handleClose}
              />
            ))}
          </Ledger>
        )}
      </div>

      <CreateOfferDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        formErrors={formErrors}
        creating={creating}
        createError={createError}
        onFieldChange={handleFieldChange}
        onSubmit={handleCreate}
      />
    </div>
  )
}
