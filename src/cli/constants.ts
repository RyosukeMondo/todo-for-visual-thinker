import type { TodoStatus } from '@core/domain/Todo'
import type { TodoSortField } from '@core/ports/TodoRepository'

export const ALLOWED_STATUSES: readonly TodoStatus[] = [
  'pending',
  'in_progress',
  'completed',
] as const

export const ALLOWED_SORT_FIELDS: readonly TodoSortField[] = [
  'priority',
  'createdAt',
  'updatedAt',
] as const
