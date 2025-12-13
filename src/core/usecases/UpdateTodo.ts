import type {
  CanvasPosition,
  Todo,
  TodoPriority,
  TodoStatus,
} from '@core/domain/Todo'
import { ValidationError, TodoNotFoundError } from '@core/errors'
import type { TodoRepository } from '@core/ports'

export type UpdateTodoInput = Readonly<{
  id: string
  title?: string
  description?: string | null
  priority?: TodoPriority
  category?: string | null
  color?: string
  icon?: string | null
  position?: Partial<CanvasPosition>
  status?: TodoStatus
}>

export type UpdateTodoDependencies = Readonly<{
  repository: TodoRepository
  clock?: () => Date
}>

export class UpdateTodo {
  constructor(private readonly deps: UpdateTodoDependencies) {}

  async execute(input: UpdateTodoInput): Promise<Todo> {
    const id = input.id?.trim()
    if (!id) {
      throw new ValidationError('Todo id is required for updates', {
        field: 'id',
      })
    }

    const todo = await this.deps.repository.findById(id)
    if (!todo) {
      throw new TodoNotFoundError(id)
    }

    const updated = this.applyChanges(todo, input)
    if (!updated) {
      throw new ValidationError('At least one property must be provided', {
        input,
      })
    }

    await this.deps.repository.save(todo)
    return todo
  }

  private applyChanges(todo: Todo, input: UpdateTodoInput): boolean {
    let touched = false
    if (input.title !== undefined) {
      touched = this.updateTitle(todo, input.title) || touched
    }
    if (input.description !== undefined) {
      touched = this.updateDescription(todo, input.description) || touched
    }
    if (input.category !== undefined) {
      touched = this.updateCategory(todo, input.category) || touched
    }
    if (typeof input.priority === 'number') {
      touched = this.updatePriority(todo, input.priority) || touched
    }
    if (input.color !== undefined) {
      touched = this.updateColor(todo, input.color) || touched
    }
    if (input.icon !== undefined) {
      touched = this.updateIcon(todo, input.icon) || touched
    }
    if (this.hasPositionUpdate(input.position)) {
      touched = this.updatePosition(todo, input.position ?? {}) || touched
    }
    if (input.status) {
      touched = this.updateStatus(todo, input.status) || touched
    }
    return touched
  }

  private hasPositionUpdate(
    position: UpdateTodoInput['position'],
  ): position is Partial<CanvasPosition> {
    if (!position) return false
    return Object.prototype.hasOwnProperty.call(position, 'x') ||
      Object.prototype.hasOwnProperty.call(position, 'y')
  }

  private transitionStatus(todo: Todo, next: TodoStatus): void {
    if (next === 'pending') {
      todo.reopen()
      return
    }
    if (next === 'in_progress') {
      todo.markInProgress()
      return
    }
    todo.markCompleted(this.deps.clock?.() ?? new Date())
  }

  private normalizeString(value?: string | null): string | undefined {
    if (!value) return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  private updateTitle(todo: Todo, value: string): boolean {
    const before = todo.title
    todo.rename(value)
    return todo.title !== before
  }

  private updateDescription(todo: Todo, value?: string | null): boolean {
    const before = todo.description
    todo.describe(this.normalizeString(value))
    return todo.description !== before
  }

  private updateCategory(todo: Todo, value?: string | null): boolean {
    const before = todo.category
    todo.setCategory(this.normalizeString(value))
    return todo.category !== before
  }

  private updatePriority(todo: Todo, priority: TodoPriority): boolean {
    const before = todo.priority
    todo.setPriority(priority)
    return todo.priority !== before
  }

  private updateColor(todo: Todo, color: string): boolean {
    const before = todo.color
    todo.recolor(color)
    return todo.color !== before
  }

  private updateIcon(todo: Todo, value?: string | null): boolean {
    const before = todo.icon
    todo.setIcon(this.normalizeString(value))
    return todo.icon !== before
  }

  private updatePosition(
    todo: Todo,
    position: Partial<CanvasPosition>,
  ): boolean {
    const previous = todo.position
    todo.move({
      x: position.x ?? previous.x,
      y: position.y ?? previous.y,
    })
    const next = todo.position
    return previous.x !== next.x || previous.y !== next.y
  }

  private updateStatus(todo: Todo, status: TodoStatus): boolean {
    if (status === todo.status) {
      return false
    }
    this.transitionStatus(todo, status)
    return true
  }
}
