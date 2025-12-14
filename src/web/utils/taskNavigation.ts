import type { TaskBoardTask } from '@/web/components'

export type NavigationDirection = 'up' | 'down' | 'left' | 'right'

const DIRECTION_CONFIG: Record<NavigationDirection, { axis: 'x' | 'y'; sign: 1 | -1 }> = {
  up: { axis: 'y', sign: -1 },
  down: { axis: 'y', sign: 1 },
  left: { axis: 'x', sign: -1 },
  right: { axis: 'x', sign: 1 },
}

export const findNextTaskByDirection = (
  tasks: readonly TaskBoardTask[],
  currentId: string | undefined,
  direction: NavigationDirection,
): string | undefined => {
  if (tasks.length === 0) {
    return undefined
  }

  if (!currentId) {
    return tasks[0]?.id
  }

  const current = tasks.find((task) => task.id === currentId)
  if (!current) {
    return tasks[0]?.id
  }

  const { axis, sign } = DIRECTION_CONFIG[direction]
  const candidates = tasks
    .filter((task) => task.id !== currentId)
    .map((task) => buildCandidate(task, current, axis))
    .filter((candidate) => (sign > 0 ? candidate.axisDelta > 0 : candidate.axisDelta < 0))

  if (candidates.length === 0) {
    return undefined
  }

  candidates.sort((a, b) => {
    const orthDiff = Math.abs(a.orthogonalDelta) - Math.abs(b.orthogonalDelta)
    if (orthDiff !== 0) return orthDiff
    return Math.abs(a.axisDelta) - Math.abs(b.axisDelta)
  })

  return candidates[0]?.task.id
}

const buildCandidate = (
  task: TaskBoardTask,
  current: TaskBoardTask,
  axis: 'x' | 'y',
) => {
  const deltaX = task.position.x - current.position.x
  const deltaY = task.position.y - current.position.y
  const axisDelta = axis === 'x' ? deltaX : deltaY
  const orthogonalDelta = axis === 'x' ? deltaY : deltaX
  return { task, axisDelta, orthogonalDelta }
}
