import { memo, useMemo } from 'react'

import type { CanvasPosition } from '@core/domain/Todo'

import { TASK_BOARD_HALF_SIZE, TASK_BOARD_SIZE } from './TaskBoard.constants'

const MINIMAP_SIZE = 220
const VIEWPORT_BORDER = '#0ea5e9'
const VIEWPORT_FILL = 'rgba(56, 189, 248, 0.12)'

export type TaskBoardViewport = Readonly<{
  center: CanvasPosition
  scale: number
}>

export type TaskBoardMinimapProps = Readonly<{
  tasks: readonly TaskNode[]
  viewport: TaskBoardViewport
  onSelect?: (taskId: string) => void
}>

type TaskNode = Readonly<{
  id: string
  position: CanvasPosition
  color: string
}>

const MIN_SCALE = 0.6
const MAX_SCALE = 1.8

export const TaskBoardMinimap = memo(
  ({ tasks, viewport, onSelect }: TaskBoardMinimapProps): JSX.Element => {
    const nodes = useMemo(() => tasks.map(mapToNode), [tasks])
    const viewportRect = useMemo(() => buildViewportRect(viewport), [viewport])
    return (
      <div className="pointer-events-none absolute right-6 top-6 hidden lg:block">
        <div className="rounded-3xl border border-white/60 bg-white/70 shadow-lg shadow-primary-500/20 backdrop-blur">
          <div className="relative m-4 flex h-[14rem] w-[14rem] items-center justify-center">
            <MinimapCanvas nodes={nodes} viewportRect={viewportRect} onSelect={onSelect} />
            <MinimapScaleBadge scale={viewport.scale} />
          </div>
        </div>
      </div>
    )
  },
)

type MinimapCanvasProps = Readonly<{
  nodes: ReadonlyArray<ReturnType<typeof mapToNode>>
  viewportRect: ReturnType<typeof buildViewportRect>
  onSelect?: (taskId: string) => void
}>

const MinimapCanvas = ({ nodes, viewportRect, onSelect }: MinimapCanvasProps): JSX.Element => (
  <svg
    viewBox={`0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`}
    width={MINIMAP_SIZE}
    height={MINIMAP_SIZE}
    role="img"
    aria-label="Board minimap"
  >
    <defs>
      <radialGradient id="minimap-bg" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#f0f9ff" stopOpacity="0.4" />
      </radialGradient>
    </defs>
    <rect
      x={0}
      y={0}
      width={MINIMAP_SIZE}
      height={MINIMAP_SIZE}
      rx={32}
      fill="url(#minimap-bg)"
      stroke="rgba(148, 163, 184, 0.6)"
    />
    {nodes.map((node) => (
      <circle
        key={node.id}
        cx={node.x}
        cy={node.y}
        r={6}
        fill={node.color}
        opacity={0.85}
        className="pointer-events-auto cursor-pointer"
        onClick={(event) => {
          event.stopPropagation()
          onSelect?.(node.id)
        }}
      />
    ))}
    <rect
      x={viewportRect.x}
      y={viewportRect.y}
      width={viewportRect.size}
      height={viewportRect.size}
      rx={12}
      fill={VIEWPORT_FILL}
      stroke={VIEWPORT_BORDER}
      strokeWidth={2}
    />
  </svg>
)

const MinimapScaleBadge = ({ scale }: { scale: number }): JSX.Element => (
  <div className="pointer-events-none absolute bottom-2 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow">
    {(scale * 100).toFixed(0)}%
  </div>
)

const mapToNode = (task: TaskNode) => ({
  id: task.id,
  x: toMinimapCoordinate(task.position.x),
  y: toMinimapCoordinate(task.position.y),
  color: task.color,
})

const buildViewportRect = (viewport: TaskBoardViewport): { x: number; y: number; size: number } => {
  const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale))
  const size = Math.max(32, MINIMAP_SIZE / clampedScale)
  const x = clamp(0, MINIMAP_SIZE - size, toMinimapCoordinate(viewport.center.x) - size / 2)
  const y = clamp(0, MINIMAP_SIZE - size, toMinimapCoordinate(viewport.center.y) - size / 2)
  return { x, y, size }
}

const toMinimapCoordinate = (value: number): number => {
  const normalized = (value + TASK_BOARD_HALF_SIZE) / TASK_BOARD_SIZE
  return clamp(0, 1, normalized) * MINIMAP_SIZE
}

const clamp = (min: number, max: number, value: number): number => {
  if (value < min) return min
  if (value > max) return max
  return value
}

TaskBoardMinimap.displayName = 'TaskBoardMinimap'
