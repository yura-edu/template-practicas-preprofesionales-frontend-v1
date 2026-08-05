import { cn } from '@/lib/utils'

export type SyncState = 'local' | 'queued' | 'synced' | 'failed'

const GUTTER: Record<SyncState, { label: string; className: string }> = {
  local: { label: 'Sin sincronizar', className: 'bg-transparent border border-inkSoft/40' },
  queued: {
    label: 'En cola',
    className: 'bg-gradient-to-b from-pending to-transparent border border-pending',
  },
  synced: { label: 'Sincronizado', className: 'bg-stamp border border-stamp' },
  failed: { label: 'Rechazado', className: 'bg-void border border-void' },
}

export function SyncGutter({ state }: { state: SyncState }) {
  const { label, className } = GUTTER[state]
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn('block w-1 self-stretch rounded-none', className)}
    />
  )
}
