import { render, screen, within, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'

import type { TodoListTask } from '@/web/components'
import { TodoList } from '@/web/components'

const buildTask = (overrides: Partial<TodoListTask> = {}): TodoListTask => ({
  id: overrides.id ?? `todo-${Math.random().toString(36).slice(2, 6)}`,
  title: overrides.title ?? 'Visual cue',
  description: overrides.description ?? 'Spatial description',
  status: overrides.status ?? 'pending',
  priority: overrides.priority ?? 3,
  category: overrides.category ?? 'Design',
  color: overrides.color ?? '#60a5fa',
  icon: overrides.icon ?? '🎨',
})

describe('TodoList', () => {
  it('renders status sections with counts and tasks sorted by priority', () => {
    const tasks: TodoListTask[] = [
      buildTask({ id: 'a', title: 'Low priority', priority: 1 }),
      buildTask({ id: 'b', title: 'Top priority', priority: 5 }),
    ]

    render(<TodoList tasks={tasks} />)

    const pendingSection = screen.getByTestId('todo-list-section-pending')
    expect(
      within(pendingSection).getByText((text, node) => node?.textContent === '2 tasks')
    ).toBeVisible()

    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Top priority')
  })

  it('invokes onSelect with the clicked task id', () => {
    const tasks = [buildTask({ id: 'selection', title: 'Select me' })]
    const handleSelect = vi.fn()

    render(<TodoList tasks={tasks} onSelect={handleSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /Select me/ }))
    expect(handleSelect).toHaveBeenCalledWith('selection')
  })

  it('shows empty state when no tasks are present', () => {
    render(<TodoList tasks={[]} />)

    expect(screen.getByText('Spatial quiet — ready for focus')).toBeVisible()
  })

  it('applies selected state styling when selectedId matches a task', () => {
    const tasks = [buildTask({ id: 'selected' })]

    render(<TodoList tasks={tasks} selectedId="selected" />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
