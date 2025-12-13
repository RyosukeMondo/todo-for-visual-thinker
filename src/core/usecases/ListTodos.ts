import type { Todo, TodoPriority, TodoStatus } from '@core/domain/Todo'
import { ValidationError } from '@core/errors'
import type {
  ListTodosQuery,
  TodoRepository,
  ViewportFilter,
} from '@core/ports/TodoRepository'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500
const MAX_SEARCH_LENGTH = 240
const CANVAS_RANGE = 100_000
const ALLOWED_STATUSES: readonly TodoStatus[] = [
  'pending',
  'in_progress',
  'completed',
]

export type ListTodosInput = ListTodosQuery

export type ListTodosDependencies = Readonly<{
  repository: TodoRepository
}>

export class ListTodos {
  constructor(private readonly deps: ListTodosDependencies) {}

  async execute(query: ListTodosInput = {}): Promise<Todo[]> {
    const normalized = this.normalizeQuery(query)
    return this.deps.repository.list(normalized)
  }

  private normalizeQuery(query: ListTodosInput): ListTodosQuery {
    this.validateLimit(query.limit)
    this.validateOffset(query.offset)
    this.validateStatuses(query.status)
    this.validatePriorityRange(query.priorityRange)
    this.validateViewport(query.viewport)
    this.validateSort(query.sort)

    const category = query.category?.trim()
    const search = query.search?.trim()

    return {
      ...query,
      category: category || undefined,
      search: this.normalizeSearch(search),
      limit: this.normalizeLimit(query.limit),
      offset: query.offset ?? 0,
      sort: query.sort
        ? {
            field: query.sort.field,
            direction: query.sort.direction ?? 'asc',
          }
        : undefined,
    }
  }

  private normalizeSearch(search?: string): string | undefined {
    if (!search) return undefined
    if (search.length > MAX_SEARCH_LENGTH) {
      throw new ValidationError('Search term exceeds allowed length', {
        max: MAX_SEARCH_LENGTH,
      })
    }
    return search
  }

  private normalizeLimit(limit?: number): number {
    if (typeof limit !== 'number') {
      return DEFAULT_LIMIT
    }
    return Math.min(limit, MAX_LIMIT)
  }

  private validateLimit(limit?: number): void {
    if (limit === undefined) return
    if (!Number.isInteger(limit) || limit < 1) {
      throw new ValidationError('Limit must be a positive integer', {
        limit,
      })
    }
  }

  private validateOffset(offset?: number): void {
    if (offset === undefined) return
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ValidationError('Offset must be zero or a positive integer', {
        offset,
      })
    }
  }

  private validateStatuses(status?: ListTodosInput['status']): void {
    if (!status) return
    const statuses = Array.isArray(status) ? status : [status]
    const invalid = statuses.filter(
      (value) => !ALLOWED_STATUSES.includes(value),
    )
    if (invalid.length > 0) {
      throw new ValidationError('Status filter includes unknown values', {
        invalid,
      })
    }
  }

  private validatePriorityRange(
    range?: ListTodosInput['priorityRange'],
  ): void {
    if (!range) return
    this.assertPriorityValue(range.min, 'min')
    this.assertPriorityValue(range.max, 'max')
    if (
      typeof range.min === 'number' &&
      typeof range.max === 'number' &&
      range.min > range.max
    ) {
      throw new ValidationError('Priority range min must be ≤ max', {
        range,
      })
    }
  }

  private assertPriorityValue(
    value: TodoPriority | undefined,
    bound: 'min' | 'max',
  ): void {
    if (value === undefined) return
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new ValidationError('Priority bounds must be between 1 and 5', {
        bound,
        value,
      })
    }
  }

  private validateViewport(viewport?: ViewportFilter): void {
    if (!viewport) return
    this.assertViewportAxis('x', viewport.x)
    this.assertViewportAxis('y', viewport.y)
  }

  private assertViewportAxis(
    axis: 'x' | 'y',
    range: ViewportFilter['x'],
  ): void {
    if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) {
      throw new ValidationError('Viewport bounds must be finite numbers', {
        axis,
        range,
      })
    }
    if (range.min > range.max) {
      throw new ValidationError('Viewport min must be ≤ max', {
        axis,
        range,
      })
    }
    this.assertWithinCanvas(axis, range.min)
    this.assertWithinCanvas(axis, range.max)
  }

  private assertWithinCanvas(axis: 'x' | 'y', value: number): void {
    if (Math.abs(value) > CANVAS_RANGE) {
      throw new ValidationError('Viewport exceeds canvas bounds', {
        axis,
        value,
        range: CANVAS_RANGE,
      })
    }
  }

  private validateSort(sort?: ListTodosInput['sort']): void {
    if (!sort) return
    if (sort.direction && !['asc', 'desc'].includes(sort.direction)) {
      throw new ValidationError('Sort direction must be asc or desc', {
        direction: sort.direction,
      })
    }
  }
}
