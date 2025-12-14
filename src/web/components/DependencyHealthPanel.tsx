import type { RelationshipType } from '@core/domain/Relationship'

import type {
  BoardDependencyHealthDTO,
  BoardStatusDTO,
} from '@shared/types/board'

const RELATIONSHIP_META: Record<
  RelationshipType,
  { label: string; description: string; accent: string }
> = {
  depends_on: {
    label: 'Depends on',
    description: 'Flow required before downstream work',
    accent: '#0284c7',
  },
  blocks: {
    label: 'Blocks',
    description: 'Tasks currently holding others back',
    accent: '#f97316',
  },
  related_to: {
    label: 'Related',
    description: 'Contextual links for creative jumps',
    accent: '#a855f7',
  },
}

const TYPE_SEQUENCE: RelationshipType[] = [
  'depends_on',
  'blocks',
  'related_to',
]

export type DependencyHealthPanelProps = Readonly<{
  status?: BoardStatusDTO
  isLoading: boolean
  error?: string
  className?: string
}>

export const DependencyHealthPanel = ({
  status,
  isLoading,
  error,
  className,
}: DependencyHealthPanelProps): JSX.Element => {
  const dependencies = status?.dependencies
  const containerClassName = [
    'rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-primary-500/5',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={containerClassName} aria-label="Dependency health panel">
      <PanelHeader totals={status?.totals} />
      {isLoading ? (
        <PanelLoadingState />
      ) : error ? (
        <PanelErrorState message={error} />
      ) : dependencies ? (
        <PanelContent dependencies={dependencies} />
      ) : (
        <PanelEmptyState />
      )}
    </section>
  )
}

const PanelHeader = ({
  totals,
}: {
  totals?: BoardStatusDTO['totals']
}): JSX.Element => (
  <header className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-500">
      Dependency health
    </p>
    <h3 className="text-xl font-semibold text-gray-900">
      Keep blockers visible and momentum flowing
    </h3>
    <p className="text-sm text-gray-500">
      Surface dependency chains so visual thinkers know exactly what unlocks the
      next breakthrough.
    </p>
    {totals?.lastUpdatedAt && (
      <p className="text-xs text-gray-400">
        Updated {new Date(totals.lastUpdatedAt).toLocaleString()}
      </p>
    )}
  </header>
)

const PanelLoadingState = (): JSX.Element => (
  <div className="mt-4 space-y-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="h-10 animate-pulse rounded-xl bg-gray-100"
      />
    ))}
  </div>
)

const PanelErrorState = ({ message }: { message: string }): JSX.Element => (
  <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
    Unable to load dependency health: {message}
  </div>
)

const PanelEmptyState = (): JSX.Element => (
  <div className="mt-6 rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
    No relationships yet—link tasks via the CLI to visualize how work connects.
  </div>
)

const PanelContent = ({
  dependencies,
}: {
  dependencies: BoardDependencyHealthDTO
}): JSX.Element => (
  <div className="mt-6 space-y-6">
    <DependencyTotals dependencies={dependencies} />
    <RelationshipBreakdown dependencies={dependencies} />
    <BrokenRelationships dependencies={dependencies} />
  </div>
)

const DependencyTotals = ({
  dependencies,
}: {
  dependencies: BoardDependencyHealthDTO
}): JSX.Element => (
  <div className="grid gap-4 rounded-2xl bg-gradient-to-br from-primary-50 to-white p-4 md:grid-cols-3">
    <MetricTile label="Relationships" value={dependencies.total} accent="#0ea5e9" />
    <MetricTile
      label="Active blockers"
      value={dependencies.blockingTasks}
      accent="#f97316"
      description={`${dependencies.blockedTasks} tasks waiting`}
    />
    <MetricTile
      label="Dependent tasks"
      value={dependencies.dependentTasks}
      accent="#a855f7"
    />
  </div>
)

const MetricTile = ({
  label,
  value,
  accent,
  description,
}: {
  label: string
  value: number
  accent: string
  description?: string
}): JSX.Element => (
  <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow">
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
      {label}
    </p>
    <p className="mt-1 text-3xl font-bold" style={{ color: accent }}>
      {value}
    </p>
    {description && <p className="text-xs text-gray-500">{description}</p>}
  </div>
)

const RelationshipBreakdown = ({
  dependencies,
}: {
  dependencies: BoardDependencyHealthDTO
}): JSX.Element => (
  <section className="rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-inner shadow-gray-100">
    <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
      Relationship mix
    </h4>
    <ul className="mt-3 space-y-3">
      {TYPE_SEQUENCE.map((type) => {
        const meta = RELATIONSHIP_META[type]
        const count = dependencies.byType[type] ?? 0
        const share =
          dependencies.total === 0
            ? 0
            : Math.round((count / dependencies.total) * 100)
        return (
          <li key={type} className="space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {meta.label}
                </p>
                <p className="text-xs text-gray-500">{meta.description}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{count}</p>
            </div>
            <div className="h-2 rounded-full bg-gray-100" role="presentation">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${share}%`, backgroundColor: meta.accent }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={dependencies.total}
                aria-valuenow={count}
                aria-label={`${meta.label} relationships`}
              />
            </div>
          </li>
        )
      })}
    </ul>
  </section>
)

const BrokenRelationships = ({
  dependencies,
}: {
  dependencies: BoardDependencyHealthDTO
}): JSX.Element | null => {
  if (dependencies.brokenCount === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
        All relationship chains are intact.
      </div>
    )
  }

  const highlighted = dependencies.brokenRelationships.slice(0, 3)

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-red-700">
            {dependencies.brokenCount} broken relationships
          </p>
          <p className="text-xs text-red-600">
            Link targets missing or deleted. Resolve to restore flow.
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-2 text-xs text-red-700">
        {highlighted.map((relationship) => (
          <li
            key={relationship.id}
            className="rounded-xl border border-red-100 bg-white/80 p-2"
          >
            <span className="font-semibold uppercase tracking-[0.2em] text-red-500">
              {RELATIONSHIP_META[relationship.type].label}
            </span>{' '}
            missing {relationship.missingEndpoint} task{' '}
            <code className="rounded bg-red-100 px-1 py-0.5 text-[0.7rem]">
              {relationship.missingTaskId}
            </code>
          </li>
        ))}
        {dependencies.brokenCount > highlighted.length && (
          <li className="text-[0.7rem] text-red-600">
            +{dependencies.brokenCount - highlighted.length} more not shown
          </li>
        )}
      </ul>
    </div>
  )
}
