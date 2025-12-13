import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { TodoStatus } from '@core/domain/Todo'
import { TaskFilters } from '@/web/components/TaskFilters'
import { createFilterState } from '@/web/utils/taskFilters'
import type { CategoryFilterOption } from '@/web/components/TaskFilters'

const STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed']
const CATEGORIES: CategoryFilterOption[] = [
  { label: 'Design', value: 'design', color: '#3b82f6' },
  { label: 'Research', value: 'research', color: '#a855f7' },
]

describe('TaskFilters component', () => {
  it('triggers callbacks for status toggles', () => {
    const onStatusToggle = vi.fn()
    const filters = createFilterState({ statuses: STATUSES })

    const { getByRole } = render(
      <TaskFilters
        statuses={STATUSES}
        categories={CATEGORIES}
        value={filters}
        onStatusToggle={onStatusToggle}
        onCategoryToggle={vi.fn()}
        onClearCategories={vi.fn()}
      />,
    )

    fireEvent.click(getByRole('button', { name: /pending/i }))
    expect(onStatusToggle).toHaveBeenCalledWith('pending')
  })

  it('issues category toggle and clear actions', () => {
    const onCategoryToggle = vi.fn()
    const onClear = vi.fn()
    const filters = createFilterState({
      statuses: STATUSES,
      categories: ['design'],
    })

    const { getByRole } = render(
      <TaskFilters
        statuses={STATUSES}
        categories={CATEGORIES}
        value={filters}
        onStatusToggle={vi.fn()}
        onCategoryToggle={onCategoryToggle}
        onClearCategories={onClear}
      />,
    )

    fireEvent.click(getByRole('button', { name: /design/i }))
    expect(onCategoryToggle).toHaveBeenCalledWith('design')

    fireEvent.click(getByRole('button', { name: /show all/i }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
