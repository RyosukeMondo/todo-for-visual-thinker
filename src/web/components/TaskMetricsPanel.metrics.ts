import type { TodoPriority, TodoStatus } from '@core/domain/Todo'

import type { TaskBoardTask } from './TaskBoard'

export const STATUS_SEQUENCE: readonly TodoStatus[] = ['pending', 'in_progress', 'completed']
export const PRIORITY_SEQUENCE: readonly TodoPriority[] = [1, 2, 3, 4, 5]

export const STATUS_META: Record<
  TodoStatus,
  { label: string; accent: string; description: string }
> = {
  pending: {
    label: 'Pending',
    accent: '#fbbf24',
    description: 'Ideas incubating before action',
  },
  in_progress: {
    label: 'In progress',
    accent: '#38bdf8',
    description: 'Energy actively invested right now',
  },
  completed: {
    label: 'Completed',
    accent: '#34d399',
    description: 'Wins captured and celebrated',
  },
}

export const PRIORITY_META: Record<
  TodoPriority,
  { label: string; accent: string; description: string }
> = {
  5: {
    label: 'Critical',
    accent: '#f43f5e',
    description: 'Work that dictates the board gravity',
  },
  4: {
    label: 'High',
    accent: '#fb923c',
    description: 'High-energy pieces demanding focus',
  },
  3: {
    label: 'Medium',
    accent: '#818cf8',
    description: 'Steady orbit tasks keeping cadence',
  },
  2: {
    label: 'Low',
    accent: '#0ea5e9',
    description: 'Supporting cues to reinforce flow',
  },
  1: {
    label: 'Emerging',
    accent: '#14b8a6',
    description: 'Ideas forming on the periphery',
  },
}

export type TaskMetricsSummary = Readonly<{
  total: number
  completed: number
  active: number
  completionRate: number
  statuses: Record<TodoStatus, number>
  priorities: Record<TodoPriority, number>
}>

export const summarizeTasks = (tasks: readonly TaskBoardTask[]): TaskMetricsSummary => {
  const statuses = STATUS_SEQUENCE.reduce<Record<TodoStatus, number>>(
    (acc, status) => {
      acc[status] = 0
      return acc
    },
    {} as Record<TodoStatus, number>,
  )

  const priorities = PRIORITY_SEQUENCE.reduce<Record<TodoPriority, number>>(
    (acc, priority) => {
      acc[priority] = 0
      return acc
    },
    {} as Record<TodoPriority, number>,
  )

  let completed = 0

  tasks.forEach((task) => {
    statuses[task.status] += 1
    priorities[task.priority] += 1
    if (task.status === 'completed') {
      completed += 1
    }
  })

  const total = tasks.length
  const completionRate = total === 0 ? 0 : completed / total

  return {
    total,
    completed,
    active: total - completed,
    completionRate,
    statuses,
    priorities,
  }
}
