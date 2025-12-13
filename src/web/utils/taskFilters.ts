import type { TodoStatus } from '@core/domain/Todo'

import type { TaskBoardTask } from '../components'

export type TaskFilterState = Readonly<{
  statuses: ReadonlySet<TodoStatus>
  categories: ReadonlySet<string>
}>

export type CreateFilterStateOptions = Readonly<{
  statuses: Iterable<TodoStatus>
  categories?: Iterable<string>
}>

export const createFilterState = (
  options: CreateFilterStateOptions,
): TaskFilterState => ({
  statuses: new Set(options.statuses),
  categories: new Set(options.categories ?? []),
})

export const normalizeCategoryLabel = (value?: string): string =>
  value?.trim().toLowerCase() || 'uncategorized'

export const applyTaskFilters = (
  tasks: readonly TaskBoardTask[],
  filters: TaskFilterState,
): TaskBoardTask[] =>
  tasks.filter((task) => {
    if (!filters.statuses.has(task.status)) return false
    if (filters.categories.size === 0) return true
    return filters.categories.has(normalizeCategoryLabel(task.category))
  })
