import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useId,
  useMemo,
} from 'react'

import type { CanvasPosition } from '@core/domain/Todo'
import type { RelationshipType } from '@core/domain/Relationship'
import { buildConnectionSegments } from './TaskBoard.connections'
import { useViewportController, type ViewportController, type ViewportState } from './TaskBoard.viewport'

import { TaskCard } from './TaskCard'
import type { TaskCardProps } from './TaskCard'

const BOARD_SIZE = 4096
const KEYBOARD_PAN_STEP = 64
const KEYBOARD_PAN_MULTI = 2

export type TaskBoardTask = TaskCardProps &
  Readonly<{
    id: string
    position: CanvasPosition
  }>

export type TaskBoardRelationship = Readonly<{
  id: string
  fromId: string
  toId: string
  type: RelationshipType
  color?: string
}>

export type TaskBoardProps = Readonly<{
  tasks: readonly TaskBoardTask[]
  selectedId?: string
  onSelect?: (taskId: string) => void
  relationships?: readonly TaskBoardRelationship[]
  initialViewport?: Partial<ViewportState>
  onViewportChange?: (viewport: ViewportState) => void
  className?: string
}>

export const TaskBoard = ({
  tasks,
  selectedId,
  onSelect,
  relationships = [],
  initialViewport,
  onViewportChange,
  className,
}: TaskBoardProps): JSX.Element => {
  const controller = useViewportController(initialViewport, onViewportChange)
  const boardClasses = useBoardClasses(className)

  return (
    <TaskBoardView
      className={boardClasses}
      controller={controller}
      tasks={tasks}
      selectedId={selectedId}
      onSelect={onSelect}
      relationships={relationships}
    />
  )
}

const useBoardClasses = (className?: string): string =>
  useMemo(
    () =>
      [
        'task-board relative rounded-[2.5rem] border border-white/40 bg-gradient-to-br from-white via-white to-primary-50 p-6 shadow-2xl shadow-primary-500/10',
        className,
      ]
        .filter(Boolean)
        .join(' '),
    [className],
  )

const TaskBoardView = ({
  className,
  controller,
  tasks,
  selectedId,
  onSelect,
  relationships,
}: {
  className: string
  controller: ViewportController
  tasks: readonly TaskBoardTask[]
  selectedId?: string
  onSelect?: (taskId: string) => void
  relationships: readonly TaskBoardRelationship[]
}): JSX.Element => (
  <section className={className} aria-label="Spatial task board">
    <BoardHeader
      scale={controller.viewport.scale}
      onZoomIn={controller.zoomIn}
      onZoomOut={controller.zoomOut}
      onReset={controller.reset}
    />
    <BoardSurface controller={controller}>
      <BoardConnections tasks={tasks} relationships={relationships} />
      <BoardNodes tasks={tasks} selectedId={selectedId} onSelect={onSelect} />
    </BoardSurface>
  </section>
)

const BoardHeader = ({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}): JSX.Element => (
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
  </div>
)

const BoardControlButton = ({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): JSX.Element => (
  <button
    type="button"
    className="rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
    onClick={onClick}
    aria-label={label}
  >
    {children}
  </button>
)

type BoardSurfaceProps = Readonly<{
  controller: ReturnType<typeof useViewportController>
  children: React.ReactNode
}>

const BoardSurface = ({ controller, children }: BoardSurfaceProps): JSX.Element => {
  const canvasTransform = useMemo(() => buildCanvasTransform(controller.viewport), [controller.viewport])
  const gridStyle = useMemo<CSSProperties>(
    () => getGridPattern(controller.viewport.scale),
    [controller.viewport.scale],
  )
  const handleKeyDown = useKeyboardNavigation(controller)

  return (
    <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem] bg-slate-950/5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/60 via-white to-secondary-50/60" aria-hidden />
      <div
        role="region"
        aria-label="Task board canvas"
        aria-roledescription="Spatial canvas"
        tabIndex={0}
        className={`relative h-[32rem] w-full touch-none outline-none ${controller.isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={controller.handlePointerDown}
        onPointerMove={controller.handlePointerMove}
        onPointerUp={controller.handlePointerUp}
        onPointerLeave={controller.handlePointerLeave}
        onWheel={controller.handleWheel}
        onKeyDown={handleKeyDown}
        data-scale={controller.viewport.scale.toFixed(2)}
      >
        <div className="absolute inset-0" aria-hidden style={gridStyle} />
        <div className="absolute left-1/2 top-1/2" style={canvasTransform}>
          {children}
        </div>
      </div>
    </div>
  )
}

type BoardNodesProps = Readonly<{
  tasks: readonly TaskBoardTask[]
  selectedId?: string
  onSelect?: (taskId: string) => void
}>

type BoardNodeButtonProps = Readonly<{
  task: TaskBoardTask
  isSelected: boolean
  onSelect?: (taskId: string) => void
}>

const BoardNodes = ({ tasks, selectedId, onSelect }: BoardNodesProps): JSX.Element => (
  <div className="pointer-events-none relative h-0 w-0 -translate-x-1/2 -translate-y-1/2">
    {tasks.map((task) => (
      <BoardNodeButton
        key={task.id}
        task={task}
        isSelected={task.id === selectedId}
        onSelect={onSelect}
      />
    ))}
  </div>
)

const BoardConnections = ({ tasks, relationships }: BoardConnectionsProps): JSX.Element | null => {
  const markerId = useId()
  const segments = useMemo(() => buildConnectionSegments(tasks, relationships ?? []), [tasks, relationships])

  if (segments.length === 0) {
    return null
  }

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      aria-hidden
    >
      <svg
        width={BOARD_SIZE}
        height={BOARD_SIZE}
        viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
        className="overflow-visible"
      >
        <ConnectionMarker id={`${markerId}-arrow`} />
        {segments.map((segment) => (
          <BoardConnectionPath
            key={segment.id}
            markerId={`${markerId}-arrow`}
            segment={segment}
          />
        ))}
      </svg>
    </div>
  )
}

type BoardConnectionsProps = Readonly<{
  tasks: readonly TaskBoardTask[]
  relationships?: readonly TaskBoardRelationship[]
}>

const ConnectionMarker = ({ id }: { id: string }): JSX.Element => (
  <defs>
    <marker
      id={id}
      viewBox="0 0 12 12"
      refX="10"
      refY="6"
      markerWidth="12"
      markerHeight="12"
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
    >
      <path d="M0,0 L0,12 L12,6 z" fill="currentColor" />
    </marker>
  </defs>
)

const BoardConnectionPath = ({
  segment,
  markerId,
}: {
  segment: ReturnType<typeof buildConnectionSegments>[number]
  markerId: string
}): JSX.Element => (
  <path
    d={segment.path}
    stroke={segment.stroke}
    strokeWidth={4}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    data-relationship-id={segment.id}
    markerEnd={`url(#${markerId})`}
    className="drop-shadow-sm"
    strokeDasharray={segment.dasharray}
  />
)

const BoardNodeButton = ({
  task,
  isSelected,
  onSelect,
}: BoardNodeButtonProps): JSX.Element => {
  const nodeStyle = useMemo(
    () => ({
      transform: `translate3d(${task.position.x}px, ${task.position.y}px, 0)` as const,
    }),
    [task.position.x, task.position.y],
  )

  return (
    <button
      type="button"
      className="task-node pointer-events-auto absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 border-none bg-transparent p-0"
      style={nodeStyle}
      onClick={() => onSelect?.(task.id)}
      data-task-id={task.id}
      aria-pressed={isSelected}
    >
      <TaskCard {...task} position={task.position} isSelected={isSelected} />
    </button>
  )
}

const buildCanvasTransform = (viewport: ViewportState): CSSProperties => ({
  width: BOARD_SIZE,
  height: BOARD_SIZE,
  transform: `translate(-50%, -50%) translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
  transformOrigin: 'center',
})

const getGridPattern = (scale: number): CSSProperties => ({
  backgroundImage:
    'linear-gradient(transparent 94%, rgba(15,23,42,0.08) 96%), linear-gradient(90deg, transparent 94%, rgba(15,23,42,0.08) 96%)',
  backgroundSize: `${Math.max(32, 64 * scale)}px ${Math.max(32, 64 * scale)}px`,
})

const useKeyboardNavigation = (
  controller: ReturnType<typeof useViewportController>,
) => {
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const multiplier = event.shiftKey ? KEYBOARD_PAN_MULTI : 1
      const step = KEYBOARD_PAN_STEP * multiplier
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          controller.panBy(0, -step)
          break
        case 'ArrowDown':
          event.preventDefault()
          controller.panBy(0, step)
          break
        case 'ArrowLeft':
          event.preventDefault()
          controller.panBy(-step, 0)
          break
        case 'ArrowRight':
          event.preventDefault()
          controller.panBy(step, 0)
          break
        case '+':
        case '=':
          event.preventDefault()
          controller.zoomIn()
          break
        case '-':
        case '_':
          event.preventDefault()
          controller.zoomOut()
          break
        case '0':
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault()
            controller.reset()
          }
          break
        default:
      }
    },
    [controller],
  )

  return handleKeyDown
}
