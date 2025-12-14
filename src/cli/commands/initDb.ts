import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { existsSync, unlinkSync } from 'node:fs'
import type { Command } from 'commander'

import { SQLiteTodoRepository } from '@core/adapters/SQLiteTodoRepository'
import { SQLiteRelationshipRepository } from '@core/adapters/SQLiteRelationshipRepository'
import { Relationship, type RelationshipType } from '@core/domain/Relationship'
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
    const seeded = await initializeSchema(context, Boolean(options.seedDemo))

    writeJson(io.stdout, {
      success: true,
      data: {
        dbPath: context.dbPath,
        overwroteExisting: context.overwroteExisting,
        seededDemoTasks: seeded.seededTodos,
        seededDemoRelationships: seeded.seededRelationships,
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

type SeedStats = Readonly<{
  seededTodos: number
  seededRelationships: number
}>

const initializeSchema = async (
  context: PreparedInitContext,
  shouldSeedDemo: boolean,
): Promise<SeedStats> => {
  try {
    const todoRepository = new SQLiteTodoRepository(context.database)
    const relationshipRepository = new SQLiteRelationshipRepository(
      context.database,
    )

    if (!shouldSeedDemo) {
      return { seededTodos: 0, seededRelationships: 0 }
    }
    return await seedDemoData(
      { todos: todoRepository, relationships: relationshipRepository },
      context.clock,
      context.idGenerator,
    )
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

type DemoSeed = Readonly<{
  slug: string
  title: string
  description: string
  status: Todo['status']
  priority: Todo['priority']
  category: string
  color: string
  icon: string
  position: Todo['position']
}>

type DemoRelationshipSeed = Readonly<{
  from: string
  to: string
  type: RelationshipType
  description?: string
}>

const seedDemoData = async (
  repositories: {
    todos: Pick<SQLiteTodoRepository, 'save'>
    relationships: Pick<SQLiteRelationshipRepository, 'save'>
  },
  clock: () => Date,
  idGenerator: () => string,
): Promise<SeedStats> => {
  const todoIds = await insertDemoTodos(
    repositories.todos,
    clock,
    idGenerator,
  )
  const relationshipCount = await insertDemoRelationships(
    repositories.relationships,
    todoIds,
    clock,
    idGenerator,
  )
  return {
    seededTodos: todoIds.size,
    seededRelationships: relationshipCount,
  }
}

const insertDemoTodos = async (
  repository: Pick<SQLiteTodoRepository, 'save'>,
  clock: () => Date,
  idGenerator: () => string,
): Promise<Map<string, string>> => {
  const seeds = buildDemoTodoSeeds()
  const ids = new Map<string, string>()
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
    ids.set(seed.slug, todo.id)
  }
  return ids
}

const insertDemoRelationships = async (
  repository: Pick<SQLiteRelationshipRepository, 'save'>,
  idsBySlug: Map<string, string>,
  clock: () => Date,
  idGenerator: () => string,
): Promise<number> => {
  const seeds = buildDemoRelationshipSeeds()
  let created = 0
  for (const seed of seeds) {
    const fromId = idsBySlug.get(seed.from)
    const toId = idsBySlug.get(seed.to)
    if (!fromId || !toId) {
      throw new ValidationError('Demo relationship references unknown task', {
        seed,
      })
    }
    const relationship = Relationship.create({
      id: idGenerator(),
      fromId,
      toId,
      type: seed.type,
      description: seed.description,
      createdAt: clock(),
    })
    await repository.save(relationship)
    created += 1
  }
  return created
}

const buildDemoTodoSeeds = (): DemoSeed[] => {
  return [
    {
      slug: 'launch-map',
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
      slug: 'visual-palette',
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
      slug: 'canvas-prototype',
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

const buildDemoRelationshipSeeds = (): DemoRelationshipSeed[] => [
  {
    from: 'launch-map',
    to: 'visual-palette',
    type: 'depends_on',
    description: 'Launch planning leans on a grounded design language.',
  },
  {
    from: 'canvas-prototype',
    to: 'launch-map',
    type: 'blocks',
    description: 'We cannot finalize launch orchestration without a canvas prototype.',
  },
  {
    from: 'canvas-prototype',
    to: 'visual-palette',
    type: 'related_to',
    description: 'Prototype visuals should stay in sync with the color framework.',
  },
]
