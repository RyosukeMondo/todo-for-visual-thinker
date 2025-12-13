import { ValidationError } from '@core/errors'

const HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i
const MAX_TITLE_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 2000
const CANVAS_RANGE = 100_000

export type TodoStatus = 'pending' | 'in_progress' | 'completed'
export type TodoPriority = 1 | 2 | 3 | 4 | 5
export type VisualSize = 'small' | 'medium' | 'large'

export type CanvasPosition = Readonly<{
  x: number
  y: number
}>

export interface TodoProps {
  id: string
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
  category?: string
  color: string
  icon?: string
  position: CanvasPosition
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export type CreateTodoInput = {
  id: string
  title: string
  description?: string
  priority?: TodoPriority
  category?: string
  color?: string
  icon?: string
  position?: Partial<CanvasPosition>
  status?: TodoStatus
  createdAt?: Date
}

export class Todo {
  private constructor(private readonly props: TodoProps) {
    this.ensureConsistency()
  }

  static create(input: CreateTodoInput): Todo {
    const createdAt = input.createdAt ?? new Date()
    const initialStatus = input.status ?? 'pending'
    const todo = new Todo({
      id: input.id,
      title: input.title.trim(),
      description: input.description?.trim(),
      status: initialStatus,
      priority: input.priority ?? 3,
      category: input.category?.trim(),
      color: input.color ?? '#60a5fa',
      icon: input.icon,
      position: {
        x: input.position?.x ?? 0,
        y: input.position?.y ?? 0,
      },
      createdAt,
      updatedAt: createdAt,
      completedAt: initialStatus === 'completed' ? createdAt : undefined,
    })
    return todo
  }

  static restore(props: TodoProps): Todo {
    return new Todo({
      ...props,
      title: props.title.trim(),
      description: props.description?.trim(),
      category: props.category?.trim(),
    })
  }

  get id(): string {
    return this.props.id
  }

  get title(): string {
    return this.props.title
  }

  get description(): string | undefined {
    return this.props.description
  }

  get status(): TodoStatus {
    return this.props.status
  }

  get priority(): TodoPriority {
    return this.props.priority
  }

  get category(): string | undefined {
    return this.props.category
  }

  get color(): string {
    return this.props.color
  }

  get icon(): string | undefined {
    return this.props.icon
  }

  get position(): CanvasPosition {
    return this.props.position
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt
  }

  get visualSize(): VisualSize {
    if (this.props.priority >= 5) return 'large'
    if (this.props.priority >= 3) return 'medium'
    return 'small'
  }

  rename(newTitle: string): void {
    const trimmed = newTitle.trim()
    if (trimmed === this.props.title) return
    this.assertTitle(trimmed)
    this.props.title = trimmed
    this.touch()
  }

  describe(newDescription: string | undefined): void {
    const normalized = newDescription?.trim()
    if (normalized === this.props.description) return
    if (normalized) {
      this.assertDescription(normalized)
    }
    this.props.description = normalized
    this.touch()
  }

  move(position: CanvasPosition): void {
    this.assertPosition(position)
    if (
      position.x === this.props.position.x &&
      position.y === this.props.position.y
    ) {
      return
    }
    this.props.position = { ...position }
    this.touch()
  }

  setCategory(category: string | undefined): void {
    const normalized = category?.trim()
    if (normalized === this.props.category) return
    if (normalized && normalized.length > 40) {
      throw new ValidationError('Category cannot exceed 40 characters', {
        category,
      })
    }
    this.props.category = normalized
    this.touch()
  }

  recolor(color: string): void {
    this.assertColor(color)
    if (color === this.props.color) return
    this.props.color = color
    this.touch()
  }

  setPriority(priority: TodoPriority): void {
    this.assertPriority(priority)
    if (priority === this.props.priority) return
    this.props.priority = priority
    this.touch()
  }

  markInProgress(): void {
    if (this.props.status === 'in_progress') return
    this.props.status = 'in_progress'
    this.props.completedAt = undefined
    this.touch()
  }

  markCompleted(completedAt = new Date()): void {
    if (this.props.status === 'completed') return
    this.props.status = 'completed'
    this.props.completedAt = completedAt
    this.touch()
  }

  reopen(): void {
    if (this.props.status === 'pending') return
    this.props.status = 'pending'
    this.props.completedAt = undefined
    this.touch()
  }

  toJSON(): TodoProps {
    return {
      ...this.props,
      position: { ...this.props.position },
    }
  }

  private touch(): void {
    this.props.updatedAt = new Date()
    this.ensureConsistency()
  }

  private ensureConsistency(): void {
    this.assertId(this.props.id)
    this.assertTitle(this.props.title)
    if (this.props.description) {
      this.assertDescription(this.props.description)
    }
    this.assertPriority(this.props.priority)
    this.assertColor(this.props.color)
    this.assertPosition(this.props.position)
    this.assertStatus(this.props.status, this.props.completedAt)
  }

  private assertId(id: string): void {
    if (!id || !id.trim()) {
      throw new ValidationError('Todo id is required')
    }
  }

  private assertTitle(title: string): void {
    if (!title) {
      throw new ValidationError('Title is required')
    }
    if (title.length > MAX_TITLE_LENGTH) {
      throw new ValidationError('Title exceeds maximum length', {
        max: MAX_TITLE_LENGTH,
        value: title,
      })
    }
  }

  private assertDescription(description: string): void {
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationError('Description exceeds maximum length', {
        max: MAX_DESCRIPTION_LENGTH,
      })
    }
  }

  private assertPriority(priority: number): void {
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      throw new ValidationError('Priority must be between 1 and 5', {
        priority,
      })
    }
  }

  private assertColor(color: string): void {
    if (!HEX_COLOR_REGEX.test(color)) {
      throw new ValidationError('Color must be a valid hex code', { color })
    }
  }

  private assertPosition(position: CanvasPosition): void {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new ValidationError('Position must be finite numbers', {
        position,
      })
    }
    if (
      position.x < -CANVAS_RANGE ||
      position.x > CANVAS_RANGE ||
      position.y < -CANVAS_RANGE ||
      position.y > CANVAS_RANGE
    ) {
      throw new ValidationError('Position is out of bounds', {
        range: CANVAS_RANGE,
        position,
      })
    }
  }

  private assertStatus(status: TodoStatus, completedAt?: Date): void {
    if (status === 'completed' && !completedAt) {
      throw new ValidationError('Completed todos must set completedAt timestamp')
    }
    if (status !== 'completed' && completedAt) {
      throw new ValidationError(
        'Only completed todos can have a completedAt timestamp',
        { status },
      )
    }
  }
}
