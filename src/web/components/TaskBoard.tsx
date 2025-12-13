import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { CanvasPosition } from '@core/domain/Todo'

import { TaskCard } from './TaskCard'
import type { TaskCardProps } from './TaskCard'

const BOARD_SIZE = 4096
const MIN_SCALE = 0.6
const MAX_SCALE = 1.8
const SCALE_STEP = 0.15

export type TaskBoardTask = TaskCardProps &
  Readonly<{
    id: string
    position: CanvasPosition
  }>

export type ViewportState = Readonly<{
  x: number
  y: number
  scale: number
}>

export type TaskBoardProps = Readonly<{
  tasks: readonly TaskBoardTask[]
  selectedId?: string
  onSelect?: (taskId: string) => void
  initialViewport?: Partial<ViewportState>
  onViewportChange?: (viewport: ViewportState) => void
  className?: string
}>

type DragSession = Readonly<{
  pointerId: number
  originX: number
  originY: number
  startX: number
  startY: number
}>

export const TaskBoard = ({
  tasks,
  selectedId,
  onSelect,
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
}: {
  className: string
  controller: ReturnType<typeof useViewportController>
  tasks: readonly TaskBoardTask[]
  selectedId?: string
  onSelect?: (taskId: string) => void
}): JSX.Element => (
  <section className={className} aria-label="Spatial task board">
    <BoardHeader
      scale={controller.viewport.scale}
      onZoomIn={controller.zoomIn}
      onZoomOut={controller.zoomOut}
      onReset={controller.reset}
    />
    <BoardSurface controller={controller}>
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

  return (
    <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem] bg-slate-950/5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/60 via-white to-secondary-50/60" aria-hidden />
      <div
        role="presentation"
        className={`relative h-[32rem] w-full touch-none ${controller.isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={controller.handlePointerDown}
        onPointerMove={controller.handlePointerMove}
        onPointerUp={controller.handlePointerUp}
        onPointerLeave={controller.handlePointerLeave}
        onWheel={controller.handleWheel}
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

const BoardNodes = ({
  tasks,
  selectedId,
  onSelect,
}: Pick<TaskBoardProps, 'tasks' | 'selectedId' | 'onSelect'>): JSX.Element => (
  <div className="pointer-events-none relative h-0 w-0 -translate-x-1/2 -translate-y-1/2">
    {tasks.map((task) => (
      <BoardNode
        key={task.id}
        task={task}
        isSelected={task.id === selectedId}
        onSelect={onSelect}
      />
    ))}
  </div>
)

const BoardNode = ({
  task,
  isSelected,
  onSelect,
}: {
  task: TaskBoardTask
  isSelected: boolean
  onSelect?: (id: string) => void
}): JSX.Element => {
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

const useViewportController = (
  initialViewport: Partial<ViewportState> | undefined,
  onViewportChange?: (viewport: ViewportState) => void,
) => {
  const [viewport, setViewport] = useState<ViewportState>(() =>
    normalizeViewport(initialViewport),
  )
  const viewportRef = useRef(viewport)
  const pan = usePanHandlers(setViewport, viewportRef)

  useEffect(() => {
    viewportRef.current = viewport
    onViewportChange?.(viewport)
  }, [viewport, onViewportChange])

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const direction = event.deltaY > 0 ? -1 : 1
    setViewport((current) => ({
      ...current,
      scale: clampScale(current.scale + direction * SCALE_STEP),
    }))
  }, [])

  const adjustScale = useCallback((delta: number) => {
    setViewport((current) => ({
      ...current,
      scale: clampScale(current.scale + delta),
    }))
  }, [])

  const reset = useCallback(() => {
    setViewport(normalizeViewport(initialViewport))
  }, [initialViewport])

  return {
    viewport,
    isPanning: pan.isPanning,
    handlePointerDown: pan.handlePointerDown,
    handlePointerMove: pan.handlePointerMove,
    handlePointerUp: pan.handlePointerUp,
    handlePointerLeave: pan.handlePointerLeave,
    handleWheel,
    zoomIn: () => adjustScale(SCALE_STEP),
    zoomOut: () => adjustScale(-SCALE_STEP),
    reset,
  }
}

const usePanHandlers = (
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>,
  viewportRef: React.MutableRefObject<ViewportState>,
) => {
  const [isPanning, setIsPanning] = useState(false)
  const dragSession = useRef<DragSession | null>(null)

  const startPan = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture?.(event.pointerId)
      dragSession.current = buildDragSession(event, viewportRef.current)
      setIsPanning(true)
    },
    [viewportRef],
  )

  const movePan = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const session = dragSession.current
      if (!session || session.pointerId !== event.pointerId) return
      event.preventDefault()
      applyPanDelta(setViewport, session, event.clientX, event.clientY)
    },
    [setViewport],
  )

  const endPan = useCallback(
    (event?: ReactPointerEvent<HTMLDivElement>) => {
      if (event && dragSession.current?.pointerId === event.pointerId) {
        event.currentTarget.releasePointerCapture?.(event.pointerId)
      }
      dragSession.current = null
      setIsPanning(false)
    },
    [],
  )

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragSession.current?.pointerId !== event.pointerId) return
      endPan(event)
    },
    [endPan],
  )

  return {
    isPanning,
    handlePointerDown: startPan,
    handlePointerMove: movePan,
    handlePointerUp,
    handlePointerLeave: () => endPan(),
  }
}

const buildDragSession = (
  event: ReactPointerEvent<HTMLDivElement>,
  viewport: ViewportState,
): DragSession => ({
  pointerId: event.pointerId,
  originX: event.clientX,
  originY: event.clientY,
  startX: viewport.x,
  startY: viewport.y,
})

const applyPanDelta = (
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>,
  session: DragSession,
  clientX: number,
  clientY: number,
): void => {
  const deltaX = clientX - session.originX
  const deltaY = clientY - session.originY
  setViewport((current) => ({
    ...current,
    x: session.startX + deltaX,
    y: session.startY + deltaY,
  }))
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

const normalizeViewport = (
  viewport: Partial<ViewportState> | undefined,
): ViewportState => ({
  x: viewport?.x ?? 0,
  y: viewport?.y ?? 0,
  scale: clampScale(viewport?.scale ?? 1),
})

const clampScale = (value: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number.parseFloat(value.toFixed(4))))
