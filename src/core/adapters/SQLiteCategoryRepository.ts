import type { Database } from 'better-sqlite3'

import { Category } from '@core/domain/Category'
import type {
  CategoryRepository,
  ListCategoriesQuery,
} from '@core/ports/CategoryRepository'

type CategoryRow = Readonly<{
  id: string
  name: string
  color: string
  icon: string | null
  description: string | null
  created_at: number
  updated_at: number
}>

export type SQLiteCategoryRepositoryOptions = Readonly<{
  tableName?: string
}>

type QueryBuildResult = Readonly<{
  sql: string
  params: Record<string, unknown>
}>

export class SQLiteCategoryRepository implements CategoryRepository {
  private readonly tableName: string

  constructor(
    private readonly db: Database,
    options: SQLiteCategoryRepositoryOptions = {},
  ) {
    this.tableName = options.tableName ?? 'categories'
    this.ensureSchema()
  }

  async save(category: Category): Promise<void> {
    const row = this.toRow(category)
    const columns = [
      'id',
      'name',
      'color',
      'icon',
      'description',
      'created_at',
      'updated_at',
    ]
    const columnList = columns.join(', ')
    const placeholders = columns.map((column) => `@${column}`).join(', ')
    const assignments = columns
      .filter((column) => column !== 'id')
      .map((column) => `${column} = excluded.${column}`)
      .join(', ')

    this.db
      .prepare(
        `INSERT INTO ${this.tableName} (${columnList}) VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${assignments}`,
      )
      .run(row)
  }

  async findById(id: string): Promise<Category | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE id = @id LIMIT 1`)
      .get({ id }) as CategoryRow | undefined
    return row ? this.fromRow(row) : null
  }

  async findByName(name: string): Promise<Category | null> {
    const row = this.db
      .prepare(
        `SELECT * FROM ${this.tableName} WHERE LOWER(name) = LOWER(@name) LIMIT 1`,
      )
      .get({ name }) as CategoryRow | undefined
    return row ? this.fromRow(row) : null
  }

  async list(query: ListCategoriesQuery = {}): Promise<Category[]> {
    const { sql, params } = this.buildListQuery(query)
    const rows = this.db.prepare(sql).all(params) as CategoryRow[]
    return rows.map((row) => this.fromRow(row))
  }

  async delete(id: string): Promise<void> {
    this.db
      .prepare(`DELETE FROM ${this.tableName} WHERE id = @id`)
      .run({ id })
  }

  private buildListQuery(query: ListCategoriesQuery): QueryBuildResult {
    const clauses: string[] = []
    const params: Record<string, unknown> = {
      limit: query.limit ?? 100,
      offset: query.offset ?? 0,
    }

    if (query.search) {
      params.search = `%${query.search.toLowerCase()}%`
      clauses.push(`(
        LOWER(name) LIKE @search OR
        LOWER(IFNULL(description, '')) LIKE @search
      )`)
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const sql = `SELECT * FROM ${this.tableName} ${where} ORDER BY name ASC LIMIT @limit OFFSET @offset`
    return { sql, params }
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        icon TEXT,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_name ON ${this.tableName}(name);
    `)
  }

  private toRow(category: Category): CategoryRow {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon ?? null,
      description: category.description ?? null,
      created_at: category.createdAt.getTime(),
      updated_at: category.updatedAt.getTime(),
    }
  }

  private fromRow(row: CategoryRow): Category {
    return Category.restore({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon ?? undefined,
      description: row.description ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    })
  }
}
