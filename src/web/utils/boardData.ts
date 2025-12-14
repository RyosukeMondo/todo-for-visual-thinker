import type { TaskBoardTask, TaskBoardRelationship } from '../components/TaskBoard'
import type { BoardSnapshotDTO } from '@shared/types/board'

const DEFAULT_COLOR = '#6366f1'

export type BoardDataViewModel = Readonly<{
  tasks: TaskBoardTask[]
  relationships: TaskBoardRelationship[]
  totals: BoardSnapshotDTO['totals']
  viewport: BoardSnapshotDTO['viewport']
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
    viewport: snapshot.viewport,
  }
}

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const sanitizeColor = (candidate: string | undefined): string => {
  if (candidate && COLOR_PATTERN.test(candidate)) {
    return candidate
  }
  return DEFAULT_COLOR
}
