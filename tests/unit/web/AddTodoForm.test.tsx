import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { AddTodoForm } from '@/web/components'

const submit = async () => {
  const handler = vi.fn()
  render(<AddTodoForm onSubmit={handler} />)
  await screen.findByLabelText(/title/i)
  fireEvent.change(screen.getByLabelText(/title/i), {
    target: { value: 'Design calm mode' },
  })
  fireEvent.change(screen.getByLabelText(/category/i), {
    target: { value: 'Experience' },
  })
  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Build the dopamine-friendly state' },
  })
  fireEvent.click(screen.getByRole('button', { name: /in progress/i }))
  fireEvent.click(screen.getByLabelText(/select #f97316/i))
  fireEvent.click(screen.getByLabelText(/use icon 🧠/i))
  fireEvent.input(screen.getByLabelText(/custom icon/i), {
    target: { value: '✨' },
  })
  const prioritySlider = screen.getByRole('slider', { name: /priority/i })
  fireEvent.change(prioritySlider, {
    target: { value: 4 },
  })
  fireEvent.submit(screen.getByRole('form', { name: /add new visual task/i }))
  return handler
}

describe('AddTodoForm', () => {
  it('emits normalized values when submitted', async () => {
    const handler = await submit()
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Design calm mode',
        category: 'Experience',
        description: 'Build the dopamine-friendly state',
        status: 'in_progress',
        color: '#f97316',
        icon: '✨',
      }),
    )
  })

  it('clears non-persistent fields on submit and allows clearing', async () => {
    const handler = vi.fn()
    render(<AddTodoForm onSubmit={handler} />)

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test entry' },
    })
    fireEvent.submit(screen.getByRole('form', { name: /add new visual task/i }))
    expect(screen.getByLabelText(/title/i)).toHaveValue('')

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Second entry' },
    })
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(screen.getByLabelText(/title/i)).toHaveValue('')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('disables submit when title is empty or submitting', () => {
    const { rerender } = render(<AddTodoForm isSubmitting />)
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    rerender(<AddTodoForm />)
    expect(screen.getByRole('button', { name: /add task/i })).toBeDisabled()
  })

  it('renders error messages when provided', () => {
    render(<AddTodoForm errorMessage="Title is required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required')
  })
})
