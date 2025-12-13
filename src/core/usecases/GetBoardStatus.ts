import type { Todo, TodoPriority, TodoStatus } from '@core/domain/Todo'
import type { TodoRepository } from '@core/ports'

const STATUS_SEQUENCE: readonly TodoStatus[] = [
  'pending',
  'in_progress',
  'completed',
]

const PRIORITY_SEQUENCE: readonly TodoPriority[] = [1, 2, 3, 4, 5]
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
}>

export type GetBoardStatusDependencies = Readonly<{
  repository: TodoRepository
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

    let total = 0
    let lastUpdatedAt: Date | undefined
    let lastCreatedAt: Date | undefined

    for await (const todo of this.streamAllTodos()) {
      total += 1
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
}
