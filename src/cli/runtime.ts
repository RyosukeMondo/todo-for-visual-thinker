import Database, { type Database as SQLiteInstance } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'

import { SQLiteTodoRepository } from '@core/adapters/SQLiteTodoRepository'
import { SQLiteRelationshipRepository } from '@core/adapters/SQLiteRelationshipRepository'
import type { TodoRepository, RelationshipRepository } from '@core/ports'
import {
  CreateRelationship,
  CreateTodo,
  DeleteRelationship,
  DeleteTodo,
  ListRelationships,
  ListTodos,
  UpdateRelationship,
  UpdateTodo,
} from '@core/usecases'

export type RuntimeOverrides = Readonly<{
  dbPath?: string
  idGenerator?: () => string
  clock?: () => Date
  databaseFactory?: (path: string) => SQLiteInstance
}>

export type CliRuntime = Readonly<{
  repository: TodoRepository
  relationships: RelationshipRepository
  createTodo: CreateTodo
  listTodos: ListTodos
  listRelationships: ListRelationships
  deleteTodo: DeleteTodo
  deleteRelationship: DeleteRelationship
  updateRelationship: UpdateRelationship
  updateTodo: UpdateTodo
  createRelationship: CreateRelationship
  shutdown: () => void
}>

const DEFAULT_DB_PATH = resolve(process.cwd(), 'data', 'todos.db')

export const createRuntime = (overrides: RuntimeOverrides = {}): CliRuntime => {
  const dbPath = normalizeDbPath(overrides.dbPath ?? DEFAULT_DB_PATH)
  ensureDirectory(dbPath)
  const openDatabase = overrides.databaseFactory ?? ((path: string) => new Database(path))
  const db = openDatabase(dbPath)
  const repository = new SQLiteTodoRepository(db)
  const relationships = new SQLiteRelationshipRepository(db)
  const createTodo = new CreateTodo({
    repository,
    idGenerator: overrides.idGenerator ?? randomUUID,
    clock: overrides.clock,
  })
  const listTodos = new ListTodos({ repository })
  const listRelationships = new ListRelationships({ repository: relationships })
  const deleteTodo = new DeleteTodo({ repository })
  const deleteRelationship = new DeleteRelationship({ repository: relationships })
  const updateRelationship = new UpdateRelationship({ repository: relationships })
  const updateTodo = new UpdateTodo({ repository, clock: overrides.clock })
  const createRelationship = new CreateRelationship({
    relationships,
    todos: repository,
    idGenerator: overrides.idGenerator ?? randomUUID,
    clock: overrides.clock,
  })

  return {
    repository,
    relationships,
    createTodo,
    listTodos,
    listRelationships,
    deleteTodo,
    deleteRelationship,
    updateRelationship,
    updateTodo,
    createRelationship,
    shutdown: () => db.close(),
  }
}

const ensureDirectory = (filePath: string): void => {
  if (filePath === ':memory:' || filePath.startsWith('file:')) {
    return
  }
  const directory = dirname(filePath)
  mkdirSync(directory, { recursive: true })
}

const normalizeDbPath = (candidate: string): string => {
  if (candidate === ':memory:' || candidate.startsWith('file:')) {
    return candidate
  }
  return isAbsolute(candidate) ? candidate : resolve(candidate)
}
