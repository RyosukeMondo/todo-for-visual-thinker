import { useCallback, useState } from 'react'

import type { AddTodoFormValues } from '../components/AddTodoForm'
import type {
  CreateTodoResultDTO,
  TodoDTO,
} from '@shared/types/api'

export type UseCreateTodoOptions = Readonly<{
  onSuccess?: (todo: TodoDTO) => void | Promise<void>
}>

export type UseCreateTodoResult = Readonly<{
  createTodo: (values: AddTodoFormValues) => Promise<void>
  isSubmitting: boolean
  error?: string
}>

export const useCreateTodo = (
  options: UseCreateTodoOptions = {},
): UseCreateTodoResult => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const onSuccess = options.onSuccess

  const createTodo = useCallback(
    async (values: AddTodoFormValues) => {
      setIsSubmitting(true)
      setError(undefined)
      try {
        const response = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const payload = (await response.json()) as CreateTodoResultDTO
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? 'Failed to create todo' : payload.error.message)
        }
        await onSuccess?.(payload.data.todo)
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : 'Unable to create todo at this time'
        setError(message)
        throw (cause instanceof Error ? cause : new Error(message))
      } finally {
        setIsSubmitting(false)
      }
    },
    [onSuccess],
  )

  return {
    createTodo,
    isSubmitting,
    error,
  }
}
