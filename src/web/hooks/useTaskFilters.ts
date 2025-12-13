import { useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type { TodoStatus } from '@core/domain/Todo'

import type { TaskBoardTask } from '../components'
import {
  applyTaskFilters,
  createFilterState,
  normalizeCategoryLabel,
  type TaskFilterState,
} from '../utils/taskFilters'

export type UseTaskFiltersResult = Readonly<{
  filters: TaskFilterState
  filteredTasks: readonly TaskBoardTask[]
  toggleStatus: (status: TodoStatus) => void
  toggleCategory: (label: string) => void
  resetCategories: () => void
  categories: readonly CategoryOption[]
}>

export type CategoryOption = Readonly<{
  label: string
  value: string
  color?: string
}>

export const useTaskFilters = (
  tasks: readonly TaskBoardTask[],
  initialStatuses: readonly TodoStatus[],
): UseTaskFiltersResult => {
  const [filters, setFilters] = useState(() =>
    createFilterState({ statuses: initialStatuses }),
  )

  const filteredTasks = useMemo(
    () => applyTaskFilters(tasks, filters),
    [tasks, filters],
  )

  const toggleStatus = buildStatusToggle(setFilters)
  const toggleCategory = buildCategoryToggle(setFilters)
  const resetCategories = buildCategoryReset(setFilters)

  const categories = useMemo<readonly CategoryOption[]>(
    () => deriveCategories(tasks),
    [tasks],
  )

  return {
    filters,
    filteredTasks,
    toggleStatus,
    toggleCategory,
    resetCategories,
    categories,
  }
}

type FilterStateUpdater = Dispatch<SetStateAction<TaskFilterState>>

const buildStatusToggle =
  (setFilters: FilterStateUpdater) =>
  (status: TodoStatus): void => {
    setFilters((current) => {
      const next = new Set(current.statuses)
      if (next.has(status)) {
        if (next.size === 1) {
          return current
        }
        next.delete(status)
      } else {
        next.add(status)
      }
      return {
        ...current,
        statuses: next,
      }
    })
  }

const buildCategoryToggle =
  (setFilters: FilterStateUpdater) =>
  (value: string): void => {
    const normalized = normalizeCategoryLabel(value)
    setFilters((current) => {
      const next = new Set(current.categories)
      if (next.has(normalized)) {
        next.delete(normalized)
      } else {
        next.add(normalized)
      }
      return {
        ...current,
        categories: next,
      }
    })
  }

const buildCategoryReset =
  (setFilters: FilterStateUpdater) => (): void => {
    setFilters((current) => {
      if (current.categories.size === 0) {
        return current
      }
      return {
        ...current,
        categories: new Set(),
      }
    })
  }

const deriveCategories = (
  tasks: readonly TaskBoardTask[],
): CategoryOption[] => {
  const seen = new Map<string, CategoryOption>()
  tasks.forEach((task) => {
    const label = task.category?.trim() || 'Uncategorized'
    const value = normalizeCategoryLabel(label)
    if (!seen.has(value)) {
      seen.set(value, {
        label,
        value,
        color: task.color,
      })
    }
  })
  return Array.from(seen.values())
}
