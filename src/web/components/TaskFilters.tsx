import type { TodoStatus } from '@core/domain/Todo'

import type { TaskFilterState } from '../utils/taskFilters'
import type { CategoryOption } from '../hooks/useTaskFilters'

const STATUS_META: Record<
  TodoStatus,
  { label: string; description: string; accent: string; pulse?: boolean }
> = {
  pending: {
    label: 'Pending',
    description: 'Ideas incubating until you are ready to move',
    accent: '#f59e0b',
  },
  in_progress: {
    label: 'In progress',
    description: 'Energy is flowing here—keep momentum alive',
    accent: '#0ea5e9',
    pulse: true,
  },
  completed: {
    label: 'Completed',
    description: 'Wins worth celebrating and learning from',
    accent: '#10b981',
  },
}

export type CategoryFilterOption = CategoryOption

export type TaskFiltersProps = Readonly<{
  statuses: readonly TodoStatus[]
  categories: readonly CategoryFilterOption[]
  value: TaskFilterState
  onStatusToggle: (status: TodoStatus) => void
  onCategoryToggle: (value: string) => void
  onClearCategories: () => void
}>

export const TaskFilters = (props: TaskFiltersProps): JSX.Element => (
  <TaskFiltersView {...props} canClearCategories={props.value.categories.size > 0} />
)

type TaskFiltersViewProps = TaskFiltersProps & { canClearCategories: boolean }

const TaskFiltersView = ({
  statuses,
  categories,
  value,
  onStatusToggle,
  onCategoryToggle,
  onClearCategories,
  canClearCategories,
}: TaskFiltersViewProps): JSX.Element => (
  <section className="task-filters rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-2xl shadow-primary-500/10">
    <TaskFiltersHeader />
    <div className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
      <StatusFilterSection
        statuses={statuses}
        value={value}
        onToggle={onStatusToggle}
      />
      <CategoryFilterSection
        categories={categories}
        value={value}
        onToggle={onCategoryToggle}
        onClear={onClearCategories}
        canClear={canClearCategories}
      />
    </div>
  </section>
)

const TaskFiltersHeader = (): JSX.Element => (
  <header className="flex flex-col gap-2 pb-6">
    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-500">
      Smart categorization
    </p>
    <h2 className="text-2xl font-semibold text-gray-900">
      Layer filters to spotlight the work that matters right now
    </h2>
    <p className="text-sm text-gray-600">
      Combine status energy, category color, and spatial awareness to create a cognitive map that adapts in real time.
    </p>
  </header>
)

const StatusFilterSection = ({
  statuses,
  value,
  onToggle,
}: {
  statuses: readonly TodoStatus[]
  value: TaskFilterState
  onToggle: (status: TodoStatus) => void
}): JSX.Element => (
  <FilterGroup
    title="Status energy"
    description="Toggle which states are visible on the canvas"
  >
    <div className="grid gap-3 md:grid-cols-3">
      {statuses.map((status) => (
        <StatusButton
          key={status}
          status={status}
          isActive={value.statuses.has(status)}
          onToggle={onToggle}
        />
      ))}
    </div>
  </FilterGroup>
)

const CategoryFilterSection = ({
  categories,
  value,
  onToggle,
  onClear,
  canClear,
}: {
  categories: readonly CategoryFilterOption[]
  value: TaskFilterState
  onToggle: (value: string) => void
  onClear: () => void
  canClear: boolean
}): JSX.Element => (
  <FilterGroup
    title="Visual categories"
    description="Stack color-coded clusters to focus a theme"
    actionLabel="Show all"
    onAction={canClear ? onClear : undefined}
  >
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <CategoryChip
          key={category.value}
          label={category.label}
          color={category.color}
          isActive={value.categories.has(category.value)}
          onToggle={() => onToggle(category.value)}
        />
      ))}
    </div>
  </FilterGroup>
)

const FilterGroup = ({
  title,
  description,
  children,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  children: React.ReactNode
  actionLabel?: string
  onAction?: () => void
}): JSX.Element => (
  <section className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-lg shadow-gray-900/5">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
          {title}
        </h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      {onAction && actionLabel && (
        <button
          type="button"
          className="text-xs font-semibold text-primary-600 transition hover:text-primary-500"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
    {children}
  </section>
)

const StatusButton = ({
  status,
  isActive,
  onToggle,
}: {
  status: TodoStatus
  isActive: boolean
  onToggle: (status: TodoStatus) => void
}): JSX.Element => {
  const meta = STATUS_META[status]
  const buttonClass = [
    'flex h-full flex-col gap-1 rounded-2xl border p-4 text-left transition duration-200',
    isActive
      ? 'border-transparent bg-gradient-to-br from-white via-white to-primary-50 shadow-lg shadow-primary-500/20 ring-2 ring-primary-400'
      : 'border-gray-200 bg-white/60 hover:border-primary-200 hover:bg-white',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={buttonClass}
      onClick={() => onToggle(status)}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <span
          aria-hidden
          className={`h-2.5 w-2.5 rounded-full ${meta.pulse ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: meta.accent }}
        />
        {meta.label}
      </span>
      <span className="text-xs text-gray-600">{meta.description}</span>
    </button>
  )
}

const CategoryChip = ({
  label,
  color,
  isActive,
  onToggle,
}: {
  label: string
  color?: string
  isActive: boolean
  onToggle: () => void
}): JSX.Element => {
  const accent = color ?? '#6366f1'
  const classes = [
    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition',
    isActive
      ? 'border-transparent text-white shadow-lg'
      : 'border-gray-200 text-gray-600 hover:border-primary-200 hover:text-primary-600',
  ].join(' ')

  const style = isActive
    ? {
        backgroundImage: `linear-gradient(120deg, ${accent}, #4338ca)` as const,
      }
    : { backgroundColor: 'rgba(255,255,255,0.9)' as const }

  return (
    <button
      type="button"
      className={classes}
      style={style}
      onClick={onToggle}
      aria-pressed={isActive}
    >
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: accent }}
      />
      {label}
    </button>
  )
}
