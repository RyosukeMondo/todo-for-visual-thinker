import { describe, expect, it, vi } from 'vitest'

import { ConsoleJsonLogger } from '@/core/adapters/ConsoleJsonLogger'

describe('ConsoleJsonLogger', () => {
  const fixedDate = new Date('2024-04-11T10:00:00.000Z')

  it('writes structured JSON entries with shared context', () => {
    const write = vi.fn()
    const stream = { write } as unknown as NodeJS.WritableStream
    const logger = new ConsoleJsonLogger({
      service: 'todo-cli',
      clock: () => fixedDate,
      stream,
    })

    logger.info('todo.created', { todoId: 'todo-1', priority: 4 })

    expect(write).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(write.mock.calls[0][0])
    expect(payload).toMatchObject({
      timestamp: fixedDate.toISOString(),
      level: 'info',
      event: 'todo.created',
      service: 'todo-cli',
      context: {
        todoId: 'todo-1',
        priority: 4,
      },
    })
  })

  it('honors per-entry overrides and omits empty context', () => {
    const write = vi.fn()
    const stream = { write } as unknown as NodeJS.WritableStream
    const logger = new ConsoleJsonLogger({ stream, clock: () => fixedDate })

    logger.log({
      level: 'error',
      event: 'todo.failed',
      message: 'Unable to persist todo',
      service: 'worker',
    })

    const payload = JSON.parse(write.mock.calls[0][0])
    expect(payload).toMatchObject({
      level: 'error',
      event: 'todo.failed',
      message: 'Unable to persist todo',
      service: 'worker',
    })
    expect(payload).not.toHaveProperty('context')
  })
})
