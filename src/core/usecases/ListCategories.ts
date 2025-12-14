import type { CategoryRepository, ListCategoriesQuery } from '@core/ports'
import type { Category } from '@core/domain/Category'

export type ListCategoriesDependencies = Readonly<{
  repository: CategoryRepository
}>

export class ListCategories {
  constructor(private readonly deps: ListCategoriesDependencies) {}

  async execute(query: ListCategoriesQuery = {}): Promise<Category[]> {
    return this.deps.repository.list(query)
  }
}

