import type { ReactNode } from 'react'

import type { TodoPriority, TodoStatus } from '@core/domain/Todo'

import {
  DEFAULT_COLOR_OPTIONS,
  MAX_PRIORITY,
  MIN_PRIORITY,
  clampPriority,
  useAddTodoForm,
  type AddTodoFormController,
  type FormState,
} from './AddTodoForm.state'

const STATUS_COPY: Record<TodoStatus, { label: string; description: string; accent: string }> = {
  pending: {
    label: 'Pending',
    description: 'Idea incubating',
    accent: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  in_progress: {
    label: 'In Progress',
    description: 'Energy in motion',
    accent: 'border-sky-200 bg-sky-50 text-sky-900',
  },
  completed: {
    label: 'Completed',
    description: 'Momentum locked',
    accent: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
}

const DEFAULT_STATUSES: readonly TodoStatus[] = ['pending', 'in_progress', 'completed']

const ICON_SUGGESTIONS = ['🧠', '🎨', '🚀', '🧭', '💡', '✨'] as const

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  1: 'Gentle focus',
  2: 'Emerging',
  3: 'Important',
  4: 'High impact',
  5: 'Critical',
}

export type AddTodoFormValues = Readonly<{
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
  category?: string
  color: string
  icon?: string
}>

export type AddTodoFormProps = Readonly<{
  onSubmit?: (values: AddTodoFormValues) => Promise<void> | void
  statusOptions?: readonly TodoStatus[]
  colorOptions?: readonly string[]
  iconSuggestions?: readonly string[]
  defaultValues?: Partial<AddTodoFormValues>
  isSubmitting?: boolean
  errorMessage?: string
  className?: string
}>

export const AddTodoForm = ({
  onSubmit,
  statusOptions = DEFAULT_STATUSES,
  colorOptions = DEFAULT_COLOR_OPTIONS,
  iconSuggestions = ICON_SUGGESTIONS,
  defaultValues,
  isSubmitting = false,
  errorMessage,
  className,
}: AddTodoFormProps): JSX.Element => {
  const controller = useAddTodoForm({
    onSubmit,
    colorOptions,
    defaultValues,
    isSubmitting,
  })

  return (
    <AddTodoFormView
      className={className}
      statusOptions={statusOptions}
      iconSuggestions={iconSuggestions}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      {...controller}
    />
  )
}

type AddTodoFormViewProps = Readonly<
  AddTodoFormController & {
    className?: string
    statusOptions: readonly TodoStatus[]
    iconSuggestions: readonly string[]
    isSubmitting: boolean
    errorMessage?: string
  }>

const AddTodoFormView = ({
  values,
  palette,
  setTitle,
  setCategory,
  setDescription,
  setStatus,
  setPriority,
  setColor,
  setIcon,
  canSubmit,
  handleSubmit,
  handleClear,
  className,
  statusOptions,
  iconSuggestions,
  isSubmitting,
  errorMessage,
}: AddTodoFormViewProps): JSX.Element => (
  <form
    className={buildFormClasses(className)}
    onSubmit={handleSubmit}
    aria-label="Add new visual task"
  >
    <AddTodoFormHeader />
    <AddTodoFormFields
      values={values}
      setTitle={setTitle}
      setCategory={setCategory}
      setDescription={setDescription}
    />
    <StatusSelector statuses={statusOptions} current={values.status} onChange={setStatus} />
    <div className="grid gap-6 lg:grid-cols-2">
      <PriorityControl value={values.priority} onChange={setPriority} />
      <ColorPalette colors={palette} value={values.color} onSelect={setColor} />
    </div>
    <IconSelector value={values.icon} suggestions={iconSuggestions} onChange={setIcon} />
    {errorMessage && <FormErrorMessage message={errorMessage} />}
    <AddTodoFormActions
      canSubmit={canSubmit}
      isSubmitting={isSubmitting}
      onClear={handleClear}
    />
  </form>
)

const AddTodoFormHeader = (): JSX.Element => (
  <header>
    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-500">
      Create task
    </p>
    <h2 className="text-2xl font-bold text-gray-900">Anchor a thought on the canvas</h2>
    <p className="text-sm text-gray-500">
      Titles spark intent, colors encode attention, and icons make recall effortless.
    </p>
  </header>
)

type AddTodoFormFieldsProps = Readonly<{
  values: FormState
  setTitle: (value: string) => void
  setCategory: (value: string) => void
  setDescription: (value: string) => void
}>

const AddTodoFormFields = ({
  values,
  setTitle,
  setCategory,
  setDescription,
}: AddTodoFormFieldsProps): JSX.Element => (
  <div className="grid gap-4 md:grid-cols-2">
    <Field label="Title" htmlFor="todo-title">
      <input
        id="todo-title"
        type="text"
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-900 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        placeholder="Design dopamine-safe mode"
        value={values.title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
    </Field>
    <Field label="Category" htmlFor="todo-category">
      <input
        id="todo-category"
        type="text"
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        placeholder="Research, Experience, Concept..."
        value={values.category}
        onChange={(event) => setCategory(event.target.value)}
      />
    </Field>
    <Field label="Description" htmlFor="todo-description" className="md:col-span-2">
      <textarea
        id="todo-description"
        rows={3}
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        placeholder="Describe what success looks like and the spatial cues you need."
        value={values.description}
        onChange={(event) => setDescription(event.target.value)}
      />
    </Field>
  </div>
)

const AddTodoFormActions = ({
  canSubmit,
  isSubmitting,
  onClear,
}: {
  canSubmit: boolean
  isSubmitting: boolean
  onClear: () => void
}): JSX.Element => (
  <div className="flex flex-wrap gap-3">
    <button
      type="submit"
      className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:bg-gray-300"
      disabled={!canSubmit}
    >
      {isSubmitting ? 'Saving…' : 'Add task'}
    </button>
    <button
      type="button"
      className="text-sm font-semibold text-gray-500 underline-offset-4 transition hover:text-gray-700"
      onClick={onClear}
    >
      Clear
    </button>
  </div>
)

const FormErrorMessage = ({ message }: { message: string }): JSX.Element => (
  <p
    role="alert"
    className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 shadow-inner"
  >
    {message}
  </p>
)

const buildFormClasses = (className?: string): string =>
  [
    'add-todo-form space-y-6 rounded-[2rem] border border-white/40 bg-white/90 p-6 shadow-2xl shadow-primary-500/10 backdrop-blur',
    className,
  ]
    .filter(Boolean)
    .join(' ')

const Field = ({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  htmlFor: string
  className?: string
  children: ReactNode
}): JSX.Element => (
  <label
    className={['block space-y-2 text-sm font-semibold text-gray-600', className]
      .filter(Boolean)
      .join(' ')}
    htmlFor={htmlFor}
  >
    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">{label}</span>
    {children}
  </label>
)

type StatusSelectorProps = Readonly<{
  statuses: readonly TodoStatus[]
  current: TodoStatus
  onChange: (status: TodoStatus) => void
}>

const StatusSelector = ({ statuses, current, onChange }: StatusSelectorProps): JSX.Element => (
  <section aria-label="Status selection" className="space-y-3">
    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Status</span>
    <div className="grid gap-3 md:grid-cols-3">
      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          className={buildStatusClasses(status === current, status)}
          onClick={() => onChange(status)}
          aria-pressed={status === current}
        >
          <span className="text-sm font-semibold text-gray-900">{STATUS_COPY[status].label}</span>
          <span className="text-xs text-gray-500">{STATUS_COPY[status].description}</span>
        </button>
      ))}
    </div>
  </section>
)

type PriorityControlProps = Readonly<{
  value: TodoPriority
  onChange: (priority: TodoPriority) => void
}>

const PriorityControl = ({ value, onChange }: PriorityControlProps): JSX.Element => (
  <section aria-label="Priority" className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
        Priority
      </span>
      <span className="text-sm font-semibold text-gray-700">{PRIORITY_LABELS[value]}</span>
    </div>
    <input
      type="range"
      min={MIN_PRIORITY}
      max={MAX_PRIORITY}
      value={value}
      onChange={(event) => onChange(clampPriority(Number(event.target.value)))}
      className="w-full accent-primary-500"
      aria-label="Priority"
    />
  </section>
)

type ColorPaletteProps = Readonly<{
  colors: readonly string[]
  value: string
  onSelect: (color: string) => void
}>

const ColorPalette = ({ colors, value, onSelect }: ColorPaletteProps): JSX.Element => (
  <section aria-label="Color" className="space-y-3">
    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
      Color focus
    </span>
    <div className="flex flex-wrap gap-3">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-pressed={value === color}
          aria-label={`Select ${color}`}
          className={`h-10 w-10 rounded-2xl border-2 ${value === color ? 'border-gray-900' : 'border-transparent'} shadow`}
          style={{ backgroundColor: color }}
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  </section>
)

type IconSelectorProps = Readonly<{
  value?: string
  suggestions: readonly string[]
  onChange: (icon: string) => void
}>

const IconSelector = ({ value, suggestions, onChange }: IconSelectorProps): JSX.Element => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
        Icon cue
      </span>
      <span className="text-xs text-gray-500">Optional visual hook</span>
    </div>
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-lg transition ${value === suggestion ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'}`}
          onClick={() => onChange(suggestion)}
          aria-pressed={value === suggestion}
          aria-label={`Use icon ${suggestion}`}
        >
          {suggestion}
        </button>
      ))}
      <input
        type="text"
        value={value ?? ''}
        maxLength={2}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-2xl border border-dashed border-gray-300 bg-white px-4 text-center text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        aria-label="Custom icon"
        placeholder="∞"
      />
    </div>
  </section>
)

const buildStatusClasses = (isActive: boolean, status: TodoStatus): string => {
  const base =
    'flex flex-col rounded-2xl border bg-white/80 px-4 py-3 text-left shadow transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400'
  const accent = isActive ? 'ring-2 ring-secondary-400 ring-offset-2' : 'ring-1 ring-transparent'
  return `${base} ${accent} ${STATUS_COPY[status].accent}`
}
