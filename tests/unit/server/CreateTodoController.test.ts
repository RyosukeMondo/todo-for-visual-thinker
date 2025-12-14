import { describe, expect, it, vi } from 'vitest'

import { Todo } from '@core/domain/Todo'
import { CreateTodoController } from '@/server/controllers/CreateTodoController'

const buildTodo = (overrides?: Partial<Parameters<typeof Todo.create>[0]>) =>
  Todo.create({
    id: overrides?.id ?? 'todo-id',
    title: overrides?.title ?? 'Existing',
    color: overrides?.color ?? '#0ea5e9',
    ...overrides,
  })

describe('CreateTodoController', () => {
  it('auto-positions new todos when no explicit coordinates provided', async () => {
    const existing = [buildTodo({ id: 'existing-1' })]
    const planPosition = vi.fn().mockReturnValue({ x: 120, y: -80 })
    const listTodos = { execute: vi.fn().mockResolvedValue(existing) }
    const created = buildTodo({ id: 'new-1' })
    const createTodo = { execute: vi.fn().mockResolvedValue(created) }
    const controller = new CreateTodoController({
      createTodo,
      listTodos,
      planPosition,
    })

    const result = await controller.handle({ title: 'New task', color: '#22c55e' })

    expect(result).toBe(created)
    expect(planPosition).toHaveBeenCalledWith(existing)
    expect(createTodo.execute).toHaveBeenCalledWith(
      expect.objectContaining({ position: { x: 120, y: -80 } }),
    )
  })

  it('uses provided coordinates without querying existing todos', async () => {
    const planPosition = vi.fn()
    const listTodos = { execute: vi.fn() }
    const created = buildTodo({ id: 'explicit' })
    const createTodo = { execute: vi.fn().mockResolvedValue(created) }
    const controller = new CreateTodoController({
      createTodo,
      listTodos,
      planPosition,
    })

    await controller.handle({
      title: 'Placed manually',
      color: '#f97316',
      position: { x: 400, y: 120 },
    })

    expect(listTodos.execute).not.toHaveBeenCalled()
    expect(planPosition).not.toHaveBeenCalled()
    expect(createTodo.execute).toHaveBeenCalledWith(
      expect.objectContaining({ position: { x: 400, y: 120 } }),
    )
  })
})
