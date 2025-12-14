import { useCallback, useEffect, useMemo, useState } from 'react'

import type { TodoStatus } from '@core/domain/Todo'

import type { TaskBoardRelationship, TaskBoardTask } from './components'
import { AddTodoForm, TaskBoard, TaskMetricsPanel } from './components'
import { TaskFilters } from './components/TaskFilters'
import { useTaskFilters } from './hooks/useTaskFilters'
import type { UseTaskFiltersResult } from './hooks/useTaskFilters'
import { useBoardData } from './hooks/useBoardData'

const INITIAL_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed']

function App() {
  const board = useBoardData()
  const tasks = useMemo(() => board.data?.tasks ?? [], [board.data])
  const relationships = useMemo(
    () => board.data?.relationships ?? [],
    [board.data],
  )
  const state = useTaskFilters(tasks, INITIAL_STATUSES, relationships)
  const [hoveredTaskId, setHoveredTaskId] = useState<string | undefined>()
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    () => tasks[0]?.id,
  )

  useEffect(() => {
    if (state.filteredTasks.length === 0) {
      setSelectedTaskId(undefined)
      return
    }
    if (!selectedTaskId || !state.filteredTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(state.filteredTasks[0]?.id)
    }
  }, [selectedTaskId, state.filteredTasks])

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
  }, [])

  if (board.isLoading) {
    return <BoardLoadingState />
  }

  if (board.error) {
    return <BoardErrorState message={board.error} onRetry={board.reload} />
  }

  return (
    <LandingPage
      state={state}
      hoveredTaskId={hoveredTaskId}
      selectedTaskId={selectedTaskId}
      relationships={state.filteredRelationships}
      onSelectTask={handleSelectTask}
      onHoverTask={setHoveredTaskId}
    />
  )
}

export default App

type LandingPageProps = Readonly<{
  state: UseTaskFiltersResult
  hoveredTaskId?: string
  selectedTaskId?: string
  relationships?: readonly TaskBoardRelationship[]
  onHoverTask: (taskId: string | undefined) => void
  onSelectTask: (taskId: string) => void
}>

const LandingPage = ({
  state,
  hoveredTaskId,
  selectedTaskId,
  relationships,
  onSelectTask,
  onHoverTask,
}: LandingPageProps): JSX.Element => (
  <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
    <div className="container mx-auto px-4 py-10">
      <LandingHero />
      <main className="mx-auto max-w-6xl space-y-8">
        <TaskFilters
          statuses={INITIAL_STATUSES}
          categories={state.categories}
          value={state.filters}
          onStatusToggle={state.toggleStatus}
          onCategoryToggle={state.toggleCategory}
          onClearCategories={state.resetCategories}
        />
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr,0.8fr]">
          <TaskBoardSection
            tasks={state.filteredTasks}
            relationships={relationships}
            hoveredTaskId={hoveredTaskId}
            onHoverTask={onHoverTask}
            onSelectTask={onSelectTask}
            selectedTaskId={selectedTaskId}
          />
          <SidebarSection tasks={state.filteredTasks} />
        </div>
      </main>
    </div>
  </div>
)

const LandingHero = (): JSX.Element => (
  <header className="mb-12 text-center">
    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary-500">
      Visual-first productivity
    </p>
    <h1 className="mt-3 text-4xl font-bold text-gray-900">Todo for Visual Thinker</h1>
    <p className="mt-4 text-lg text-gray-600">
      Neuroscience-backed task management for spatial minds, built in the open.
    </p>
  </header>
)

type TaskBoardSectionProps = Readonly<{
  tasks: readonly TaskBoardTask[]
  relationships?: readonly TaskBoardRelationship[]
  hoveredTaskId?: string
  selectedTaskId?: string
  onSelectTask: (taskId: string) => void
  onHoverTask: (taskId: string | undefined) => void
}>

const TaskBoardSection = ({
  tasks,
  relationships,
  hoveredTaskId,
  selectedTaskId,
  onSelectTask,
  onHoverTask,
}: TaskBoardSectionProps): JSX.Element => (
  <section className="rounded-[3rem] bg-white/90 p-6 shadow-2xl shadow-primary-500/10">
    {tasks.length === 0 ? (
      <p className="text-center text-sm text-gray-500">
        No visual tasks yet. Use the CLI to add todos into the SQLite board.
      </p>
    ) : (
      <TaskBoard
        tasks={tasks}
        relationships={relationships}
        selectedId={selectedTaskId}
        hoverId={hoveredTaskId}
        onHover={onHoverTask}
        onSelect={onSelectTask}
      />
    )}
  </section>
)

type SidebarSectionProps = Readonly<{
  tasks: readonly TaskBoardTask[]
}>

const SidebarSection = ({ tasks }: SidebarSectionProps): JSX.Element => (
  <div className="space-y-6 xl:sticky xl:top-12">
    <AddTodoForm onSubmit={(values) => console.info('Add todo', values)} className="h-fit" />
    <TaskMetricsPanel tasks={tasks} />
  </div>
)

const BoardLoadingState = (): JSX.Element => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
    <div className="space-y-3 text-center text-gray-600">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary-500">
        Syncing board
      </p>
      <p className="text-2xl font-semibold text-gray-900">Loading your visual tasks…</p>
      <p>Please ensure you've seeded the database via the CLI.</p>
    </div>
  </div>
)

const BoardErrorState = ({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}): JSX.Element => (
  <div className="flex min-h-screen items-center justify-center bg-red-50">
    <div className="space-y-4 rounded-3xl bg-white p-8 text-center shadow-xl shadow-red-100">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
        Board unavailable
      </p>
      <p className="text-lg font-semibold text-gray-900">Unable to load visual tasks</p>
      <p className="text-sm text-gray-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-600"
      >
        Try again
      </button>
    </div>
  </div>
)
