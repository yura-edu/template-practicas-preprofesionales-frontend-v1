import { api } from '@/api/client'
import { db, type OutboxEntry } from '@/offline/db'
import { applyResults, type SyncOperationResult } from './conflict'

export async function enqueue(
  op: Omit<OutboxEntry, 'id' | 'createdAt' | 'attempts' | 'lastError'>,
): Promise<void> {
  const entry: OutboxEntry = {
    ...op,
    clientOpId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  }

  await db.transaction('rw', [db.outbox, db.hourLogs], async () => {
    await db.outbox.add(entry)
    const rowId = entry.payload.id
    if (typeof rowId === 'number') {
      await db.hourLogs.update(rowId, { syncState: 'queued' })
    }
  })
}

export async function pushOutbox(): Promise<{ applied: number; failed: number }> {
  const entries = await db.outbox.orderBy('createdAt').limit(500).toArray()
  if (entries.length === 0) return { applied: 0, failed: 0 }

  const ops = entries.map((e) => ({
    clientOpId: e.clientOpId,
    entity: e.entity,
    op: e.op,
    baseVersion: e.baseVersion,
    payload: e.payload,
  }))

  await db.outbox.bulkDelete(entries.map((e) => e.id as number))

  const { results } = await api<{ results: SyncOperationResult[] }>('/sync/push', {
    method: 'POST',
    body: JSON.stringify({ ops }),
  })

  await applyResults(results)
  return {
    applied: results.filter((r) => r.status === 'applied').length,
    failed: results.filter((r) => r.status !== 'applied').length,
  }
}
