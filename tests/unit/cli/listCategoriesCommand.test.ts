import { Command } from 'commander'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerListCategoriesCommand } from '@/cli/commands/listCategories'
import { Category } from '@/core/domain/Category'
import type { CliIO } from '@/cli/io'
import type { ListCategories } from '@/core/usecases'

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
  const listCategories = { execute } as Pick<ListCategories, 'execute'>
  registerListCategoriesCommand(program, { listCategories }, io)
  return program
}

const args = ['node', 'cli', 'category:list'] as const

beforeEach(() => {
  stdout.reset()
  stderr.reset()
  process.exitCode = undefined
})

afterEach(() => {
  process.exitCode = undefined
})

describe('CLI category:list command', () => {
  it('queries list use case and prints serialized payload', async () => {
    const categories = [
      Category.create({
        id: 'cat-01',
        name: 'Strategy',
        color: '#f97316',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
      Category.create({
        id: 'cat-02',
        name: 'Design',
        color: '#38bdf8',
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
      }),
    ]
    const execute = vi.fn().mockResolvedValue(categories)
    const program = buildProgram(execute, io)

    await program.parseAsync([...args, '--limit', '5', '--offset', '2'])

    expect(execute).toHaveBeenCalledWith({ limit: 5, offset: 2 })
    const payload = JSON.parse(stdout.read().trim())
    expect(payload.success).toBe(true)
    expect(payload.data.count).toBe(2)
    expect(payload.data.categories[0].createdAt).toBe('2024-01-01T00:00:00.000Z')
    expect(stderr.read()).toBe('')
  })

  it('validates pagination numbers before invoking use case', async () => {
    const execute = vi.fn()
    const program = buildProgram(execute, io)

    await program.parseAsync([...args, '--limit', '-3'])

    expect(execute).not.toHaveBeenCalled()
    const payload = JSON.parse(stderr.read().trim())
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })
})
