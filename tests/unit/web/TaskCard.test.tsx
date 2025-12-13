import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { TaskCard } from '@/web/components'

describe('TaskCard', () => {
  const baseProps = {
    title: 'Design focus mode',
    description: 'Prototype the attention-preserving view for ADHD brains.',
    status: 'in_progress' as const,
    priority: 4 as const,
    category: 'Experience',
    color: '#f97316',
    icon: '🧠',
    position: { x: 120.3, y: -40.7 },
  }

  it('renders semantic information for visual scanning', () => {
    render(<TaskCard {...baseProps} />)

    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Design focus mode'),
    )
    expect(screen.getByText('Experience')).toBeVisible()
    expect(screen.getByText('Priority •')).toBeVisible()
  })

  it('shows coordinate metadata rounded to whole numbers', () => {
    render(<TaskCard {...baseProps} />)

    expect(screen.getByLabelText(/Position/)).toHaveTextContent('⇢ 120, -41')
  })

  it('infers size based on priority when not provided', () => {
    const { rerender } = render(<TaskCard {...baseProps} priority={5} />)

    expect(screen.getByRole('article')).toHaveAttribute('data-size', 'large')

    rerender(<TaskCard {...baseProps} priority={2} />)
    expect(screen.getByRole('article')).toHaveAttribute('data-size', 'small')
  })

  it('applies selected styling when isSelected is true', () => {
    render(<TaskCard {...baseProps} isSelected />)

    expect(screen.getByRole('article')).toHaveClass('ring-2')
  })
})
