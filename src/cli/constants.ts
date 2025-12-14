import type { TodoStatus } from '@core/domain/Todo'
import type { RelationshipType } from '@core/domain/Relationship'
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

export const ALLOWED_RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  'depends_on',
  'blocks',
  'related_to',
  'parent_of',
] as const
