import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { db } from '@/offline/db'
import { pullChanges } from './pull'

vi.mock('@/api/client', () => ({
  api: vi.fn(),
}))

const mockedApi = vi.mocked(api)

beforeEach(async () => {
  await db.delete()
  await db.open()
  mockedApi.mockReset()
})

describe('pullChanges', () => {
  it('escribe las filas que llegan en Dexie con syncState synced', async () => {
    mockedApi.mockResolvedValue({
      changes: {
        placements: [],
        hourLogs: [
          {
            id: 1,
            placementId: 7,
            date: '2026-04-01',
            startTime: '08:00',
            endTime: '12:00',
            hours: 4,
            activity: 'Soporte a planta',
            status: 'SUBMITTED',
            version: 1,
            updatedAt: '2026-04-01T12:00:00.000Z',
          },
        ],
        documents: [],
        evaluations: [],
      },
      checkpoint: 'cp-1',
      hasMore: false,
    })

    await pullChanges()

    const stored = await db.hourLogs.get(1)
    expect(stored).toMatchObject({ id: 1, placementId: 7, syncState: 'synced' })
  })

  it('borra la fila local cuando llega un tombstone (deletedAt)', async () => {
    await db.hourLogs.put({
      id: 2,
      placementId: 7,
      date: '2026-04-01',
      startTime: '08:00',
      endTime: '12:00',
      hours: 4,
      activity: 'Soporte a planta',
      status: 'SUBMITTED',
      version: 1,
      updatedAt: '2026-04-01T12:00:00.000Z',
      syncState: 'synced',
    })

    mockedApi.mockResolvedValue({
      changes: {
        placements: [],
        hourLogs: [
          {
            id: 2,
            placementId: 7,
            date: '2026-04-01',
            startTime: '08:00',
            endTime: '12:00',
            hours: 4,
            activity: 'Soporte a planta',
            status: 'SUBMITTED',
            version: 2,
            updatedAt: '2026-04-02T09:00:00.000Z',
            deletedAt: '2026-04-02T09:00:00.000Z',
          },
        ],
        documents: [],
        evaluations: [],
      },
      checkpoint: 'cp-2',
      hasMore: false,
    })

    await pullChanges()

    await expect(db.hourLogs.get(2)).resolves.toBeUndefined()
  })

  it('guarda el checkpoint devuelto por el servidor en meta', async () => {
    mockedApi.mockResolvedValue({
      changes: { placements: [], hourLogs: [], documents: [], evaluations: [] },
      checkpoint: 'checkpoint-nuevo',
      hasMore: false,
    })

    await pullChanges()

    await expect(db.meta.get('checkpoint')).resolves.toEqual({ key: 'checkpoint', value: 'checkpoint-nuevo' })
  })

  it('reenvía el checkpoint guardado como since en la siguiente llamada', async () => {
    await db.meta.put({ key: 'checkpoint', value: 'checkpoint-previo' })
    mockedApi.mockResolvedValue({
      changes: { placements: [], hourLogs: [], documents: [], evaluations: [] },
      checkpoint: 'checkpoint-siguiente',
      hasMore: false,
    })

    await pullChanges()

    const [path] = mockedApi.mock.calls[0]
    expect(path).toContain('since=checkpoint-previo')
  })
})
