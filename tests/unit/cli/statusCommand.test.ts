import { Command } from 'commander'
import { Writable } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { registerStatusCommand } from '@/cli/commands/status'
import type { CliIO } from '@/cli/io'
import { ValidationError } from '@/core/errors'
import type { GetBoardStatus } from '@/core/usecases'

const createMemoryStream = () => {
  let buffer = ''
  return {
    stream: new Writable({
      write(chunk, _encoding, callback) {
        buffer += chunk.toString()
        callback()
      },
    }),
    read: () => buffer,
    reset: () => {
      buffer = ''
    },
  }
}

const stdout = createMemoryStream()
const stderr = createMemoryStream()
const io: CliIO = { stdout: stdout.stream, stderr: stderr.stream }

const buildProgram = (execute: ReturnType<typeof vi.fn>): Command => {
  const program = new Command()
  program.exitOverride()
  registerStatusCommand(program, { getBoardStatus: { execute } as Pick<GetBoardStatus, 'execute'> }, io)
  return program
}

beforeEach(() => {
  stdout.reset()
  stderr.reset()
  process.exitCode = undefined
})

describe('CLI status command', () => {
  it('outputs structured snapshot payloads', async () => {
    const execute = vi.fn().mockResolvedValue({
      total: 4,
      active: 3,
      completed: 1,
      completionRate: 0.25,
      statuses: { pending: 2, in_progress: 1, completed: 1 },
      priorities: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 },
      categories: [{ label: 'Strategy', value: 'strategy', color: '#f97316', count: 2 }],
      lastUpdatedAt: new Date('2024-02-03T14:00:00Z'),
      lastCreatedAt: new Date('2024-02-03T13:00:00Z'),
    })
    const program = buildProgram(execute)

    await program.parseAsync(['node', 'cli', 'status'])

    expect(execute).toHaveBeenCalled()
    const payload = JSON.parse(stdout.read().trim())
    expect(payload.success).toBe(true)
    expect(payload.data.meta.total).toBe(4)
    expect(payload.data.meta.completionRate).toBe(0.25)
    expect(payload.data.categories[0].label).toBe('Strategy')
  })

  it('emits structured errors and sets exit code on failure', async () => {
    const execute = vi.fn().mockRejectedValue(
      new ValidationError('Snapshot failed', { reason: 'db_unreachable' }),
    )
    const program = buildProgram(execute)

    await program.parseAsync(['node', 'cli', 'status'])

    const payload = JSON.parse(stderr.read().trim())
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })
})
