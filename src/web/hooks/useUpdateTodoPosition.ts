import { useCallback, useState } from 'react'

import type { CanvasPosition } from '@core/domain/Todo'
import type { UpdateTodoResultDTO } from '@shared/types/api'

export type UseUpdateTodoPositionResult = Readonly<{
  updatePosition: (id: string, position: CanvasPosition) => Promise<void>
  isUpdating: boolean
  error?: string
}>

export const useUpdateTodoPosition = (): UseUpdateTodoPositionResult => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string>()

  const updatePosition = useCallback(async (id: string, position: CanvasPosition) => {
    setIsUpdating(true)
    setError(undefined)
    try {
      const response = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      })
      const payload = (await response.json()) as UpdateTodoResultDTO
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? 'Failed to update todo' : payload.error.message)
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to reposition task'
      setError(message)
      throw (cause instanceof Error ? cause : new Error(message))
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    updatePosition,
    isUpdating,
    error,
  }
}
