import type { ReactNode } from 'react'

type TaskBoardHeaderProps = Readonly<{
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  isFocusMode: boolean
  canUseFocusMode: boolean
  onToggleFocusMode: () => void
}>

export const TaskBoardHeader = ({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  isFocusMode,
  canUseFocusMode,
  onToggleFocusMode,
}: TaskBoardHeaderProps): JSX.Element => (
  <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div className="space-y-2">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-500">
        Infinite canvas
      </p>
      <h2 className="text-2xl font-semibold text-gray-900">
        Map tasks spatially and feel the work
      </h2>
      <p className="text-gray-600">
        Drag to pan, scroll to zoom, and spotlight the tasks that anchor your cognitive map.
      </p>
    </div>
    <div className="flex flex-col gap-3">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/90 p-2 shadow-md shadow-primary-500/10">
        <BoardControlButton label="Zoom out" onClick={onZoomOut}>
          −
        </BoardControlButton>
        <span className="min-w-[4rem] text-center text-sm font-semibold text-gray-900">
          {(scale * 100).toFixed(0)}%
        </span>
        <BoardControlButton label="Zoom in" onClick={onZoomIn}>
          +
        </BoardControlButton>
        <BoardControlButton label="Reset view" onClick={onReset}>
          Reset
        </BoardControlButton>
      </div>
      <FocusModeToggle
        isActive={isFocusMode}
        disabled={!canUseFocusMode}
        onToggle={onToggleFocusMode}
      />
    </div>
  </div>
)

const BoardControlButton = ({
  label,
  onClick,
  children,
}: Readonly<{
  label: string
  onClick: () => void
  children: ReactNode
}>): JSX.Element => (
  <button
    type="button"
    className="rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
    onClick={onClick}
    aria-label={label}
  >
    {children}
  </button>
)

type FocusModeToggleProps = Readonly<{
  isActive: boolean
  disabled: boolean
  onToggle: () => void
}>

const FocusModeToggle = ({
  isActive,
  disabled,
  onToggle,
}: FocusModeToggleProps): JSX.Element => {
  const buttonClass = [
    'rounded-2xl border px-4 py-3 text-left shadow-lg shadow-primary-500/10 transition disabled:cursor-not-allowed disabled:opacity-60',
    'bg-white/90',
    isActive
      ? 'border-secondary-300 ring-2 ring-secondary-300 ring-offset-2'
      : 'border-primary-100 enabled:hover:border-primary-200 enabled:hover:bg-primary-50',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={buttonClass}
      aria-pressed={isActive}
      aria-label="Toggle focus mode"
      onClick={onToggle}
      disabled={disabled}
    >
      <span className="text-sm font-semibold text-gray-900">Focus mode</span>
      <p className="text-xs text-gray-500">
        Dim peripheral cards to lock attention on the selected task.
      </p>
    </button>
  )
}
