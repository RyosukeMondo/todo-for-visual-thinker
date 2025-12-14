import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBoardStatus } from '@/web/hooks/useBoardStatus'
import type { BoardStatusDTO } from '@/shared/types/board'

const payload: BoardStatusDTO = {
  statuses: {
    pending: 2,
    in_progress: 1,
    completed: 0,
  },
  priorities: {
    1: 0,
    2: 1,
    3: 1,
    4: 1,
    5: 0,
  },
  categories: [
    { label: 'Research', value: 'research', color: '#60a5fa', count: 2 },
  ],
  totals: {
    total: 3,
    active: 3,
    completed: 0,
    completionRate: 0,
    lastUpdatedAt: '2024-01-01T00:00:00.000Z',
    lastCreatedAt: '2024-01-01T00:00:00.000Z',
  },
  dependencies: {
    total: 1,
    byType: {
      depends_on: 1,
      blocks: 0,
      related_to: 0,
    },
    dependentTasks: 1,
    blockingTasks: 0,
    blockedTasks: 0,
    brokenCount: 0,
    brokenRelationships: [],
  },
}

describe('useBoardStatus', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads board status snapshot from the API', async () => {
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(payload),
    })
    const { result } = renderHook(() => useBoardStatus())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual(payload)
    expect(result.current.error).toBeUndefined()
  })

  it('exposes errors and keeps previous data intact even on failure', async () => {
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(payload),
    })
    const errorResponse = {
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
    }
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(errorResponse)
    const { result } = renderHook(() => useBoardStatus())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.reload()
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Request failed: 500')
    })
    expect(result.current.data).toEqual(payload)
  })
})
