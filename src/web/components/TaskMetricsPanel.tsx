import { useMemo } from 'react'

import type { TaskBoardTask } from './TaskBoard'
import {
  PRIORITY_META,
  PRIORITY_SEQUENCE,
  STATUS_META,
  STATUS_SEQUENCE,
  type TaskMetricsSummary,
  summarizeTasks,
} from './TaskMetricsPanel.metrics'

export type TaskMetricsPanelProps = Readonly<{
  tasks: readonly TaskBoardTask[]
  className?: string
  title?: string
}>

export const TaskMetricsPanel = ({
  tasks,
  className,
  title = 'Board health',
}: TaskMetricsPanelProps): JSX.Element => {
  const metrics = useMemo(() => summarizeTasks(tasks), [tasks])
  const percent = Math.round(metrics.completionRate * 100)
  const containerClassName = [
    'rounded-[2rem] border border-white/20 bg-slate-950 text-white shadow-2xl shadow-slate-900/70',
    'p-6 backdrop-blur-sm',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={containerClassName} aria-label="Board metrics">
      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-200">
          Visual telemetry
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="text-sm text-slate-300">{metrics.total} tasks</p>
        </div>
        <p className="text-sm text-slate-300">
          Track how energy flows across the board to keep momentum visible.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
        <CompletionDial
          percent={percent}
          completed={metrics.completed}
          total={metrics.total}
          active={metrics.active}
        />
        <StatusList metrics={metrics} />
      </div>

      <PriorityStack metrics={metrics} />
    </section>
  )
}

const CompletionDial = ({
  percent,
  completed,
  total,
  active,
}: Readonly<{
  percent: number
  completed: number
  total: number
  active: number
}>): JSX.Element => (
  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary-200">
      Completion
    </p>
    <div className="flex items-center gap-4">
      <CompletionDialArc percent={percent} />
      <CompletionStats active={active} completed={completed} total={total} />
    </div>
  </div>
)

const CompletionDialArc = ({ percent }: { percent: number }): JSX.Element => (
  <div className="relative h-28 w-28">
    <div
      className="absolute inset-0 rounded-full border border-white/20 bg-slate-900"
      role="img"
      aria-label={`Completion dial at ${percent}%`}
    />
    <div
      className="absolute inset-1 rounded-full"
      style={{
        background: `conic-gradient(#34d399 ${percent}%, rgba(255,255,255,0.06) 0)`,
      }}
      aria-hidden
    />
    <div className="absolute inset-4 rounded-full bg-slate-950 text-center">
      <span className="text-2xl font-semibold">{percent}%</span>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Complete</p>
    </div>
  </div>
)

const CompletionStats = ({
  active,
  completed,
  total,
}: Readonly<{
  active: number
  completed: number
  total: number
}>): JSX.Element => (
  <dl className="space-y-2 text-sm">
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-400">Active focus</dt>
      <dd className="font-semibold text-white">{active}</dd>
    </div>
    <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-2">
      <dt className="text-slate-400">Completed</dt>
      <dd className="font-semibold text-emerald-300">{completed}</dd>
    </div>
    <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-2">
      <dt className="text-slate-400">Total</dt>
      <dd className="font-semibold">{total}</dd>
    </div>
  </dl>
)
const StatusList = ({
  metrics,
}: Readonly<{
  metrics: TaskMetricsSummary
}>): JSX.Element => {
  const denominator = Math.max(metrics.total, 1)
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary-200">
        Flow states
      </p>
      <ul className="space-y-3" role="list">
        {STATUS_SEQUENCE.map((status) => {
          const meta = STATUS_META[status]
          const count = metrics.statuses[status]
          const progress = Math.round((count / denominator) * 100)
          return (
            <li key={status} className="space-y-2 rounded-2xl border border-white/5 bg-white/5 p-3">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{meta.label}</p>
                  <p className="text-xs text-slate-400">{meta.description}</p>
                </div>
                <p className="text-base font-semibold text-white">{count}</p>
              </div>
              <div
                className="h-2 rounded-full bg-white/10"
                role="presentation"
              >
                <div
                  role="progressbar"
                  aria-label={`${meta.label} tasks`}
                  aria-valuenow={count}
                  aria-valuemin={0}
                  aria-valuemax={metrics.total}
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: meta.accent,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const PriorityStack = ({
  metrics,
}: Readonly<{
  metrics: TaskMetricsSummary
}>): JSX.Element => {
  const denominator = Math.max(metrics.total, 1)
  return (
    <section className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <header className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-200">
          Priority orbit
        </p>
        <span className="text-xs text-slate-400">Relative weight</span>
      </header>
      <div className="flex flex-col gap-3">
        {PRIORITY_SEQUENCE.map((priority) => {
          const meta = PRIORITY_META[priority]
          const count = metrics.priorities[priority]
          const share = Math.round((count / denominator) * 100)
          return (
            <div key={priority} className="space-y-1">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-300">
                <span>{meta.label}</span>
                <span>{count}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${share}%`, backgroundColor: meta.accent }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={metrics.total}
                  aria-valuenow={count}
                  aria-label={`${meta.label} priority tasks`}
                />
              </div>
              <p className="text-[0.7rem] text-slate-400">{meta.description}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
