import type { Todo } from '@core/domain/Todo'
import type { Relationship } from '@core/domain/Relationship'
import type { Category } from '@core/domain/Category'
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

export type SerializedRelationship = Omit<
  ReturnType<Relationship['toJSON']>,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string
  updatedAt: string
}

export const serializeRelationship = (
  relationship: Relationship,
): SerializedRelationship => {
  const props = relationship.toJSON()
  return {
    ...props,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  }
}

export type SerializedCategory = Omit<
  ReturnType<Category['toJSON']>,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string
  updatedAt: string
}

export const serializeCategory = (category: Category): SerializedCategory => {
  const props = category.toJSON()
  return {
    ...props,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
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
