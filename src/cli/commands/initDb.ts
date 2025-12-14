import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { existsSync, unlinkSync } from 'node:fs'
import type { Command } from 'commander'

import { SQLiteTodoRepository } from '@core/adapters/SQLiteTodoRepository'
import { SQLiteRelationshipRepository } from '@core/adapters/SQLiteRelationshipRepository'
import { Todo } from '@core/domain/Todo'
import { ValidationError } from '@core/errors'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeError } from '../serializers'
import {
  DEFAULT_DB_PATH,
  ensureDbDirectory,
  isFileBackedPath,
  resolveDbPath,
} from '../storage'

export type InitDbDependencies = Readonly<{
  databaseFactory?: (path: string) => ReturnType<typeof Database>
  idGenerator?: () => string
  clock?: () => Date
}>

export type InitDbOptions = {
  db?: string
  force?: boolean
  seedDemo?: boolean
}

export const registerInitDbCommand = (
  program: Command,
  io: CliIO,
  deps: InitDbDependencies = {},
): void => {
  program
    .command('init-db')
    .description('Initialize the SQLite database for Todo for Visual Thinker')
    .option('--db <path>', 'Custom database path', DEFAULT_DB_PATH)
    .option('-f, --force', 'Overwrite existing database file if present', false)
    .option('--seed-demo', 'Seed the database with demo tasks', false)
    .action(async (options: InitDbOptions) => {
      await handleInitDb(options, io, deps)
    })
}

const handleInitDb = async (
  options: InitDbOptions,
  io: CliIO,
  deps: InitDbDependencies,
): Promise<void> => {
  try {
    const context = prepareContext(options, deps)
    const seededCount = await initializeSchema(context, Boolean(options.seedDemo))

    writeJson(io.stdout, {
      success: true,
      data: {
        dbPath: context.dbPath,
        overwroteExisting: context.overwroteExisting,
        seededDemoTasks: seededCount,
      },
    })
  } catch (error) {
    writeJson(io.stderr, {
      success: false,
      error: serializeError(error),
    })
    process.exitCode = 1
  }
}

type PreparedInitContext = Readonly<{
  dbPath: string
  overwroteExisting: boolean
  database: ReturnType<typeof Database>
  idGenerator: () => string
  clock: () => Date
}>

const prepareContext = (
  options: InitDbOptions,
  deps: InitDbDependencies,
): PreparedInitContext => {
  const dbPath = resolveDbPath(options.db)
  const databaseFactory = deps.databaseFactory ?? ((path: string) => new Database(path))
  const idGenerator = deps.idGenerator ?? randomUUID
  const clock = deps.clock ?? (() => new Date())

  const overwroteExisting = resetDatabaseIfNeeded(dbPath, Boolean(options.force))
  ensureDbDirectory(dbPath)
  const database = databaseFactory(dbPath)

  return { dbPath, overwroteExisting, database, idGenerator, clock }
}

const initializeSchema = async (
  context: PreparedInitContext,
  shouldSeedDemo: boolean,
): Promise<number> => {
  try {
    const todoRepository = new SQLiteTodoRepository(context.database)
    new SQLiteRelationshipRepository(context.database)

    if (!shouldSeedDemo) {
      return 0
    }
    return await seedDemoTodos(todoRepository, context.clock, context.idGenerator)
  } finally {
    context.database.close()
  }
}

const resetDatabaseIfNeeded = (dbPath: string, force: boolean): boolean => {
  if (!isFileBackedPath(dbPath)) {
    return false
  }
  const exists = existsSync(dbPath)
  if (!exists) {
    return false
  }
  if (!force) {
    throw new ValidationError('Database already exists. Re-run with --force to overwrite.', {
      dbPath,
    })
  }
  unlinkSync(dbPath)
  return true
}

const seedDemoTodos = async (
  repository: SQLiteTodoRepository,
  clock: () => Date,
  idGenerator: () => string,
): Promise<number> => {
  const seeds = buildDemoSeeds()
  for (const seed of seeds) {
    const todo = Todo.create({
      id: idGenerator(),
      title: seed.title,
      description: seed.description,
      status: seed.status,
      priority: seed.priority,
      category: seed.category,
      color: seed.color,
      icon: seed.icon,
      position: seed.position,
      createdAt: clock(),
    })
    await repository.save(todo)
  }
  return seeds.length
}

type DemoSeed = Readonly<{
  title: string
  description: string
  status: Todo['status']
  priority: Todo['priority']
  category: string
  color: string
  icon: string
  position: Todo['position']
}>

const buildDemoSeeds = (): DemoSeed[] => {
  return [
    {
      title: 'Map the launch journey',
      description:
        'Sketch the key milestones and dependencies for the v1 product launch to anchor the spatial board.',
      status: 'in_progress',
      priority: 4,
      category: 'Strategy',
      color: '#f97316',
      icon: '🧭',
      position: { x: 320, y: -140 },
    },
    {
      title: 'Design visual palette',
      description:
        'Validate the color semantics and iconography that reduce cognitive load for visual thinkers.',
      status: 'pending',
      priority: 3,
      category: 'Design',
      color: '#60a5fa',
      icon: '🎨',
      position: { x: -120, y: 40 },
    },
    {
      title: 'Prototype infinite canvas',
      description:
        'Create an interactive slice of the canvas experience with zoom, pan, and clustering.',
      status: 'completed',
      priority: 5,
      category: 'Experience',
      color: '#34d399',
      icon: '🛰️',
      position: { x: 40, y: 220 },
    },
  ]
}
