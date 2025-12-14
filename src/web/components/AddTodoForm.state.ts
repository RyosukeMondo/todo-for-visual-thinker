import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import type { TodoPriority } from '@core/domain/Todo'

import type { AddTodoFormValues } from './AddTodoForm'

export type Palette = readonly [string, ...string[]]

export const MIN_PRIORITY: TodoPriority = 1
export const MAX_PRIORITY: TodoPriority = 5

export const DEFAULT_COLOR_OPTIONS: Palette = [
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
] as const

export type FormState = Readonly<{
  title: string
  description: string
  status: AddTodoFormValues['status']
  priority: TodoPriority
  category: string
  color: string
  icon: string
}>

export type UseAddTodoFormOptions = Readonly<{
  onSubmit?: (values: AddTodoFormValues) => Promise<void> | void
  colorOptions: readonly string[]
  defaultValues?: Partial<AddTodoFormValues>
  isSubmitting: boolean
}>

export type AddTodoFormController = Readonly<{
  values: FormState
  palette: Palette
  canSubmit: boolean
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void
  handleClear: () => void
  setTitle: (value: string) => void
  setCategory: (value: string) => void
  setDescription: (value: string) => void
  setStatus: (value: AddTodoFormValues['status']) => void
  setPriority: (value: TodoPriority) => void
  setColor: (value: string) => void
  setIcon: (value: string) => void
}>

const EMPTY_FIELD = ''
const COLOR_PATTERN = /^#([0-9a-f]{6})$/i

export const useAddTodoForm = ({
  onSubmit,
  colorOptions,
  defaultValues,
  isSubmitting,
}: UseAddTodoFormOptions): AddTodoFormController => {
  const palette = useMemo<Palette>(() => buildPalette(colorOptions), [colorOptions])
  const initialState = useMemo(
    () => buildInitialState(defaultValues, palette),
    [defaultValues, palette],
  )
  const [values, setValues] = useState<FormState>(initialState)
  const canSubmit = values.title.trim().length > 0 && !isSubmitting
  const resetForm = useCallback(() => {
    setValues((current) => resetState(current, palette, defaultValues))
  }, [palette, defaultValues])
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      handleFormSubmit(event, {
        canSubmit,
        values,
        palette,
        onSubmit,
        resetForm,
      })
    },
    [canSubmit, values, palette, onSubmit, resetForm],
  )
  const handleClear = resetForm

  const setter =
    <K extends keyof FormState>(field: K) =>
    (value: FormState[K]): void => {
      setValues((state) => ({ ...state, [field]: value }))
    }

  return {
    values,
    palette,
    canSubmit,
    handleSubmit,
    handleClear,
    setTitle: setter('title'),
    setCategory: setter('category'),
    setDescription: setter('description'),
    setStatus: setter('status'),
    setPriority: setter('priority'),
    setColor: setter('color'),
    setIcon: setter('icon'),
  }
}

export const clampPriority = (value: number): TodoPriority => {
  const clamped = Math.min(Math.max(value, MIN_PRIORITY), MAX_PRIORITY)
  return clamped as TodoPriority
}

const buildPalette = (colors: readonly string[]): Palette => {
  const sanitized = colors
    .map((color) => color?.trim().toLowerCase())
    .filter((candidate): candidate is string => Boolean(candidate) && COLOR_PATTERN.test(candidate))
  if (sanitized.length === 0) {
    return DEFAULT_COLOR_OPTIONS
  }
  const [first, ...rest] = sanitized
  return [first, ...rest] as Palette
}

const buildInitialState = (
  defaults: Partial<AddTodoFormValues> | undefined,
  palette: Palette,
): FormState => ({
  title: defaults?.title ?? EMPTY_FIELD,
  description: defaults?.description ?? EMPTY_FIELD,
  status: defaults?.status ?? 'pending',
  priority: defaults?.priority ?? 3,
  category: defaults?.category ?? EMPTY_FIELD,
  color: sanitizeHexColor(defaults?.color, palette),
  icon: defaults?.icon ?? EMPTY_FIELD,
})

const resetState = (
  current: FormState,
  palette: Palette,
  defaults?: Partial<AddTodoFormValues>,
): FormState => ({
  ...buildInitialState(defaults, palette),
  status: current.status,
  color: current.color,
})

const normalizeValues = (state: FormState, palette: Palette): AddTodoFormValues => {
  const title = state.title.trim()
  const description = state.description.trim() || undefined
  const category = state.category.trim() || undefined
  const icon = state.icon.trim() || undefined
  const color = sanitizeHexColor(state.color, palette)
  const priority = clampPriority(state.priority)
  return {
    title,
    description,
    category,
    icon,
    color,
    status: state.status,
    priority,
  }
}

const sanitizeHexColor = (value: string | undefined, palette: Palette): string => {
  const normalized = value?.trim().toLowerCase()
  if (normalized && COLOR_PATTERN.test(normalized)) {
    return normalized
  }
  return palette[0]
}

type SubmitContext = Readonly<{
  canSubmit: boolean
  values: FormState
  palette: Palette
  onSubmit?: (values: AddTodoFormValues) => Promise<void> | void
  resetForm: () => void
}>

const handleFormSubmit = (
  event: FormEvent<HTMLFormElement>,
  context: SubmitContext,
): void => {
  event.preventDefault()
  if (!context.canSubmit) {
    return
  }
  const normalized = normalizeValues(context.values, context.palette)
  try {
    const result = context.onSubmit?.(normalized)
    if (isPromise(result)) {
      void result
        .then(() => {
          context.resetForm()
        })
        .catch(() => {
          // Preserve values so the user can adjust and retry
        })
      return
    }
    context.resetForm()
  } catch {
    // Keep values so the user can adjust inputs after failures
  }
}

const isPromise = (value: unknown): value is Promise<void> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Promise<void>).then === 'function'
  )
}
