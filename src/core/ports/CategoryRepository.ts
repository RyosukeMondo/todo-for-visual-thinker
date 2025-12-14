import type { Category } from '@core/domain/Category'

export type ListCategoriesQuery = Readonly<{
  search?: string
  limit?: number
  offset?: number
}>

export interface CategoryRepository {
  save(category: Category): Promise<void>
  findById(id: string): Promise<Category | null>
  findByName(name: string): Promise<Category | null>
  list(query?: ListCategoriesQuery): Promise<Category[]>
  delete(id: string): Promise<void>
}
