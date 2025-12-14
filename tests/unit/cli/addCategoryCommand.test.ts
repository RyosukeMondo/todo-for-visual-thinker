import { Command } from 'commander'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerAddCategoryCommand } from '@/cli/commands/addCategory'
import { Category } from '@/core/domain/Category'
import { ValidationError } from '@/core/errors'
import type { CliIO } from '@/cli/io'
import type { CreateCategory } from '@/core/usecases'

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

const buildProgram = (
  execute: ReturnType<typeof vi.fn>,
  io: CliIO,
): Command => {
  const program = new Command()
  program.exitOverride()
  const createCategory = { execute } as Pick<CreateCategory, 'execute'>
  registerAddCategoryCommand(program, { createCategory }, io)
  return program
}

const args = ['node', 'cli', 'category:add', 'Research'] as const

beforeEach(() => {
  stdout.reset()
  stderr.reset()
  process.exitCode = undefined
})

afterEach(() => {
  process.exitCode = undefined
})

describe('CLI category:add command', () => {
  it('executes use case and prints serialized category', async () => {
    const category = Category.create({
      id: 'cat-01',
      name: 'Research',
      color: '#38bdf8',
      createdAt: new Date('2024-02-01T10:00:00.000Z'),
    })
    const execute = vi.fn().mockResolvedValue(category)
    const program = buildProgram(execute, io)

    await program.parseAsync([...args, '--color', '#38bdf8'])

    expect(execute).toHaveBeenCalledWith({
      name: 'Research',
      color: '#38bdf8',
      icon: undefined,
      description: undefined,
    })
    const payload = JSON.parse(stdout.read().trim())
    expect(payload.success).toBe(true)
    expect(payload.data.category.id).toBe('cat-01')
    expect(payload.data.category.createdAt).toBe('2024-02-01T10:00:00.000Z')
    expect(stderr.read()).toBe('')
  })

  it('surfaced domain errors as JSON and sets exit code', async () => {
    const error = new ValidationError('Name required')
    const execute = vi.fn().mockRejectedValue(error)
    const program = buildProgram(execute, io)

    await program.parseAsync([...args])

    const payload = JSON.parse(stderr.read().trim())
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })
})
