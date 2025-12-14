import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { TaskBoardTask } from '@/web/components'
import { TaskMetricsPanel } from '@/web/components/TaskMetricsPanel'
import { summarizeTasks } from '@/web/components/TaskMetricsPanel.metrics'

const sampleTasks: TaskBoardTask[] = [
  {
    id: 'todo-1',
    title: 'Frame strategy',
    description: 'Anchor priorities for the week',
    status: 'pending',
    priority: 5,
    color: '#f97316',
    position: { x: 0, y: 0 },
  },
  {
    id: 'todo-2',
    title: 'Prototype animation',
    description: 'Bring flow cues to life',
    status: 'in_progress',
    priority: 3,
    color: '#38bdf8',
    position: { x: 160, y: -80 },
  },
  {
    id: 'todo-3',
    title: 'Archive reflections',
    description: 'Celebrate completed wins',
    status: 'completed',
    priority: 2,
    color: '#34d399',
    position: { x: -120, y: 120 },
  },
]

describe('summarizeTasks', () => {
  it('aggregates totals, statuses, and priorities', () => {
    const summary = summarizeTasks(sampleTasks)

    expect(summary.total).toBe(3)
    expect(summary.completed).toBe(1)
    expect(summary.active).toBe(2)
    expect(summary.statuses.pending).toBe(1)
    expect(summary.statuses.in_progress).toBe(1)
    expect(summary.statuses.completed).toBe(1)
    expect(summary.priorities[5]).toBe(1)
    expect(summary.priorities[3]).toBe(1)
    expect(summary.completionRate).toBeCloseTo(1 / 3, 5)
  })

  it('returns zeroed metrics when there are no tasks', () => {
    const summary = summarizeTasks([])
    expect(summary.total).toBe(0)
    expect(summary.completionRate).toBe(0)
    expect(summary.statuses.pending).toBe(0)
    expect(summary.priorities[1]).toBe(0)
  })
})

describe('TaskMetricsPanel', () => {
  it('renders completion, flow states, and priority distribution', () => {
    const { getByText, getAllByRole, getAllByText } = render(
      <TaskMetricsPanel tasks={sampleTasks} />,
    )

    expect(getByText(/Board health/i)).toBeDefined()
    expect(getByText('3 tasks')).toBeDefined()
    expect(getByText(/Completion/i)).toBeDefined()
    expect(getAllByText('Completed').length).toBeGreaterThan(0)
    expect(getByText('Priority orbit')).toBeDefined()

    const progressBars = getAllByRole('progressbar')
    expect(progressBars.length).toBeGreaterThan(0)
  })
})
