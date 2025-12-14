import type {
  CanvasPosition,
  TodoPriority,
  TodoStatus,
  VisualSize,
} from '@core/domain/Todo'
import type { RelationshipType } from '@core/domain/Relationship'
import type {
  SnapshotTotals,
  SnapshotViewport,
} from '@core/usecases/GetBoardSnapshot'

export type BoardTaskDTO = Readonly<{
  id: string
  title: string
  description?: string | null
  status: TodoStatus
  priority: TodoPriority
  category?: string | null
  color: string
  icon?: string | null
  position: CanvasPosition
  visualSize: VisualSize
  createdAt: string
  updatedAt: string
  completedAt?: string | null
}>

export type BoardRelationshipDTO = Readonly<{
  id: string
  fromId: string
  toId: string
  type: RelationshipType
  color?: string
}>

export type BoardSnapshotDTO = Readonly<{
  tasks: BoardTaskDTO[]
  relationships: BoardRelationshipDTO[]
  totals: SnapshotTotals
  viewport: SnapshotViewport
}>

export type BoardStatusCategoryDTO = Readonly<{
  label: string
  value: string
  color?: string
  count: number
}>

export type BoardDependencyBreakDTO = Readonly<{
  id: string
  missingEndpoint: 'source' | 'target'
  missingTaskId: string
  type: RelationshipType
}>

export type BoardDependencyHealthDTO = Readonly<{
  total: number
  byType: Record<RelationshipType, number>
  dependentTasks: number
  blockingTasks: number
  blockedTasks: number
  brokenCount: number
  brokenRelationships: readonly BoardDependencyBreakDTO[]
}>

export type BoardStatusDTO = Readonly<{
  statuses: Record<TodoStatus, number>
  priorities: Record<TodoPriority, number>
  categories: readonly BoardStatusCategoryDTO[]
  totals: Readonly<{
    total: number
    active: number
    completed: number
    completionRate: number
    lastUpdatedAt?: string
    lastCreatedAt?: string
  }>
  dependencies: BoardDependencyHealthDTO
}>
