import type { TaskBoardTask, TaskBoardRelationship } from '../components/TaskBoard'
import type { TaskBoardViewport } from '../components/TaskBoardMinimap'
import type { BoardSnapshotDTO } from '@shared/types/board'

const DEFAULT_COLOR = '#6366f1'
const MIN_SCALE = 0.6
const MAX_SCALE = 1.8
const BASE_VIEWPORT_SPAN = 1600

export type BoardDataViewModel = Readonly<{
  tasks: TaskBoardTask[]
  relationships: TaskBoardRelationship[]
  totals: BoardSnapshotDTO['totals']
  viewport: TaskBoardViewport
}>

export const transformSnapshot = (snapshot: BoardSnapshotDTO): BoardDataViewModel => {
  const tasks = snapshot.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    priority: task.priority,
    category: task.category ?? undefined,
    color: sanitizeColor(task.color),
    icon: task.icon ?? undefined,
    position: task.position,
    size: task.visualSize,
    createdAt: parseDate(task.createdAt),
    updatedAt: parseDate(task.updatedAt),
    completedAt: parseOptionalDate(task.completedAt),
  }))
  const colorMap = new Map(tasks.map((task) => [task.id, task.color ?? DEFAULT_COLOR]))
  const relationships = snapshot.relationships.map((relationship) => ({
    id: relationship.id,
    fromId: relationship.fromId,
    toId: relationship.toId,
    type: relationship.type,
    color: relationship.color ?? colorMap.get(relationship.fromId) ?? DEFAULT_COLOR,
  }))
  return {
    tasks,
    relationships,
    totals: snapshot.totals,
    viewport: mapSnapshotViewport(snapshot.viewport),
  }
}

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const sanitizeColor = (candidate: string | undefined): string => {
  if (candidate && COLOR_PATTERN.test(candidate)) {
    return candidate
  }
  return DEFAULT_COLOR
}

const parseDate = (value: string): Date => new Date(value)

const parseOptionalDate = (value?: string | null): Date | undefined => {
  if (!value) return undefined
  return new Date(value)
}

const mapSnapshotViewport = (viewport: BoardSnapshotDTO['viewport']): TaskBoardViewport => {
  const centerX = (viewport.x.min + viewport.x.max) / 2
  const centerY = (viewport.y.min + viewport.y.max) / 2
  const span = Math.max(viewport.width, viewport.height)
  return {
    center: { x: centerX, y: centerY },
    scale: clampViewportScale(span),
  }
}

const clampViewportScale = (span: number): number => {
  if (!Number.isFinite(span) || span <= 0) {
    return 1
  }
  const desired = BASE_VIEWPORT_SPAN / span
  const normalized = Number.parseFloat(desired.toFixed(2))
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, normalized))
}
