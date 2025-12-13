import { describe, expect, it } from 'vitest'

import { Todo, type TodoProps } from '@/core/domain/Todo'
import { ValidationError } from '@/core/errors'

const baseProps = {
  id: 'todo-123',
  title: 'Sketch landing page',
}

const buildTodo = (overrides: Partial<TodoProps> = {}) =>
  Todo.restore({
    id: baseProps.id,
    title: baseProps.title,
    status: 'pending',
    priority: 3,
    color: '#60a5fa',
    position: { x: 0, y: 0 },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  })

describe('Todo entity creation', () => {
  it('creates a todo with sensible defaults', () => {
    const todo = Todo.create({ ...baseProps })

    expect(todo.status).toBe('pending')
    expect(todo.priority).toBe(3)
    expect(todo.position).toEqual({ x: 0, y: 0 })
    expect(todo.color).toBe('#60a5fa')
    expect(todo.visualSize).toBe('medium')
  })

  it('trims and validates title', () => {
    const todo = Todo.create({
      ...baseProps,
      title: '   Refine color palette   ',
    })
    expect(todo.title).toBe('Refine color palette')

    expect(() =>
      Todo.create({ ...baseProps, id: 'diff', title: '' }),
    ).toThrow(ValidationError)
  })

  it('requires completedAt when restoring completed todos', () => {
    expect(() =>
      buildTodo({
        status: 'completed',
        completedAt: undefined,
      }),
    ).toThrowError(ValidationError)
  })

  it('rejects completedAt timestamps for non-completed statuses', () => {
    expect(() =>
      buildTodo({
        status: 'pending',
        completedAt: new Date(),
      }),
    ).toThrowError(ValidationError)
  })
})

describe('Todo entity text fields', () => {
  it('limits description length', () => {
    const todo = buildTodo()

    todo.describe('Short description')
    expect(todo.description).toBe('Short description')

    expect(() =>
      todo.describe('a'.repeat(2050)),
    ).toThrowError(ValidationError)
  })

  it('validates category length and trimming', () => {
    const todo = buildTodo()
    todo.setCategory('  Research ')
    expect(todo.category).toBe('Research')

    expect(() =>
      todo.setCategory('a'.repeat(100)),
    ).toThrowError(ValidationError)
  })
})

describe('Todo visual attributes', () => {
  it('validates color codes', () => {
    const todo = buildTodo()
    todo.recolor('#ff0000')
    expect(todo.color).toBe('#ff0000')

    expect(() =>
      todo.recolor('red'),
    ).toThrowError(ValidationError)
  })

  it('validates priority bounds and adjusts visual size', () => {
    const todo = buildTodo()
    todo.setPriority(5)
    expect(todo.priority).toBe(5)
    expect(todo.visualSize).toBe('large')

    expect(() =>
      // @ts-expect-error intentionally invalid priority
      todo.setPriority(0),
    ).toThrowError(ValidationError)
  })
})

describe('Todo icon behavior', () => {
  it('supports setting and clearing icon tokens', () => {
    const todo = buildTodo()
    todo.setIcon('  star ')
    expect(todo.icon).toBe('star')

    todo.setIcon('')
    expect(todo.icon).toBeUndefined()
  })

  it('validates icon length limits', () => {
    const todo = buildTodo()
    expect(() =>
      todo.setIcon('a'.repeat(100)),
    ).toThrowError(ValidationError)
  })
})

describe('Todo spatial behavior', () => {
  it('prevents moving outside canvas limits', () => {
    const todo = buildTodo()
    todo.move({ x: 400, y: -250 })
    expect(todo.position).toEqual({ x: 400, y: -250 })

    expect(() =>
      todo.move({ x: 999_999, y: 0 }),
    ).toThrowError(ValidationError)
  })

  it('rejects NaN coordinates', () => {
    const todo = buildTodo()
    expect(() =>
      todo.move({ x: Number.NaN, y: 0 }),
    ).toThrowError(ValidationError)
  })
})

describe('Todo status transitions', () => {
  it('tracks status transitions', () => {
    const todo = buildTodo()
    todo.markInProgress()
    expect(todo.status).toBe('in_progress')
    expect(todo.completedAt).toBeUndefined()

    todo.markCompleted(new Date('2024-02-01T00:00:00.000Z'))
    expect(todo.status).toBe('completed')
    expect(todo.completedAt?.toISOString()).toBe('2024-02-01T00:00:00.000Z')

    todo.reopen()
    expect(todo.status).toBe('pending')
    expect(todo.completedAt).toBeUndefined()
  })
})

describe('Todo idempotent operations', () => {
  it('ignores rename when value equals trimmed title', () => {
    const todo = buildTodo()
    const previousUpdatedAt = todo.updatedAt
    todo.rename(' Sketch landing page ')
    expect(todo.updatedAt).toBe(previousUpdatedAt)
  })

  it('ignores describe when description is unchanged', () => {
    const todo = buildTodo()
    todo.describe('Mood board exploration')
    const updatedAt = todo.updatedAt
    todo.describe(' Mood board exploration ')
    expect(todo.updatedAt).toBe(updatedAt)
  })

  it('ignores redundant move commands', () => {
    const todo = buildTodo()
    todo.move({ x: 10, y: 20 })
    const updatedAt = todo.updatedAt
    todo.move({ x: 10, y: 20 })
    expect(todo.updatedAt).toBe(updatedAt)
  })

  it('ignores redundant category, color, and priority updates', () => {
    const todo = buildTodo()
    todo.setCategory('Research')
    todo.recolor('#ff0000')
    todo.setPriority(4)
    const updatedAt = todo.updatedAt
    todo.setCategory('Research')
    todo.recolor('#ff0000')
    todo.setPriority(4)
    expect(todo.updatedAt).toBe(updatedAt)
  })

  it('ignores redundant status transitions', () => {
    const todo = buildTodo()
    const pendingUpdatedAt = todo.updatedAt
    todo.reopen()
    expect(todo.updatedAt).toBe(pendingUpdatedAt)

    todo.markInProgress()
    const inProgressUpdatedAt = todo.updatedAt
    todo.markInProgress()
    expect(todo.updatedAt).toBe(inProgressUpdatedAt)

    todo.markCompleted(new Date('2024-02-01T00:00:00.000Z'))
    const completedUpdatedAt = todo.updatedAt
    todo.markCompleted()
    expect(todo.updatedAt).toBe(completedUpdatedAt)
  })
})
