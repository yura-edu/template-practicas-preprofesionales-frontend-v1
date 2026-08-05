import { cn } from '@/lib/utils'

type Tone = 'stamp' | 'pending' | 'void' | 'inkSoft'

const TONE_CLASSES: Record<Tone, string> = {
  stamp: 'border-stamp/40 bg-stamp/10 text-stamp',
  pending: 'border-pending/40 bg-pending/10 text-pending',
  void: 'border-void/40 bg-void/10 text-void',
  inkSoft: 'border-inkSoft/40 bg-inkSoft/10 text-inkSoft',
}

const STATUS_TONE: Record<string, Tone> = {
  APPROVED: 'stamp',
  ACCEPTED: 'stamp',
  ACTIVE: 'stamp',
  VALIDATED: 'stamp',
  PUBLISHED: 'stamp',
  ACREDITADO: 'stamp',
  SUBMITTED: 'pending',
  PENDING: 'pending',
  PENDING_DOCS: 'pending',
  INTERVIEW: 'pending',
  DRAFT: 'pending',
  PENDIENTE: 'pending',
  ACREDITADO_CON_OBSERVACIONES: 'pending',
  REJECTED: 'void',
  ABANDONED: 'void',
  SUSPENDED: 'void',
  CLOSED: 'void',
  WITHDRAWN: 'void',
  NO_ACREDITADO: 'void',
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'inkSoft'
  return (
    <span
      className={cn(
        'inline-block border px-1.5 py-0.5 font-data text-12 uppercase',
        TONE_CLASSES[tone],
      )}
    >
      {status}
    </span>
  )
}
