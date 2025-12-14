import { describe, expect, it, vi } from 'vitest'

import { ListCategories } from '@core/usecases/ListCategories'
import type { CategoryRepository } from '@core/ports'
import { Category } from '@core/domain/Category'

const buildRepository = () =>
  ({
    list: vi.fn(),
  }) as unknown as Pick<CategoryRepository, 'list'>

describe('ListCategories use case', () => {
  it('delegates to repository and returns categories', async () => {
    const repository = buildRepository()
    const categories = [
      Category.create({ id: 'cat-1', name: 'Strategy' }),
      Category.create({ id: 'cat-2', name: 'Design' }),
    ]
    ;(repository.list as ReturnType<typeof vi.fn>).mockResolvedValue(categories)
    const listCategories = new ListCategories({ repository })

    const result = await listCategories.execute({ search: 'str' })

    expect(repository.list).toHaveBeenCalledWith({ search: 'str' })
    expect(result).toEqual(categories)
  })

  it('falls back to default query when none provided', async () => {
    const repository = buildRepository()
    const listCategories = new ListCategories({ repository })
    await listCategories.execute()
    expect(repository.list).toHaveBeenCalledWith({})
  })
})
