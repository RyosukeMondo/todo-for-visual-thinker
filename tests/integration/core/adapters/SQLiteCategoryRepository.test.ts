import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { SQLiteCategoryRepository } from '@/core/adapters/SQLiteCategoryRepository'
import { Category, type CreateCategoryInput } from '@/core/domain/Category'

const createRepo = () => {
  const db = new Database(':memory:')
  const repository = new SQLiteCategoryRepository(db)
  return { db, repository }
}

describe('SQLiteCategoryRepository - persistence', () => {
  let db: Database
  let repository: SQLiteCategoryRepository

  beforeEach(() => ({ db, repository } = createRepo()))

  afterEach(() => {
    db.close()
  })

  it('saves categories and retrieves them by id and name', async () => {
    const category = buildCategory({ name: 'Strategy' })
    await repository.save(category)

    const byId = await repository.findById(category.id)
    const byName = await repository.findByName('strategy')

    expect(byId?.toJSON()).toMatchObject({
      id: category.id,
      name: 'Strategy',
    })
    expect(byName?.id).toBe(category.id)
  })
})

describe('SQLiteCategoryRepository - listing and deletion', () => {
  let db: Database
  let repository: SQLiteCategoryRepository

  beforeEach(() => ({ db, repository } = createRepo()))

  afterEach(() => {
    db.close()
  })

  it('filters by search term and paginates results', async () => {
    await repository.save(buildCategory({ name: 'Design' }))
    const highlight = buildCategory({ name: 'Highlight', description: 'Warm palette' })
    await repository.save(highlight)
    await repository.save(buildCategory({ name: 'Personal', description: 'Home projects' }))

    const results = await repository.list({
      search: 'light',
      limit: 1,
      offset: 0,
    })

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(highlight.id)

    await repository.delete(highlight.id)
    const afterDelete = await repository.list()
    expect(afterDelete.some((category) => category.id === highlight.id)).toBe(
      false,
    )
  })
})

let counter = 0
const buildCategory = (
  overrides: Partial<CreateCategoryInput> = {},
): Category => {
  counter += 1
  const createdAt =
    overrides.createdAt ??
    new Date(`2024-03-${String(counter).padStart(2, '0')}T00:00:00.000Z`)

  return Category.create({
    id: overrides.id ?? `category-${counter}`,
    name: overrides.name ?? `Category ${counter}`,
    color: overrides.color,
    icon: overrides.icon,
    description: overrides.description,
    createdAt,
  })
}
