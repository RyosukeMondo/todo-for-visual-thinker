import { useCallback, useEffect, useMemo, useState } from 'react'

import type { CanvasPosition } from '@core/domain/Todo'
import type { RelationshipType } from '@core/domain/Relationship'

import type { TaskBoardViewport } from './TaskBoardMinimap'
import type { TaskCardProps } from './TaskCard'
import { TaskBoardHeader } from './TaskBoardHeader'
import { TaskBoardLayers } from './TaskBoardCanvas'
import {
  useViewportController,
  type ViewportController,
  type ViewportState,
} from './TaskBoard.viewport'

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
  hoverId?: string
  onSelect?: (taskId: string) => void
  onHover?: (taskId: string | undefined) => void
  relationships?: readonly TaskBoardRelationship[]
  initialViewport?: Partial<ViewportState>
  onViewportChange?: (viewport: ViewportState) => void
  className?: string
}>

export const TaskBoard = ({
  tasks,
  selectedId,
  hoverId,
  onSelect,
  onHover,
  relationships = [],
  initialViewport,
  onViewportChange,
  className,
}: TaskBoardProps): JSX.Element => {
  const controller = useViewportController(initialViewport, onViewportChange)
  const boardClasses = useBoardClasses(className)
  const { hoverTarget, handleHover } = useHoverController(hoverId, onHover)
  const { isFocusMode, toggleFocusMode } = useFocusMode(selectedId)
  const focusId = hoverTarget ?? selectedId
  const viewport: TaskBoardViewport = useMemo(
    () => ({
      center: { x: controller.viewport.x, y: controller.viewport.y },
      scale: controller.viewport.scale,
    }),
    [controller.viewport],
  )

  return (
    <TaskBoardView
      className={boardClasses}
      controller={controller}
      tasks={tasks}
      selectedId={selectedId}
      hoverId={focusId}
      onSelect={onSelect}
      onHover={handleHover}
      relationships={relationships}
      viewport={viewport}
      isFocusMode={isFocusMode}
      onToggleFocusMode={toggleFocusMode}
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

const useHoverController = (
  controlledHoverId: string | undefined,
  onHover?: (taskId: string | undefined) => void,
): {
  hoverTarget?: string
  handleHover: (taskId: string | undefined) => void
} => {
  const [internalHover, setInternalHover] = useState<string | undefined>()

  const handleHover = useCallback(
    (taskId: string | undefined) => {
      if (controlledHoverId === undefined) {
        setInternalHover(taskId)
      }
      onHover?.(taskId)
    },
    [controlledHoverId, onHover],
  )

  return {
    hoverTarget: controlledHoverId ?? internalHover,
    handleHover,
  }
}

const useFocusMode = (selectedId?: string): {
  isFocusMode: boolean
  toggleFocusMode: () => void
} => {
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    if (!selectedId && isEnabled) {
      setIsEnabled(false)
    }
  }, [selectedId, isEnabled])

  const toggleFocusMode = useCallback(() => {
    setIsEnabled((current) => !current)
  }, [])

  return {
    isFocusMode: Boolean(selectedId && isEnabled),
    toggleFocusMode,
  }
}

type TaskBoardViewProps = Readonly<{
  className: string
  controller: ViewportController
  tasks: readonly TaskBoardTask[]
  selectedId?: string
  hoverId?: string
  onSelect?: (taskId: string) => void
  onHover?: (taskId: string | undefined) => void
  relationships: readonly TaskBoardRelationship[]
  viewport: TaskBoardViewport
  isFocusMode: boolean
  onToggleFocusMode: () => void
}>

const TaskBoardView = ({
  className,
  controller,
  tasks,
  selectedId,
  hoverId,
  onSelect,
  onHover,
  relationships,
  viewport,
  isFocusMode,
  onToggleFocusMode,
}: TaskBoardViewProps): JSX.Element => (
  <section className={className} aria-label="Spatial task board">
    <TaskBoardHeader
      scale={controller.viewport.scale}
      onZoomIn={controller.zoomIn}
      onZoomOut={controller.zoomOut}
      onReset={controller.reset}
      isFocusMode={isFocusMode}
      canUseFocusMode={Boolean(selectedId)}
      onToggleFocusMode={onToggleFocusMode}
    />
    <TaskBoardLayers
      controller={controller}
      tasks={tasks}
      selectedId={selectedId}
      hoverId={hoverId}
      onSelect={onSelect}
      onHover={onHover}
      relationships={relationships}
      viewport={viewport}
      isFocusMode={isFocusMode}
    />
  </section>
)
