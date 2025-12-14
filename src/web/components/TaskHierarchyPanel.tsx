import { useMemo } from 'react'

import type { TodoStatus } from '@core/domain/Todo'

import type {
  TaskBoardRelationship,
  TaskBoardTask,
} from './TaskBoard'
import { buildTaskHierarchy } from '../utils/taskHierarchy'
import type { TaskHierarchyNode } from '@shared/utils/taskHierarchy'

const STATUS_BADGES: Record<TodoStatus, { label: string; badge: string }> = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  completed: {
    label: 'Completed',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
}

const DEFAULT_COLOR = '#94a3b8'
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const INDENT_PX = 18

export type TaskHierarchyPanelProps = Readonly<{
  tasks: readonly TaskBoardTask[]
  relationships?: readonly TaskBoardRelationship[]
  selectedTaskId?: string
  onSelectTask?: (taskId: string) => void
  className?: string
}>

export const TaskHierarchyPanel = ({
  tasks,
  relationships = [],
  selectedTaskId,
  onSelectTask,
  className,
}: TaskHierarchyPanelProps): JSX.Element => {
  const hierarchy = useMemo(
    () => buildTaskHierarchy(tasks, relationships),
    [tasks, relationships],
  )
  const hasTasks = tasks.length > 0
  const hasParentLinks = relationships.some((relationship) => relationship.type === 'parent_of')
  const containerClassName = [
    'rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-primary-500/5',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={containerClassName} aria-label="Task hierarchy panel">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-500">
          Task hierarchy
        </p>
        <h3 className="text-xl font-semibold text-gray-900">
          Nest thoughts for layered work
        </h3>
        <p className="text-sm text-gray-500">
          Parent-child links help visual thinkers chunk complex projects into digestible flows.
        </p>
      </header>
      {!hasTasks ? (
        <HierarchyEmptyState />
      ) : (
        <>
          <nav aria-label="Nested task relationships" className="mt-4">
            <ol className="space-y-1" role="list">
              {hierarchy.map((node) => (
                <HierarchyNode
                  key={node.id}
                  node={node}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={onSelectTask}
                />
              ))}
            </ol>
          </nav>
          {!hasParentLinks && (
            <p className="mt-4 text-xs text-gray-500">
              Tip:{' '}
              <code className="rounded bg-gray-100 px-2 py-0.5 font-semibold text-[0.65rem] text-gray-700">
                pnpm cli link parent-id child-id --type parent_of
              </code>{' '}
              to create nested relationships.
            </p>
          )}
        </>
      )}
    </section>
  )
}

const HierarchyEmptyState = (): JSX.Element => (
  <div className="mt-6 rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
    Seed a few todos and link them to see the hierarchy bloom.
  </div>
)

type HierarchyNodeProps = Readonly<{
  node: TaskHierarchyNode
  selectedTaskId?: string
  onSelectTask?: (taskId: string) => void
}>

const HierarchyNode = ({
  node,
  selectedTaskId,
  onSelectTask,
}: HierarchyNodeProps): JSX.Element => {
  const isSelected = node.id === selectedTaskId
  const accent = sanitizeColor(node.task.color)
  const categoryLabel = node.task.category?.trim() || 'Uncategorized'
  const badge = STATUS_BADGES[node.task.status]

  return (
    <li>
      <button
        type="button"
        className={buildNodeClasses(isSelected)}
        style={{ marginLeft: node.depth * INDENT_PX }}
        aria-pressed={isSelected}
        onClick={() => onSelectTask?.(node.id)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 text-lg shadow-inner"
            style={{ backgroundColor: `${accent}1A`, color: accent }}
            aria-hidden
          >
            {node.task.icon ?? '•'}
          </span>
          <span className="min-w-0 space-y-1">
            <span className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gray-500">
              {categoryLabel}
            </span>
            <span className="block truncate text-sm font-semibold text-gray-900">
              {node.task.title}
            </span>
          </span>
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${badge.badge}`}
        >
          {badge.label}
        </span>
      </button>
      {node.children.length > 0 && (
        <ol className="mt-1 space-y-1 border-l border-dashed border-gray-200 pl-3" role="list">
          {node.children.map((child) => (
            <HierarchyNode
              key={child.id}
              node={child}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
            />
          ))}
        </ol>
      )}
    </li>
  )
}

const buildNodeClasses = (isSelected: boolean): string => {
  const base =
    'flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2'
  const palette = isSelected
    ? 'border-secondary-300 bg-secondary-50/80 text-gray-900 shadow-inner'
    : 'border-transparent bg-white/80 text-gray-700 hover:border-primary-200 hover:bg-white'
  return `${base} ${palette}`
}

const sanitizeColor = (candidate: string | undefined): string => {
  if (candidate && COLOR_PATTERN.test(candidate)) {
    return candidate
  }
  return DEFAULT_COLOR
}
