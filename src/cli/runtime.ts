import Database, { type Database as SQLiteInstance } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { SQLiteTodoRepository } from '@core/adapters/SQLiteTodoRepository'
import { SQLiteRelationshipRepository } from '@core/adapters/SQLiteRelationshipRepository'
import { SQLiteCategoryRepository } from '@core/adapters/SQLiteCategoryRepository'
import type {
  TodoRepository,
  RelationshipRepository,
  CategoryRepository,
} from '@core/ports'
import {
  CreateRelationship,
  CreateTodo,
  CreateCategory,
  DeleteRelationship,
  DeleteTodo,
  GetBoardStatus,
  GetBoardSnapshot,
  ListRelationships,
  ListTodos,
  ListCategories,
  UpdateRelationship,
  UpdateTodo,
} from '@core/usecases'

import { DEFAULT_DB_PATH, ensureDbDirectory, resolveDbPath } from './storage'

export type RuntimeOverrides = Readonly<{
  dbPath?: string
  idGenerator?: () => string
  clock?: () => Date
  databaseFactory?: (path: string) => SQLiteInstance
}>

export type CliRuntime = Readonly<{
  repository: TodoRepository
  relationships: RelationshipRepository
  categories: CategoryRepository
  createTodo: CreateTodo
  createCategory: CreateCategory
  listTodos: ListTodos
  listCategories: ListCategories
  getBoardStatus: GetBoardStatus
  getBoardSnapshot: GetBoardSnapshot
  listRelationships: ListRelationships
  deleteTodo: DeleteTodo
  deleteRelationship: DeleteRelationship
  updateRelationship: UpdateRelationship
  updateTodo: UpdateTodo
  createRelationship: CreateRelationship
  shutdown: () => void
}>

export const createRuntime = (overrides: RuntimeOverrides = {}): CliRuntime => {
  const dbPath = normalizeDbPath(overrides.dbPath ?? DEFAULT_DB_PATH)
  ensureDbDirectory(dbPath)
  const openDatabase =
    overrides.databaseFactory ?? ((path: string) => new Database(path))
  const db = openDatabase(dbPath)
  const repository = new SQLiteTodoRepository(db)
  const relationships = new SQLiteRelationshipRepository(db)
  const categories = new SQLiteCategoryRepository(db)
  const idGenerator = overrides.idGenerator ?? randomUUID
  const useCases = buildUseCases({
    repository,
    relationships,
    categories,
    idGenerator,
    clock: overrides.clock,
  })

  return {
    repository,
    relationships,
    categories,
    ...useCases,
    shutdown: () => db.close(),
  }
}

type UseCaseBuilderInput = Readonly<{
  repository: TodoRepository
  relationships: RelationshipRepository
  categories: CategoryRepository
  idGenerator: () => string
  clock?: () => Date
}>

const buildUseCases = ({
  repository,
  relationships,
  categories,
  idGenerator,
  clock,
}: UseCaseBuilderInput) => {
  const createTodo = new CreateTodo({ repository, idGenerator, clock })
  const createCategory = new CreateCategory({
    repository: categories,
    idGenerator,
    clock,
  })
  const listTodos = new ListTodos({ repository })
  const listCategories = new ListCategories({ repository: categories })
  const listRelationships = new ListRelationships({ repository: relationships })
  const getBoardStatus = new GetBoardStatus({ repository })
  const getBoardSnapshot = new GetBoardSnapshot({ repository, relationships })
  const deleteTodo = new DeleteTodo({ repository, relationships })
  const deleteRelationship = new DeleteRelationship({
    repository: relationships,
  })
  const updateRelationship = new UpdateRelationship({ repository: relationships })
  const updateTodo = new UpdateTodo({ repository, clock })
  const createRelationship = new CreateRelationship({
    relationships,
    todos: repository,
    idGenerator,
    clock,
  })

  return {
    createTodo,
    createCategory,
    listTodos,
    listCategories,
    getBoardStatus,
    getBoardSnapshot,
    listRelationships,
    deleteTodo,
    deleteRelationship,
    updateRelationship,
    updateTodo,
    createRelationship,
  }
}

const normalizeDbPath = (candidate: string): string => {
  return resolveDbPath(candidate)
}
