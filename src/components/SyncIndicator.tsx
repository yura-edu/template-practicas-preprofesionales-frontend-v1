import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useOnline } from '@/offline/hooks/useOnline'
import { useSyncStatus } from '@/offline/hooks/useSyncStatus'
import { syncNow } from '@/offline/sync/scheduler'
import { cn } from '@/lib/utils'

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function SyncIndicator() {
  const online = useOnline()
  const { pending, lastSyncAt, syncing } = useSyncStatus()
  const [triggering, setTriggering] = useState(false)

  const busy = syncing || triggering

  async function handleSyncNow() {
    setTriggering(true)
    try {
      await syncNow()
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 font-data text-12"
    >
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            'inline-block h-2.5 w-2.5 rounded-full',
            online ? 'border border-stamp bg-stamp' : 'border-2 border-void bg-transparent',
          )}
        />
        <span className={online ? 'text-stamp' : 'text-void'}>
          {online ? 'En línea' : 'Sin conexión'}
        </span>
      </span>

      <span className={cn('font-data', pending > 0 ? 'text-pending' : 'text-inkSoft')}>
        {pending} pendiente{pending === 1 ? '' : 's'}
      </span>

      <span className="text-inkSoft">
        Último sync <span className="font-data">{formatTime(lastSyncAt)}</span>
      </span>

      <Button type="button" variant="outline" size="sm" onClick={handleSyncNow} disabled={busy}>
        {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
      </Button>
    </div>
  )
}
