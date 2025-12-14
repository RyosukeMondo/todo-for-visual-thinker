import type { Todo } from '@core/domain/Todo'
import type { Relationship } from '@core/domain/Relationship'
import type { Category } from '@core/domain/Category'
import { DomainError } from '@core/errors'
import type { JsonError, TodoDTO } from '@shared/types/api'

export const serializeTodo = (todo: Todo): TodoDTO => {
  const props = todo.toJSON()
  return {
    ...props,
    visualSize: todo.visualSize,
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
