import { useMemo } from 'react'

import type { TodoPriority, TodoStatus } from '@core/domain/Todo'

import type { TaskCardProps } from './TaskCard'

const STATUS_METADATA: Record<
  TodoStatus,
  { label: string; description: string; badgeClass: string }
> = {
  pending: {
    label: 'Pending',
    description: 'Ideas waiting to land',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  in_progress: {
    label: 'In Progress',
    description: 'Energy currently in motion',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
  },
  completed: {
    label: 'Completed',
    description: 'Wins reinforcing progress',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
}

const STATUS_SEQUENCE: readonly TodoStatus[] = ['pending', 'in_progress', 'completed']

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  1: 'Gentle focus',
  2: 'Emerging',
  3: 'Important',
  4: 'High impact',
  5: 'Critical',
}

const DEFAULT_COLOR = '#6366f1'

export type TodoListTask = TaskCardProps &
  Readonly<{
    id: string
    createdAt?: Date
    updatedAt?: Date
  }>

export type TodoListProps = Readonly<{
  tasks: readonly TodoListTask[]
  selectedId?: string
  onSelect?: (taskId: string) => void
  className?: string
  emptyState?: React.ReactNode
}>

type StatusSection = Readonly<{
  status: TodoStatus
  tasks: TodoListTask[]
}>

export const TodoList = ({
  tasks,
  selectedId,
  onSelect,
  className,
  emptyState,
}: TodoListProps): JSX.Element => {
  const sections = useMemo(() => groupTasksByStatus(tasks), [tasks])
  const containerClasses = useMemo(() => buildContainerClasses(className), [className])

  const hasTasks = sections.some((section) => section.tasks.length > 0)
  if (!hasTasks) {
    return (
      <section className={containerClasses} aria-label="Task list">
        {emptyState ?? <TodoListEmptyState />}
      </section>
    )
  }

  return (
    <section className={containerClasses} aria-label="Task list">
      <div className="space-y-8">
        {sections.map((section) => (
          <StatusSectionView
            key={section.status}
            section={section}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}

const StatusSectionView = ({
  section,
  selectedId,
  onSelect,
}: {
  section: StatusSection
  selectedId?: string
  onSelect?: (taskId: string) => void
}): JSX.Element | null => {
  if (section.tasks.length === 0) {
    return null
  }

  const statusMeta = STATUS_METADATA[section.status]

  return (
    <div className="space-y-3" data-testid={`todo-list-section-${section.status}`}>
      <header className="flex flex-col gap-1 text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
            {statusMeta.label}
          </p>
          <p className="text-sm text-gray-500">{statusMeta.description}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow">
          <span
            className={`flex h-2 w-2 rounded-full border ${statusMeta.badgeClass}`}
            aria-hidden
          />
          {section.tasks.length} tasks
        </span>
      </header>
      <ol className="space-y-2" role="list">
        {section.tasks.map((task) => (
          <li key={task.id}>
            <TodoListRow task={task} isSelected={task.id === selectedId} onSelect={onSelect} />
          </li>
        ))}
      </ol>
    </div>
  )
}

const TodoListRow = ({
  task,
  onSelect,
  isSelected,
}: {
  task: TodoListTask
  isSelected: boolean
  onSelect?: (taskId: string) => void
}): JSX.Element => (
  <button
    type="button"
    className={buildRowClasses(isSelected)}
    aria-pressed={isSelected}
    onClick={() => onSelect?.(task.id)}
  >
    <RowPrimaryContent task={task} />
    <RowSecondaryContent task={task} />
  </button>
)

const RowPrimaryContent = ({ task }: { task: TodoListTask }): JSX.Element => {
  const accent = sanitizeColor(task.color)
  const categoryLabel = task.category?.trim() || 'Uncategorized'

  return (
    <span className="flex min-w-0 flex-1 items-center gap-4 text-left">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 text-lg font-semibold shadow-inner"
        style={{ backgroundColor: `${accent}1A`, color: accent }}
        aria-hidden
      >
        {task.icon ?? '•'}
      </span>
      <span className="min-w-0 space-y-1">
        <span className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-gray-500">
          {categoryLabel}
        </span>
        <span className="block text-lg font-semibold text-gray-900">{task.title}</span>
        {task.description && (
          <p className="line-clamp-2 text-sm text-gray-500">{task.description}</p>
        )}
      </span>
    </span>
  )
}

const RowSecondaryContent = ({ task }: { task: TodoListTask }): JSX.Element => {
  const statusMeta = STATUS_METADATA[task.status]

  return (
    <span className="flex items-center gap-3 text-xs text-gray-500">
      <span className="font-semibold text-gray-700">{PRIORITY_LABELS[task.priority]}</span>
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold ${statusMeta.badgeClass}`}
      >
        <span
          className={`h-2 w-2 rounded-full ${statusMeta.badgeClass.split(' ')[0]}`}
          aria-hidden
        />
        {statusMeta.label}
      </span>
    </span>
  )
}

const TodoListEmptyState = (): JSX.Element => (
  <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-white to-primary-50/50 p-12 text-center text-gray-600">
    <span className="text-4xl" aria-hidden>
      🧠
    </span>
    <div className="space-y-2">
      <p className="text-lg font-semibold text-gray-900">Spatial quiet — ready for focus</p>
      <p className="text-sm text-gray-500">
        Add a task to anchor your visual board. Every card becomes a tangible thought.
      </p>
    </div>
  </div>
)

const groupTasksByStatus = (tasks: readonly TodoListTask[]): StatusSection[] => {
  const grouped = STATUS_SEQUENCE.reduce<Record<TodoStatus, TodoListTask[]>>((acc, status) => {
    acc[status] = []
    return acc
  }, Object.create(null))

  tasks.forEach((task) => {
    const bucket = grouped[task.status]
    if (!bucket) {
      grouped[task.status] = [task]
      return
    }
    bucket.push(task)
  })

  return STATUS_SEQUENCE.map((status) => ({
    status,
    tasks: sortTasks(grouped[status] ?? []),
  }))
}

const sortTasks = (tasks: readonly TodoListTask[]): TodoListTask[] =>
  [...tasks].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }
    return a.title.localeCompare(b.title)
  })

const buildContainerClasses = (className?: string): string =>
  [
    'todo-list space-y-8 rounded-[2.5rem] border border-white/40 bg-white/80 p-6 shadow-2xl shadow-primary-500/10 backdrop-blur',
    className,
  ]
    .filter(Boolean)
    .join(' ')

const buildRowClasses = (isSelected: boolean): string => {
  const base =
    'w-full rounded-2xl border border-transparent bg-white/90 px-4 py-3 transition hover:-translate-y-0.5 hover:border-primary-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2'
  const selected = isSelected ? 'ring-2 ring-secondary-400 shadow-secondary-500/20' : 'shadow-sm'
  return `${base} ${selected}`
}

const sanitizeColor = (candidate?: string): string => {
  if (!candidate) return DEFAULT_COLOR
  const trimmed = candidate.trim()
  if (/^#([0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed
  }
  return DEFAULT_COLOR
}
