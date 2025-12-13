import type { Todo } from '@core/domain/Todo'
import { DomainError } from '@core/errors'

export type SerializedTodo = Omit<
  ReturnType<Todo['toJSON']>,
  'createdAt' | 'updatedAt' | 'completedAt'
> & {
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export type JsonError = Readonly<{
  code: string
  message: string
  context?: Record<string, unknown>
}>

export const serializeTodo = (todo: Todo): SerializedTodo => {
  const props = todo.toJSON()
  return {
    ...props,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
    completedAt: props.completedAt?.toISOString(),
  }
}

export const serializeError = (error: unknown): JsonError => {
  if (error instanceof DomainError) {
    return {
      code: error.code,
      message: error.message,
      context: error.context,
    }
  }
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    }
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: 'Unexpected CLI failure',
  }
}
