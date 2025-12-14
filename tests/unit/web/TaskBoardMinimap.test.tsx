import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { TaskBoardTask } from '@/web/components'
import { TaskBoardMinimap } from '@/web/components/TaskBoardMinimap'

const tasks: TaskBoardTask[] = [
  {
    id: 'north',
    title: 'North',
    description: 'Top anchor',
    status: 'pending',
    priority: 3,
    color: '#60a5fa',
    position: { x: 0, y: 400 },
  },
  {
    id: 'south',
    title: 'South',
    description: 'Bottom anchor',
    status: 'completed',
    priority: 2,
    color: '#10b981',
    position: { x: 100, y: -300 },
  },
]

describe('TaskBoardMinimap', () => {
  it('renders nodes and viewport indicator inside minimap bounds', () => {
    const { getByRole, container } = render(
      <TaskBoardMinimap
        tasks={tasks}
        viewport={{ center: { x: 0, y: 0 }, scale: 1 }}
      />,
    )

    const minimap = getByRole('img', { name: 'Board minimap' })
    expect(minimap).toBeDefined()

    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(2)
    circles.forEach((circle) => {
      const cx = Number(circle.getAttribute('cx'))
      const cy = Number(circle.getAttribute('cy'))
      expect(cx).toBeGreaterThanOrEqual(0)
      expect(cx).toBeLessThanOrEqual(220)
      expect(cy).toBeGreaterThanOrEqual(0)
      expect(cy).toBeLessThanOrEqual(220)
    })

    const viewportRect = container.querySelector('rect[stroke="#0ea5e9"]')
    expect(viewportRect).toBeTruthy()
    expect(Number(viewportRect?.getAttribute('width'))).toBeGreaterThan(0)
  })

  it('respects scale boundaries when drawing viewport rectangle', () => {
    const { container } = render(
      <TaskBoardMinimap
        tasks={tasks}
        viewport={{ center: { x: 50000, y: 50000 }, scale: 10 }}
      />,
    )

    const viewportRect = container.querySelector('rect[stroke="#0ea5e9"]')
    expect(viewportRect).toBeTruthy()
    expect(Number(viewportRect?.getAttribute('width'))).toBeGreaterThanOrEqual(32)
    expect(Number(viewportRect?.getAttribute('width'))).toBeLessThanOrEqual(220)
  })

  it('notifies selection when user clicks a minimap node', () => {
    const handleSelect = vi.fn()
    const { container } = render(
      <TaskBoardMinimap
        tasks={tasks}
        viewport={{ center: { x: 0, y: 0 }, scale: 1 }}
        onSelect={handleSelect}
      />,
    )

    const node = container.querySelector('circle')
    node?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handleSelect).toHaveBeenCalledWith('north')
  })
})
