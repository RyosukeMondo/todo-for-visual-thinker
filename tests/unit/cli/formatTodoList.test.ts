import { describe, expect, it } from 'vitest'

import { formatTodoList } from '@/cli/output/formatTodoList'
import type { TodoDTO } from '@/shared/types/api'

const buildTodo = (overrides: Partial<TodoDTO> = {}): TodoDTO => ({
  id: overrides.id ?? 'todo-1',
  title: overrides.title ?? 'Map experience',
  description: overrides.description ?? 'Sketch relationships',
  status: overrides.status ?? 'pending',
  priority: overrides.priority ?? 3,
  category: overrides.category ?? 'Research',
  color: overrides.color ?? '#3b82f6',
  icon: overrides.icon ?? '🧠',
  position: overrides.position ?? { x: 12, y: -48 },
  visualSize: overrides.visualSize ?? 'medium',
  createdAt: overrides.createdAt ?? '2024-03-10T12:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2024-03-10T12:05:00.000Z',
  completedAt: overrides.completedAt,
})

describe('formatTodoList', () => {
  it('renders descriptive summaries for todos', () => {
    const output = formatTodoList([buildTodo()])

    expect(output).toContain('Visual Task Board (1 task)')
    expect(output).toContain('01.')
    expect(output).toContain('Map experience')
    expect(output).toContain('(12, -48)')
    expect(output).toContain('P3 • Important')
  })

  it('describes empty states clearly', () => {
    const output = formatTodoList([])

    expect(output).toContain('Visual Task Board (0 tasks)')
    expect(output).toContain('No todos match the current filters')
  })
})
