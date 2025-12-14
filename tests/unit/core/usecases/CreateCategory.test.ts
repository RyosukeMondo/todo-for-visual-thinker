import { describe, expect, it, vi } from 'vitest'

import { CreateCategory } from '@core/usecases/CreateCategory'
import { Category } from '@core/domain/Category'
import type { CategoryRepository } from '@core/ports'
import { ValidationError } from '@core/errors'

const buildRepository = (): CategoryRepository => ({
  save: vi.fn(),
  list: vi.fn(),
  delete: vi.fn(),
  findById: vi.fn(),
  findByName: vi.fn(),
})

const createSubject = () => {
  const repository = buildRepository()
  const clock = () => new Date('2024-04-05T10:00:00.000Z')
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const idGenerator = () => 'cat-123'
  const createCategory = new CreateCategory({
    repository,
    clock,
    idGenerator,
    logger,
  })

  return { repository, clock, logger, createCategory }
}

describe('CreateCategory use case', () => {
  it('persists categories with generated metadata and logs creation', async () => {
    const { repository, clock, logger, createCategory } = createSubject()

    const category = await createCategory.execute({
      name: 'Ideas',
      color: '#f97316',
      icon: 'sparkles',
      description: 'Creative exploration',
    })

    expect(repository.save).toHaveBeenCalledWith(category)
    expect(category.toJSON()).toMatchObject({
      id: 'cat-123',
      name: 'Ideas',
      color: '#f97316',
      icon: 'sparkles',
      description: 'Creative exploration',
      createdAt: clock(),
      updatedAt: clock(),
    })
    expect(logger.info).toHaveBeenCalledWith('category.created', {
      categoryId: 'cat-123',
      name: 'Ideas',
      color: '#f97316',
    })
  })

  it('fails fast when name exists in repository', async () => {
    const repository = buildRepository()
    const existing = Category.create({
      id: 'cat-001',
      name: 'Focus',
    })
    ;(repository.findByName as ReturnType<typeof vi.fn>).mockResolvedValue(existing)
    const createCategory = new CreateCategory({
      repository,
      idGenerator: () => 'cat-123',
    })

    await expect(
      createCategory.execute({ name: 'Focus' }),
    ).rejects.toThrowError(ValidationError)
  })
})
