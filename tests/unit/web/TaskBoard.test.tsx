import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { TaskBoardRelationship, TaskBoardTask } from '@/web/components'
import { TaskBoard } from '@/web/components'
import { buildConnectionSegments } from '@/web/components/TaskBoard.connections'

const sampleTasks: TaskBoardTask[] = [
  {
    id: 'todo-1',
    title: 'Anchor point',
    description: 'Central focus',
    status: 'pending',
    priority: 3,
    color: '#60a5fa',
    position: { x: 0, y: 0 },
  },
  {
    id: 'todo-2',
    title: 'Peripheral vision',
    description: 'Secondary cue',
    status: 'in_progress',
    priority: 4,
    color: '#f97316',
    position: { x: 200, y: -160 },
  },
]

describe('TaskBoard', () => {
  it('renders tasks and highlights selection', () => {
    const { getByText } = render(
      <TaskBoard tasks={sampleTasks} selectedId="todo-2" />,
    )

    expect(getByText('Anchor point')).toBeDefined()
    const secondary = getByText('Peripheral vision').closest('button')
    expect(secondary?.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('TaskBoard interactions', () => {
  it('notifies selection changes', () => {
    const handleSelect = vi.fn()
    const { getByText } = render(
      <TaskBoard tasks={sampleTasks} onSelect={handleSelect} />,
    )

    fireEvent.click(getByText('Peripheral vision'))

    expect(handleSelect).toHaveBeenCalledWith('todo-2')
  })
})

describe('TaskBoard viewport controls', () => {
  it('updates viewport via zoom controls', () => {
    const handleViewport = vi.fn()
    const { getByRole, getByText } = render(
      <TaskBoard tasks={sampleTasks} onViewportChange={handleViewport} />,
    )

    fireEvent.click(getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(getByRole('button', { name: 'Zoom out' }))
    fireEvent.click(getByRole('button', { name: 'Reset view' }))

    expect(handleViewport).toHaveBeenCalled()
    expect(handleViewport.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ scale: 1 }),
    )
    expect(getByText('100%')).toBeDefined()
  })

  it('pans the viewport via pointer events', () => {
    const { getByRole } = render(<TaskBoard tasks={sampleTasks} />)
    const surface = getByRole('region', { name: 'Task board canvas' })

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(surface, {
      pointerId: 1,
      clientX: 120,
      clientY: 80,
    })
    fireEvent.pointerUp(surface, {
      pointerId: 1,
    })

    expect(getByRole('button', { name: 'Reset view' })).toBeDefined()
  })

  it('supports keyboard navigation for panning and zooming', () => {
    const handleViewport = vi.fn()
    const { getByRole, getByText } = render(
      <TaskBoard tasks={sampleTasks} onViewportChange={handleViewport} />,
    )
    const surface = getByRole('region', { name: 'Task board canvas' })

    surface.focus()
    fireEvent.keyDown(surface, { key: 'ArrowRight' })
    fireEvent.keyDown(surface, { key: 'ArrowDown', shiftKey: true })
    fireEvent.keyDown(surface, { key: '+' })
    fireEvent.keyDown(surface, { key: '-', shiftKey: true })
    fireEvent.keyDown(surface, { key: '0', ctrlKey: true })

    expect(handleViewport).toHaveBeenCalled()
    expect(getByText('100%')).toBeDefined()
  })
})

describe('TaskBoard relationships', () => {
  it('renders curved relationship connections with arrow markers', () => {
    const relationships: TaskBoardRelationship[] = [
      { id: 'rel-1', fromId: 'todo-1', toId: 'todo-2', type: 'depends_on' },
    ]

    const { container } = render(
      <TaskBoard tasks={sampleTasks} relationships={relationships} />,
    )

    const path = container.querySelector('path[data-relationship-id="rel-1"]')
    expect(path).toBeTruthy()
    expect(path?.getAttribute('stroke')).toBe('#0284c7')
    expect(path?.getAttribute('d')).toMatch(/^M \d+ \d+ C/)

    const marker = container.querySelector('marker')
    expect(marker).not.toBeNull()
  })

  it('ignores relationships with missing tasks', () => {
    const relationships: TaskBoardRelationship[] = [
      { id: 'rel-missing', fromId: 'todo-1', toId: 'missing', type: 'blocks' },
    ]

    const { container } = render(
      <TaskBoard tasks={sampleTasks} relationships={relationships} />,
    )

    expect(
      container.querySelector('path[data-relationship-id="rel-missing"]'),
    ).toBeNull()
  })

  it('dims unrelated connections when a task is hovered', () => {
    const relationships: TaskBoardRelationship[] = [
      { id: 'rel-1', fromId: 'todo-1', toId: 'todo-2', type: 'depends_on' },
      { id: 'rel-2', fromId: 'todo-2', toId: 'todo-3', type: 'related_to' },
    ]
    const tasks: TaskBoardTask[] = buildTasksWithOrbit()

    const { container, getByText } = render(
      <TaskBoard
        tasks={tasks}
        relationships={relationships}
        onHover={() => {}}
      />,
    )

    fireEvent.mouseEnter(getByText('Anchor point'))

    const highlighted = container.querySelector('path[data-relationship-id="rel-1"]')
    const dimmed = container.querySelector('path[data-relationship-id="rel-2"]')
    expect(highlighted?.getAttribute('class')).not.toContain('opacity-40')
    expect(dimmed?.getAttribute('class')).toContain('opacity-40')
  })
})

describe('buildConnectionSegments', () => {
  it('marks connections as highlighted or dimmed relative to focus task', () => {
    const relationships: TaskBoardRelationship[] = [
      { id: 'rel-1', fromId: 'todo-1', toId: 'todo-2', type: 'depends_on' },
      { id: 'rel-2', fromId: 'todo-3', toId: 'todo-1', type: 'blocks' },
    ]
    const tasks: TaskBoardTask[] = buildTasksWithOrbit()

    const segments = buildConnectionSegments(tasks, relationships, {
      focusTaskId: 'todo-2',
    })

    const highlighted = segments.find((segment) => segment.id === 'rel-1')
    const dimmed = segments.find((segment) => segment.id === 'rel-2')
    expect(highlighted?.emphasis).toBe('highlighted')
    expect(dimmed?.emphasis).toBe('dimmed')
  })
})

const buildTasksWithOrbit = (): TaskBoardTask[] => [
  ...sampleTasks,
  {
    id: 'todo-3',
    title: 'Orbit',
    description: 'Tertiary',
    status: 'completed',
    priority: 2,
    color: '#10b981',
    position: { x: -240, y: 180 },
  },
]
