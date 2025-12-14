import type {
  CanvasPosition,
  Todo,
  TodoPriority,
  TodoStatus,
} from '@core/domain/Todo'
import type {
  ListTodosQuery,
  TodoRepository,
  ViewportFilter,
} from '@core/ports/TodoRepository'

const STATUS_SEQUENCE: readonly TodoStatus[] = ['pending', 'in_progress', 'completed']
const PRIORITY_SEQUENCE: readonly TodoPriority[] = [1, 2, 3, 4, 5]
const DEFAULT_VIEWPORT_PADDING = 240
const MIN_VIEWPORT_SIZE = 480

export type SnapshotTotals = Readonly<{
  count: number
  statuses: Record<TodoStatus, number>
  priorities: Record<TodoPriority, number>
}>

export type CanvasBounds = Readonly<{
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
  center: CanvasPosition
}>

export type SnapshotViewport = ViewportFilter &
  Readonly<{
    width: number
    height: number
    padding: number
  }>

export type BoardSnapshot = Readonly<{
  tasks: readonly Todo[]
  totals: SnapshotTotals
  bounds: CanvasBounds
  viewport: SnapshotViewport
}>

export type GetBoardSnapshotDependencies = Readonly<{
  repository: TodoRepository
  viewportPadding?: number
  minViewportSize?: number
}>

export class GetBoardSnapshot {
  private readonly padding: number
  private readonly minViewportSize: number

  constructor(private readonly deps: GetBoardSnapshotDependencies) {
    this.padding = deps.viewportPadding ?? DEFAULT_VIEWPORT_PADDING
    this.minViewportSize = deps.minViewportSize ?? MIN_VIEWPORT_SIZE
  }

  async execute(query: ListTodosQuery = {}): Promise<BoardSnapshot> {
    const tasks = await this.deps.repository.list(query)
    const totals = this.aggregateTotals(tasks)
    const bounds = this.calculateBounds(tasks)
    const viewport = this.buildViewport(bounds)
    return { tasks, totals, bounds, viewport }
  }

  private aggregateTotals(tasks: readonly Todo[]): SnapshotTotals {
    const statuses = STATUS_SEQUENCE.reduce<Record<TodoStatus, number>>(
      (acc, status) => ({
        ...acc,
        [status]: 0,
      }),
      Object.create(null),
    )
    const priorities = PRIORITY_SEQUENCE.reduce<Record<TodoPriority, number>>(
      (acc, priority) => ({
        ...acc,
        [priority]: 0,
      }),
      Object.create(null),
    )

    tasks.forEach((todo) => {
      statuses[todo.status] += 1
      priorities[todo.priority] += 1
    })

    return {
      count: tasks.length,
      statuses,
      priorities,
    }
  }

  private calculateBounds(tasks: readonly Todo[]): CanvasBounds {
    if (tasks.length === 0) {
      return {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        width: 0,
        height: 0,
        center: { x: 0, y: 0 },
      }
    }

    let minX = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    tasks.forEach((todo) => {
      const { x, y } = todo.position
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    })

    const width = maxX - minX
    const height = maxY - minY
    const center = {
      x: minX + width / 2,
      y: minY + height / 2,
    }

    return { minX, maxX, minY, maxY, width, height, center }
  }

  private buildViewport(bounds: CanvasBounds): SnapshotViewport {
    const width = Math.max(bounds.width + this.padding * 2, this.minViewportSize)
    const height = Math.max(bounds.height + this.padding * 2, this.minViewportSize)
    const halfWidth = width / 2
    const halfHeight = height / 2
    const centerX = bounds.center.x
    const centerY = bounds.center.y

    return {
      width,
      height,
      padding: this.padding,
      x: { min: centerX - halfWidth, max: centerX + halfWidth },
      y: { min: centerY - halfHeight, max: centerY + halfHeight },
    }
  }
}
