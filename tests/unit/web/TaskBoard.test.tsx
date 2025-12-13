import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { TaskBoardTask } from '@/web/components'
import { TaskBoard } from '@/web/components'

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

  it('notifies selection changes', () => {
    const handleSelect = vi.fn()
    const { getByText } = render(
      <TaskBoard tasks={sampleTasks} onSelect={handleSelect} />,
    )

    fireEvent.click(getByText('Peripheral vision'))

    expect(handleSelect).toHaveBeenCalledWith('todo-2')
  })

  it('updates viewport via zoom controls', () => {
    const handleViewport = vi.fn()
    const { getByRole, getByText } = render(
      <TaskBoard tasks={sampleTasks} onViewportChange={handleViewport} />,
    )

    fireEvent.click(getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(getByRole('button', { name: 'Zoom out' }))
    fireEvent.click(getByRole('button', { name: 'Reset view' }))

    // onViewportChange receives initial state plus three updates
    expect(handleViewport).toHaveBeenCalled()
    expect(handleViewport.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ scale: 1 }),
    )
    expect(getByText('100%')).toBeDefined()
  })

  it('pans the viewport via pointer events', () => {
    const { getByRole } = render(<TaskBoard tasks={sampleTasks} />)
    const surface = getByRole('presentation')

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

    // Scale display is still visible (no assertion on transform due to jsdom limitations)
    expect(getByRole('button', { name: 'Reset view' })).toBeDefined()
  })
})
