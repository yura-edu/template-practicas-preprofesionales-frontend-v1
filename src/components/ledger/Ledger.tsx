import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface LedgerProps {
  header?: ReactNode
  children: ReactNode
  className?: string
}

export function Ledger({ header, children, className }: LedgerProps) {
  return (
    <div className={cn('divide-y divide-paperRule', className)}>
      {header ? (
        <div className="font-display text-inkSoft uppercase tracking-wide text-12">
          {header}
        </div>
      ) : null}
      {children}
    </div>
  )
}
