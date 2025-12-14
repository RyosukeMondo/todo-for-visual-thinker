import type { CanvasPosition } from '@core/domain/Todo'
import type { RelationshipType } from '@core/domain/Relationship'

import { TASK_BOARD_HALF_SIZE, TASK_BOARD_SIZE } from './TaskBoard.constants'
import type {
  TaskBoardRelationship,
  TaskBoardTask,
} from './TaskBoard'
const DEFAULT_CONNECTION_COLOR = '#94a3b8'
const RELATIONSHIP_ANCHOR_OFFSET = 64
const CURVE_PRIMARY_FACTOR = 0.35
const CURVE_LATERAL_FACTOR = 0.2
const CURVE_PRIMARY_MAX = 180
const CURVE_LATERAL_MAX = 90

const RELATIONSHIP_VISUALS: Record<RelationshipType, { stroke: string; dasharray?: string }> = {
  depends_on: { stroke: '#0284c7' },
  blocks: { stroke: '#f97316' },
  related_to: { stroke: '#a855f7', dasharray: '8 8' },
}

export type ConnectionEmphasis = 'normal' | 'highlighted' | 'dimmed'

export type ConnectionSegment = Readonly<{
  id: string
  path: string
  stroke: string
  dasharray?: string
  emphasis: ConnectionEmphasis
}>

export type BuildConnectionSegmentsOptions = Readonly<{
  focusTaskId?: string
}>

export const buildConnectionSegments = (
  tasks: readonly TaskBoardTask[],
  relationships: readonly TaskBoardRelationship[],
  options: BuildConnectionSegmentsOptions = {},
): ConnectionSegment[] => {
  if (tasks.length === 0 || relationships.length === 0) {
    return []
  }

  const positionsById = new Map<string, CanvasPosition>()
  tasks.forEach((task) => positionsById.set(task.id, task.position))

  const focusId = normalizeFocusId(options.focusTaskId)

  return relationships.flatMap((relationship) => {
    const from = positionsById.get(relationship.fromId)
    const to = positionsById.get(relationship.toId)
    if (!from || !to || relationship.fromId === relationship.toId) {
      return []
    }

    const path = buildConnectionPath(from, to)
    if (!path) {
      return []
    }

    const palette = RELATIONSHIP_VISUALS[relationship.type]
    const stroke = sanitizeColor(relationship.color) ?? palette?.stroke ?? DEFAULT_CONNECTION_COLOR
    const emphasis = resolveEmphasis(focusId, relationship)
    return [{
      id: relationship.id,
      path,
      stroke,
      dasharray: palette?.dasharray,
      emphasis,
    } satisfies ConnectionSegment]
  })
}

const normalizeFocusId = (value?: string): string | undefined => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

const resolveEmphasis = (
  focusId: string | undefined,
  relationship: TaskBoardRelationship,
): ConnectionEmphasis => {
  if (!focusId) {
    return 'normal'
  }
  const normalizedFocus = focusId.trim()
  const normalizedFrom = relationship.fromId.trim()
  const normalizedTo = relationship.toId.trim()
  const isConnected =
    normalizedFrom === normalizedFocus || normalizedTo === normalizedFocus
  return isConnected ? 'highlighted' : 'dimmed'
}

const buildConnectionPath = (
  source: CanvasPosition,
  target: CanvasPosition,
): string | undefined => {
  const start = offsetAnchor(source, target)
  const end = offsetAnchor(target, source)
  const delta = subtractVectors(end, start)
  const distance = vectorLength(delta)
  if (distance === 0) {
    return undefined
  }

  const lateral = Math.min(distance * CURVE_LATERAL_FACTOR, CURVE_LATERAL_MAX)
  const primary = Math.min(distance * CURVE_PRIMARY_FACTOR, CURVE_PRIMARY_MAX)
  const direction = normalizeVector(delta)
  const perpendicular = normalizeVector({ x: -delta.y, y: delta.x })

  const control1 = addVectors(start, scaleVector(direction, primary), scaleVector(perpendicular, lateral))
  const control2 = addVectors(end, scaleVector(direction, -primary), scaleVector(perpendicular, -lateral))

  return `M ${toBoardCoordinate(start.x)} ${toBoardCoordinate(start.y)} C ${toBoardCoordinate(control1.x)} ${toBoardCoordinate(control1.y)} ${toBoardCoordinate(control2.x)} ${toBoardCoordinate(control2.y)} ${toBoardCoordinate(end.x)} ${toBoardCoordinate(end.y)}`
}

const offsetAnchor = (
  point: CanvasPosition,
  towards: CanvasPosition,
): CanvasPosition => {
  const direction = normalizeVector(subtractVectors(towards, point))
  return addVectors(point, scaleVector(direction, RELATIONSHIP_ANCHOR_OFFSET))
}

const sanitizeColor = (value?: string): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  if (/^#([0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed
  }
  return undefined
}

const subtractVectors = (a: CanvasPosition, b: CanvasPosition): CanvasPosition => ({
  x: a.x - b.x,
  y: a.y - b.y,
})

const addVectors = (
  base: CanvasPosition,
  ...deltas: Array<{ x: number; y: number }>
): CanvasPosition =>
  deltas.reduce<CanvasPosition>(
    (acc, delta) => ({
      x: acc.x + delta.x,
      y: acc.y + delta.y,
    }),
    { ...base },
  )

const scaleVector = (
  vector: { x: number; y: number },
  factor: number,
): { x: number; y: number } => ({
  x: vector.x * factor,
  y: vector.y * factor,
})

const normalizeVector = (vector: { x: number; y: number }): { x: number; y: number } => {
  const length = vectorLength(vector)
  if (length === 0) {
    return { x: 0, y: 0 }
  }
  return { x: vector.x / length, y: vector.y / length }
}

const vectorLength = (vector: { x: number; y: number }): number =>
  Math.hypot(vector.x, vector.y)

const toBoardCoordinate = (value: number): number =>
  Math.max(0, Math.min(TASK_BOARD_SIZE, Math.round(value + TASK_BOARD_HALF_SIZE)))
