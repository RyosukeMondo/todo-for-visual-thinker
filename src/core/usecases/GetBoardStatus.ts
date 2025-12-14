import type { Todo, TodoPriority, TodoStatus } from '@core/domain/Todo'
import type { Relationship, RelationshipType } from '@core/domain/Relationship'
import type { TodoRepository } from '@core/ports'
import type { RelationshipRepository } from '@core/ports/RelationshipRepository'

const STATUS_SEQUENCE: readonly TodoStatus[] = [
  'pending',
  'in_progress',
  'completed',
]

const PRIORITY_SEQUENCE: readonly TodoPriority[] = [1, 2, 3, 4, 5]
const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  'depends_on',
  'blocks',
  'related_to',
]
const DEFAULT_BATCH_SIZE = 250

export type BoardStatusCategory = Readonly<{
  label: string
  value: string
  color?: string
  count: number
}>

export type BoardStatusSnapshot = Readonly<{
  total: number
  active: number
  completed: number
  completionRate: number
  statuses: Record<TodoStatus, number>
  priorities: Record<TodoPriority, number>
  categories: readonly BoardStatusCategory[]
  lastUpdatedAt?: Date
  lastCreatedAt?: Date
  dependencies: DependencyChainHealth
}>

export type DependencyChainHealth = Readonly<{
  total: number
  byType: Record<RelationshipType, number>
  dependentTasks: number
  blockingTasks: number
  blockedTasks: number
  brokenCount: number
  brokenRelationships: readonly DependencyBreak[]
}>

export type DependencyBreak = Readonly<{
  id: string
  missingEndpoint: 'source' | 'target'
  missingTaskId: string
  type: RelationshipType
}>

export type GetBoardStatusDependencies = Readonly<{
  repository: TodoRepository
  relationships: RelationshipRepository
  batchSize?: number
}>

export class GetBoardStatus {
  private readonly batchSize: number

  constructor(private readonly deps: GetBoardStatusDependencies) {
    this.batchSize = deps.batchSize ?? DEFAULT_BATCH_SIZE
  }

  async execute(): Promise<BoardStatusSnapshot> {
    const statusCounts = this.initializeStatusCounts()
    const priorityCounts = this.initializePriorityCounts()
    const categories = new Map<string, BoardStatusCategory>()
    const taskIds = new Set<string>()

    let total = 0
    let lastUpdatedAt: Date | undefined
    let lastCreatedAt: Date | undefined

    for await (const todo of this.streamAllTodos()) {
      total += 1
      taskIds.add(todo.id)
      statusCounts[todo.status] += 1
      priorityCounts[todo.priority] += 1

      if (!lastUpdatedAt || todo.updatedAt > lastUpdatedAt) {
        lastUpdatedAt = todo.updatedAt
      }

      if (!lastCreatedAt || todo.createdAt > lastCreatedAt) {
        lastCreatedAt = todo.createdAt
      }

      this.trackCategory(categories, todo)
    }

    const active = statusCounts.pending + statusCounts.in_progress
    const completionRate = total === 0 ? 0 : statusCounts.completed / total
    const dependencies = await this.analyzeDependencies(taskIds)

    return {
      total,
      active,
      completed: statusCounts.completed,
      completionRate,
      statuses: statusCounts,
      priorities: priorityCounts,
      categories: this.sortCategories(categories),
      lastUpdatedAt,
      lastCreatedAt,
      dependencies,
    }
  }

  private initializeStatusCounts(): Record<TodoStatus, number> {
    return STATUS_SEQUENCE.reduce<Record<TodoStatus, number>>((acc, status) => {
      acc[status] = 0
      return acc
    }, Object.create(null))
  }

  private initializePriorityCounts(): Record<TodoPriority, number> {
    return PRIORITY_SEQUENCE.reduce<Record<TodoPriority, number>>(
      (acc, priority) => {
        acc[priority] = 0
        return acc
      },
      Object.create(null),
    )
  }

  private async *streamAllTodos(): AsyncGenerator<Todo, void, void> {
    let offset = 0
    let fetched: Todo[]
    do {
      fetched = await this.deps.repository.list({
        limit: this.batchSize,
        offset,
      })
      for (const todo of fetched) {
        yield todo
      }
      offset += fetched.length
    } while (fetched.length === this.batchSize)
  }

  private async *streamAllRelationships(): AsyncGenerator<Relationship, void, void> {
    let offset = 0
    let fetched: Relationship[]
    do {
      fetched = await this.deps.relationships.list({
        limit: this.batchSize,
        offset,
      })
      for (const relationship of fetched) {
        yield relationship
      }
      offset += fetched.length
    } while (fetched.length === this.batchSize)
  }

  private trackCategory(
    categories: Map<string, BoardStatusCategory>,
    todo: Todo,
  ): void {
    const label = todo.category?.trim() || 'Uncategorized'
    const value = label.toLowerCase()
    const existing = categories.get(value)
    if (existing) {
      categories.set(value, {
        ...existing,
        count: existing.count + 1,
      })
      return
    }

    categories.set(value, {
      label,
      value,
      color: todo.color,
      count: 1,
    })
  }

  private sortCategories(
    categories: Map<string, BoardStatusCategory>,
  ): BoardStatusCategory[] {
    return Array.from(categories.values()).sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count
      }
      return a.label.localeCompare(b.label)
    })
  }

  private initializeRelationshipCounts(): Record<RelationshipType, number> {
    return RELATIONSHIP_TYPES.reduce<Record<RelationshipType, number>>(
      (acc, type) => {
        acc[type] = 0
        return acc
      },
      Object.create(null),
    )
  }

  private async analyzeDependencies(
    taskIds: Set<string>,
  ): Promise<DependencyChainHealth> {
    const tracker = this.createDependencyTracker(taskIds)
    for await (const relationship of this.streamAllRelationships()) {
      tracker.process(relationship)
    }
    return tracker.snapshot()
  }

  private createDependencyTracker(taskIds: Set<string>) {
    const byType = this.initializeRelationshipCounts()
    const dependentTasks = new Set<string>()
    const blockingTasks = new Set<string>()
    const blockedTasks = new Set<string>()
    const brokenRelationships: DependencyBreak[] = []
    let total = 0
    let brokenCount = 0

    return {
      process: (relationship: Relationship) => {
        total += 1
        byType[relationship.type] += 1
        this.trackTaskRoles({ relationship, dependentTasks, blockingTasks, blockedTasks })
        this.trackBrokenEndpoints({
          relationship,
          taskIds,
          brokenRelationships,
          incrementBroken: () => {
            brokenCount += 1
          },
        })
      },
      snapshot: (): DependencyChainHealth => ({
        total,
        byType,
        dependentTasks: dependentTasks.size,
        blockingTasks: blockingTasks.size,
        blockedTasks: blockedTasks.size,
        brokenCount,
        brokenRelationships,
      }),
    }
  }

  private trackTaskRoles({
    relationship,
    dependentTasks,
    blockingTasks,
    blockedTasks,
  }: {
    relationship: Relationship
    dependentTasks: Set<string>
    blockingTasks: Set<string>
    blockedTasks: Set<string>
  }): void {
    if (relationship.type === 'depends_on') {
      dependentTasks.add(relationship.fromId)
    }
    if (relationship.type === 'blocks') {
      blockingTasks.add(relationship.fromId)
      blockedTasks.add(relationship.toId)
    }
  }

  private trackBrokenEndpoints({
    relationship,
    taskIds,
    brokenRelationships,
    incrementBroken,
  }: {
    relationship: Relationship
    taskIds: Set<string>
    brokenRelationships: DependencyBreak[]
    incrementBroken: () => void
  }): void {
    const missingSource = !taskIds.has(relationship.fromId)
    const missingTarget = !taskIds.has(relationship.toId)

    if (missingSource) {
      brokenRelationships.push({
        id: relationship.id,
        missingEndpoint: 'source',
        missingTaskId: relationship.fromId,
        type: relationship.type,
      })
      incrementBroken()
    }

    if (missingTarget) {
      brokenRelationships.push({
        id: relationship.id,
        missingEndpoint: 'target',
        missingTaskId: relationship.toId,
        type: relationship.type,
      })
      incrementBroken()
    }
  }
}
