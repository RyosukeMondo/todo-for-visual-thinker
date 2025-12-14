import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'

import { useCreateTodo } from '@/web/hooks/useCreateTodo'
import type { AddTodoFormValues } from '@/web/components/AddTodoForm'

const payload: AddTodoFormValues = {
  title: 'Map dopamine cycle',
  description: 'Anchor sensory cues for calm mode',
  status: 'pending',
  priority: 3,
  category: 'Experience',
  color: '#3b82f6',
  icon: '🧠',
}

describe('useCreateTodo', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends form payloads to the API and invokes onSuccess', async () => {
    const onSuccess = vi.fn()
    const response = {
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: { todo: { id: '1' } } }),
    }
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(response)
    const { result } = renderHook(() => useCreateTodo({ onSuccess }))

    await act(async () => {
      await result.current.createTodo(payload)
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/todos',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(result.current.error).toBeUndefined()
  })

  it('surfaces API errors and keeps form data intact', async () => {
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Title missing' },
      }),
    })
    const { result } = renderHook(() => useCreateTodo())

    await act(async () => {
      await expect(result.current.createTodo(payload)).rejects.toThrow()
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Title missing')
    })
  })
})
