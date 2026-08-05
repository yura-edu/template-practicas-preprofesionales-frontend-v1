import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SyncGutter, type SyncState } from './SyncGutter'

interface LedgerRowProps {
  syncState: SyncState
  children: ReactNode
  className?: string
}

export function LedgerRow({ syncState, children, className }: LedgerRowProps) {
  return (
    <div className={cn('flex items-stretch gap-3 px-3 py-2', className)}>
      <SyncGutter state={syncState} />
      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        {children}
      </div>
    </div>
  )
}
