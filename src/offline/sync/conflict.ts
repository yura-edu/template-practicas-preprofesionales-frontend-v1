import { db, type LocalHourLog } from '@/offline/db'

export interface SyncOperationResult {
  clientOpId: string
  status: 'applied' | 'conflict' | 'rejected'
  server: Partial<LocalHourLog> & { id: number }
  reason: string | null
}

export async function applyResults(results: SyncOperationResult[]): Promise<void> {
  for (const result of results) {
    const { id, ...serverFields } = result.server

    if (result.status === 'applied') {
      await db.hourLogs.update(id, { ...serverFields, syncState: 'synced' })
    } else {
      await db.hourLogs.update(id, { syncState: 'failed', reviewNote: result.reason })
    }
  }
}
