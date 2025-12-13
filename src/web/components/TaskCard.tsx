import type { CSSProperties } from 'react'

import type {
  CanvasPosition,
  TodoPriority,
  TodoStatus,
  VisualSize,
} from '@core/domain/Todo'

const STATUS_VISUALS: Record<
  TodoStatus,
  { label: string; badgeClass: string; indicator: string }
> = {
  pending: {
    label: 'Pending',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    indicator: 'bg-amber-400',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    indicator: 'bg-sky-400 animate-pulse',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    indicator: 'bg-emerald-400',
  },
}

const SIZE_STYLES: Record<VisualSize, string> = {
  small: 'min-h-[140px] p-4',
  medium: 'min-h-[180px] p-5',
  large: 'min-h-[220px] p-6',
}

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  1: 'Gentle focus',
  2: 'Emerging',
  3: 'Important',
  4: 'High impact',
  5: 'Critical',
}

const DEFAULT_COLOR = '#6366f1'

export type TaskCardProps = Readonly<{
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
  category?: string
  color?: string
  icon?: string
  position?: CanvasPosition
  size?: VisualSize
  isSelected?: boolean
  className?: string
  style?: CSSProperties
}>

export const TaskCard = ({
  title,
  description,
  status,
  priority,
  category,
  color = DEFAULT_COLOR,
  icon,
  position,
  size,
  isSelected = false,
  className,
  style,
}: TaskCardProps): JSX.Element => {
  const resolvedSize = size ?? inferSize(priority)
  const statusVisual = STATUS_VISUALS[status]
  const classes = buildCardClass(resolvedSize, isSelected, className)
  const accentStyle = buildAccentStyle(color, isSelected, style)
  const ariaLabel = `${title} • ${statusVisual.label} • Priority ${priority}`

  return (
    <article
      role="article"
      className={classes}
      data-size={resolvedSize}
      data-status={status}
      aria-label={ariaLabel}
      style={accentStyle}
    >
      <TaskCardHeader icon={icon} category={category} status={status} />
      <TaskCardBody title={title} description={description} />
      <TaskCardFooter
        priority={priority}
        position={position}
        accentColor={color}
      />
    </article>
  )
}

type TaskCardHeaderProps = Pick<TaskCardProps, 'icon' | 'category' | 'status'>

const TaskCardHeader = ({
  icon,
  category,
  status,
}: TaskCardHeaderProps): JSX.Element => {
  const statusVisual = STATUS_VISUALS[status]
  const categoryLabel = category?.trim() || 'Uncategorized'

  return (
    <header className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gray-500">
        {icon && (
          <span aria-hidden className="text-base">
            {icon}
          </span>
        )}
        {categoryLabel}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${statusVisual.badgeClass}`}
      >
        <span className={`h-2 w-2 rounded-full ${statusVisual.indicator}`} />
        {statusVisual.label}
      </span>
    </header>
  )
}

type TaskCardBodyProps = Pick<TaskCardProps, 'title' | 'description'>

const TaskCardBody = ({ title, description }: TaskCardBodyProps): JSX.Element => (
  <div className="space-y-2">
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    {description && (
      <p className="text-sm leading-relaxed text-gray-600">{description}</p>
    )}
  </div>
)

type TaskCardFooterProps = Readonly<{
  priority: TodoPriority
  position?: CanvasPosition
  accentColor: string
}>

const TaskCardFooter = ({
  priority,
  position,
  accentColor,
}: TaskCardFooterProps): JSX.Element => {
  const coordinates = formatCoordinates(position)

  return (
    <footer className="mt-auto space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>
          Priority •{' '}
          <span className="font-semibold text-gray-900">
            {PRIORITY_LABELS[priority]}
          </span>
        </span>
        {coordinates && (
          <span aria-label={`Position ${coordinates}`} className="font-semibold text-gray-700">
            ⇢ {coordinates}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <span
          className="block h-full rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
      </div>
    </footer>
  )
}

const inferSize = (priority: TodoPriority): VisualSize => {
  if (priority >= 5) return 'large'
  if (priority >= 3) return 'medium'
  return 'small'
}

const buildCardClass = (
  size: VisualSize,
  isSelected: boolean,
  extra?: string,
): string => {
  const base = 'task-card relative flex flex-col gap-4 rounded-2xl border bg-white/90 shadow-lg shadow-gray-900/5 transition-all duration-200 ease-out backdrop-blur'
  const motion = 'hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2'
  const selected = isSelected
    ? 'ring-2 ring-secondary-400 ring-offset-2 shadow-secondary-500/30'
    : 'ring-1 ring-transparent'
  return [base, motion, selected, SIZE_STYLES[size], extra]
    .filter(Boolean)
    .join(' ')
}

const buildAccentStyle = (
  color: string,
  isSelected: boolean,
  overrides?: CSSProperties,
): CSSProperties => ({
  borderTopColor: color,
  boxShadow: `${isSelected ? '0 20px 42px' : '0 14px 28px'} ${hexToRgba(color, isSelected ? 0.35 : 0.2)}`,
  ...overrides,
})

const formatCoordinates = (position?: CanvasPosition): string | undefined => {
  if (!position) return undefined
  const x = Math.round(position.x)
  const y = Math.round(position.y)
  return `${x}, ${y}`
}

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) {
    return `rgba(99, 102, 241, ${alpha})`
  }
  const value = Number.parseInt(normalized, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
