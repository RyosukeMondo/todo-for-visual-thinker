import type { TodoPriority, TodoStatus } from '@core/domain/Todo'
import type { TodoDTO } from '@shared/types/api'

const STATUS_LABELS: Record<TodoStatus, string> = {
  pending: 'Pending • Idea incubating',
  in_progress: 'In Progress • Energy in motion',
  completed: 'Completed • Momentum locked',
}

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  1: 'Gentle focus',
  2: 'Emerging',
  3: 'Important',
  4: 'High impact',
  5: 'Critical',
}

const SECTION_DIVIDER = '────────────────────────────────────────────'

export const formatTodoList = (todos: readonly TodoDTO[]): string => {
  if (todos.length === 0) {
    return ['Visual Task Board (0 tasks)', '└─ No todos match the current filters.', ''].join(
      '\n',
    )
  }

  const lines = [`Visual Task Board (${todos.length} task${todos.length === 1 ? '' : 's'})`]
  lines.push(SECTION_DIVIDER)
  todos.forEach((todo, index) => {
    lines.push(formatTodoEntry(todo, index + 1))
    if (index < todos.length - 1) {
      lines.push(SECTION_DIVIDER)
    }
  })
  lines.push('')
  return lines.join('\n')
}

const formatTodoEntry = (todo: TodoDTO, order: number): string => {
  const header = `${padOrder(order)} ${todo.title}`
  const description = todo.description ? `    ${todo.description}` : undefined
  const metadata: ReadonlyArray<readonly [string, string | undefined]> = [
    ['ID', todo.id],
    ['Status', STATUS_LABELS[todo.status]],
    ['Priority', `P${todo.priority} • ${PRIORITY_LABELS[todo.priority]}`],
    ['Category', todo.category ?? 'Uncategorized'],
    ['Icon', todo.icon ?? '—'],
    ['Color', todo.color.toUpperCase()],
    ['Position', formatPosition(todo.position)],
    ['Updated', formatTimestamp(todo.updatedAt)],
  ]

  const metaLines = metadata.map(
    ([label, value]) => `    ${label.padEnd(9, ' ')} ${value ?? '—'}`,
  )

  return [header, description, ...metaLines].filter(Boolean).join('\n')
}

const padOrder = (order: number): string => order.toString().padStart(2, '0') + '.'

const formatPosition = (
  position: TodoDTO['position'] | undefined,
): string => {
  if (!position) {
    return 'Unplaced'
  }
  const x = Math.round(position.x)
  const y = Math.round(position.y)
  return `(${x}, ${y})`
}

const formatTimestamp = (iso: string | undefined): string => {
  if (!iso) return '—'
  const time = Date.parse(iso)
  if (Number.isNaN(time)) {
    return iso
  }
  const date = new Date(time).toISOString()
  return `${date.slice(0, 19).replace('T', ' ')}Z`
}
