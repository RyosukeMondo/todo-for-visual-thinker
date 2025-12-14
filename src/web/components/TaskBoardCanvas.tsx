import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useId,
  useMemo,
  useRef,
} from 'react'

import type { CanvasPosition } from '@core/domain/Todo'
import type { TaskBoardRelationship, TaskBoardTask } from './TaskBoard'
import { TaskCard } from './TaskCard'
import { TaskBoardMinimap } from './TaskBoardMinimap'
import type { TaskBoardViewport } from './TaskBoardMinimap'
import { TASK_BOARD_SIZE } from './TaskBoard.constants'
import { buildConnectionSegments, type ConnectionSegment } from './TaskBoard.connections'
import {
  findNextTaskByDirection,
  type NavigationDirection,
} from '../utils/taskNavigation'
import type { ViewportController } from './TaskBoard.viewport'

const BOARD_SIZE = TASK_BOARD_SIZE
const KEYBOARD_PAN_STEP = 64
const KEYBOARD_PAN_MULTI = 2
const ARROW_KEY_DIRECTIONS: Partial<Record<string, NavigationDirection>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

export type TaskBoardLayersProps = Readonly<{
  controller: ViewportController
  tasks: readonly TaskBoardTask[]
  selectedId?: string
  hoverId?: string
  onSelect?: (taskId: string) => void
  onHover?: (taskId: string | undefined) => void
  relationships: readonly TaskBoardRelationship[]
  viewport: TaskBoardViewport
  isFocusMode: boolean
  onMoveTask?: (taskId: string, position: CanvasPosition) => void | Promise<void>
  isMovePending?: boolean
}>

export const TaskBoardLayers = ({
  controller,
  tasks,
  selectedId,
  hoverId,
  onSelect,
  onHover,
  relationships,
  viewport,
  isFocusMode,
  onMoveTask,
  isMovePending,
}: TaskBoardLayersProps): JSX.Element => (
  <BoardSurface controller={controller} tasks={tasks} selectedId={selectedId} onSelect={onSelect}>
    <BoardConnections tasks={tasks} relationships={relationships} focusId={hoverId ?? selectedId} />
    <BoardNodes
      tasks={tasks}
      selectedId={selectedId}
      onSelect={onSelect}
      onHover={onHover}
      dimUnselected={isFocusMode}
      onMoveTask={onMoveTask}
      isMovePending={isMovePending}
      viewportScale={controller.viewport.scale}
    />
    <TaskBoardMinimap
      tasks={tasks.map((task) => ({
        id: task.id,
        position: task.position,
        color: task.color ?? '#94a3b8',
      }))}
      viewport={viewport}
      onSelect={onSelect}
    />
  </BoardSurface>
)

type BoardSurfaceProps = Readonly<{
  controller: ViewportController
  tasks: readonly TaskBoardTask[]
  selectedId?: string
  onSelect?: (taskId: string) => void
  children: ReactNode
}>

const BoardSurface = ({ controller, tasks, selectedId, onSelect, children }: BoardSurfaceProps): JSX.Element => {
  const canvasTransform = useMemo(() => buildCanvasTransform(controller.viewport), [controller.viewport])
  const gridStyle = useMemo<CSSProperties>(
    () => getGridPattern(controller.viewport.scale),
    [controller.viewport.scale],
  )
  const handleKeyDown = useBoardKeyboardNavigation({ controller, tasks, selectedId, onSelect })

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
  onHover?: (taskId: string | undefined) => void
  dimUnselected?: boolean
  onMoveTask?: (taskId: string, position: CanvasPosition) => void | Promise<void>
  isMovePending?: boolean
  viewportScale?: number
}>

type BoardNodeButtonProps = Readonly<{
  task: TaskBoardTask
  isSelected: boolean
  isDimmed: boolean
  onSelect?: (taskId: string) => void
  onHover?: (taskId: string | undefined) => void
  onMoveTask?: (taskId: string, position: CanvasPosition) => void | Promise<void>
  isMovePending?: boolean
  viewportScale?: number
}>

const BoardNodes = ({
  tasks,
  selectedId,
  onSelect,
  onHover,
  dimUnselected = false,
  onMoveTask,
  isMovePending,
  viewportScale,
}: BoardNodesProps): JSX.Element => {
  const shouldDim = dimUnselected && Boolean(selectedId)
  return (
    <div className="pointer-events-none relative h-0 w-0 -translate-x-1/2 -translate-y-1/2">
      {tasks.map((task) => (
        <BoardNodeButton
          key={task.id}
          task={task}
          isSelected={task.id === selectedId}
          isDimmed={shouldDim ? task.id !== selectedId : false}
          onSelect={onSelect}
          onHover={onHover}
          onMoveTask={onMoveTask}
          isMovePending={isMovePending}
          viewportScale={viewportScale}
        />
      ))}
    </div>
  )
}

const BoardNodeButton = ({
  task,
  isSelected,
  isDimmed,
  onSelect,
  onHover,
  onMoveTask,
  isMovePending,
  viewportScale = 1,
}: BoardNodeButtonProps): JSX.Element => {
  const nodeStyle = useMemo(() => buildNodeTransform(task.position), [task.position.x, task.position.y])
  const dragHandlers = useTaskDragHandlers({
    task,
    onSelect,
    onMoveTask,
    viewportScale,
  })

  return (
    <button
      type="button"
      className="task-node pointer-events-auto absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 border-none bg-transparent p-0"
      style={nodeStyle}
      onClick={() => onSelect?.(task.id)}
      onFocus={() => onHover?.(task.id)}
      onBlur={() => onHover?.(undefined)}
      onMouseEnter={() => onHover?.(task.id)}
      onMouseLeave={() => onHover?.(undefined)}
      data-task-id={task.id}
      aria-pressed={isSelected}
      aria-busy={isMovePending}
      draggable={Boolean(onMoveTask)}
      onDragStart={dragHandlers.handleDragStart}
      onDragEnd={dragHandlers.handleDragEnd}
    >
      <TaskCard
        {...task}
        position={task.position}
        isSelected={isSelected}
        isDimmed={isDimmed}
      />
    </button>
  )
}

const buildNodeTransform = (position: CanvasPosition): CSSProperties => ({
  transform: `translate3d(${position.x}px, ${position.y}px, 0)` as const,
})

const useTaskDragHandlers = ({
  task,
  onSelect,
  onMoveTask,
  viewportScale,
}: {
  task: TaskBoardTask
  onSelect?: (taskId: string) => void
  onMoveTask?: (taskId: string, position: CanvasPosition) => void | Promise<void>
  viewportScale: number
}) => {
  const dragState = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const handleDragStart = useCallback(
    (event: ReactDragEvent<HTMLButtonElement>) => {
      if (!onSelect) return
      onSelect(task.id)
      event.dataTransfer.effectAllowed = 'move'
      dragState.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: task.position.x,
        originY: task.position.y,
      }
      event.dataTransfer.setData('text/plain', task.id)
    },
    [onSelect, task.id, task.position],
  )

  const handleDragEnd = useCallback(
    (event: ReactDragEvent<HTMLButtonElement>) => {
      if (!onMoveTask || !dragState.current) return
      const { startX, startY, originX, originY } = dragState.current
      dragState.current = null
      if (event.clientX === 0 && event.clientY === 0) {
        return
      }
      const deltaX = (event.clientX - startX) / viewportScale
      const deltaY = (event.clientY - startY) / viewportScale
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return
      }
      onMoveTask(task.id, {
        x: originX + deltaX,
        y: originY + deltaY,
      })
    },
    [onMoveTask, task.id, viewportScale],
  )

  return { handleDragStart, handleDragEnd }
}

type BoardConnectionsProps = Readonly<{
  tasks: readonly TaskBoardTask[]
  relationships?: readonly TaskBoardRelationship[]
  focusId?: string
}>

const BoardConnections = ({ tasks, relationships, focusId }: BoardConnectionsProps): JSX.Element | null => {
  const markerId = useId()
  const segments = useMemo(
    () => buildConnectionSegments(tasks, relationships ?? [], { focusTaskId: focusId }),
    [tasks, relationships, focusId],
  )

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
  segment: ConnectionSegment
  markerId: string
}): JSX.Element => (
  <g>
    <path
      d={segment.path}
      stroke={segment.stroke}
      strokeWidth={segment.emphasis === 'highlighted' ? 5 : 3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      markerEnd={`url(#${markerId})`}
      className={segment.emphasis === 'dimmed' ? 'opacity-40 drop-shadow-sm' : 'drop-shadow-sm'}
      strokeDasharray={segment.dasharray}
      data-relationship-id={segment.id}
    />
    {segment.label && (
      <text
        x={segment.label.x}
        y={segment.label.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fontWeight={600}
        transform={`rotate(${segment.label.rotation.toFixed(2)}, ${segment.label.x}, ${segment.label.y})`}
        className={`fill-slate-800 ${segment.emphasis === 'dimmed' ? 'opacity-30' : 'opacity-80'}`}
      >
        {segment.label.text}
      </text>
    )}
  </g>
)

type BoardKeyboardContext = Readonly<{
  controller: ViewportController
  tasks: readonly TaskBoardTask[]
  selectedId?: string
  onSelect?: (taskId: string) => void
}>

const useBoardKeyboardNavigation = ({
  controller,
  tasks,
  selectedId,
  onSelect,
}: BoardKeyboardContext) =>
  useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (handleDirectionalKey(event, { controller, tasks, selectedId, onSelect })) {
        return
      }
      handleViewportShortcut(event, controller)
    },
    [controller, tasks, selectedId, onSelect],
  )

const handleDirectionalKey = (
  event: ReactKeyboardEvent<HTMLDivElement>,
  context: BoardKeyboardContext,
): boolean => {
  const direction = ARROW_KEY_DIRECTIONS[event.key]
  if (!direction) {
    return false
  }

  const step = getPanStep(event)
  event.preventDefault()
  if (event.altKey) {
    panViewport(direction, step, context.controller)
    return true
  }
  if (!context.onSelect) {
    return true
  }
  const next = findNextTaskByDirection(context.tasks, context.selectedId, direction)
  if (next) {
    context.onSelect(next)
  }
  return true
}

const getPanStep = (event: ReactKeyboardEvent<HTMLDivElement>): number => {
  const multiplier = event.shiftKey ? KEYBOARD_PAN_MULTI : 1
  return KEYBOARD_PAN_STEP * multiplier
}

const panViewport = (
  direction: NavigationDirection,
  step: number,
  controller: ViewportController,
): void => {
  switch (direction) {
    case 'up':
      controller.panBy(0, -step)
      break
    case 'down':
      controller.panBy(0, step)
      break
    case 'left':
      controller.panBy(-step, 0)
      break
    case 'right':
      controller.panBy(step, 0)
      break
    default:
  }
}

const handleViewportShortcut = (
  event: ReactKeyboardEvent<HTMLDivElement>,
  controller: ViewportController,
): void => {
  switch (event.key) {
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
}

const buildCanvasTransform = (viewport: ViewportController['viewport']): CSSProperties => ({
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
