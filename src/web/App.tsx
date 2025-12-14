import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

import type { TodoStatus } from '@core/domain/Todo'

import type { TaskBoardRelationship, TaskBoardTask } from './components'
import {
  AddTodoForm,
  DependencyHealthPanel,
  TaskBoard,
  TaskHierarchyPanel,
  TaskMetricsPanel,
} from './components'
import { TaskFilters } from './components/TaskFilters'
import { useTaskFilters } from './hooks/useTaskFilters'
import type { UseTaskFiltersResult } from './hooks/useTaskFilters'
import { useBoardData, type BoardData } from './hooks/useBoardData'
import { useCreateTodo } from './hooks/useCreateTodo'
import { useUpdateTodoPosition } from './hooks/useUpdateTodoPosition'
import { useBoardStatus } from './hooks/useBoardStatus'
import type { AddTodoFormValues } from './components/AddTodoForm'
import type { TaskBoardViewport } from './components/TaskBoardMinimap'
import type { BoardStatusDTO } from '@shared/types/board'

const INITIAL_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed']

function App() {
  const board = useBoardState()
  const status = useBoardStatus()
  const reloadBoardState = useCallback(async () => {
    await Promise.all([board.reload(), status.reload()])
  }, [board.reload, status.reload])
  const filters = useTaskFilters(board.tasks, INITIAL_STATUSES, board.relationships)
  const selection = useTaskSelection(filters.filteredTasks)
  const creation = useCreationWorkflow(reloadBoardState)
  const movement = useMovementWorkflow(board.setBoard, reloadBoardState)

  if (board.isLoading) {
    return <BoardLoadingState />
  }

  if (board.error) {
    return <BoardErrorState message={board.error} onRetry={board.reload} />
  }

  return (
    <LandingPage
      state={filters}
      hoveredTaskId={selection.hoveredTaskId}
      selectedTaskId={selection.selectedTaskId}
      relationships={filters.filteredRelationships}
      initialViewport={board.viewport}
      onSelectTask={selection.selectTask}
      onHoverTask={selection.setHoveredTaskId}
      onCreateTodo={creation.createTodo}
      isCreatingTodo={creation.isCreating}
      creationError={creation.error}
      onMoveTask={movement.moveTask}
      isMovePending={movement.isMovePending}
      moveError={movement.error}
      boardStatus={status.data}
      isStatusLoading={status.isLoading}
      statusError={status.error}
    />
  )
}

type BoardState = {
  tasks: readonly TaskBoardTask[]
  relationships: readonly TaskBoardRelationship[]
  viewport?: TaskBoardViewport
  isLoading: boolean
  error?: string
  reload: () => Promise<void>
  setBoard: Dispatch<SetStateAction<BoardData | undefined>>
}

const useBoardState = (): BoardState => {
  const { data, isLoading, error, reload } = useBoardData()
  const [board, setBoard] = useState<BoardData | undefined>(data)
  useEffect(() => {
    setBoard(data)
  }, [data])
  return {
    tasks: board?.tasks ?? [],
    relationships: board?.relationships ?? [],
    viewport: board?.viewport,
    isLoading,
    error,
    reload,
    setBoard,
  }
}

const useTaskSelection = (tasks: readonly TaskBoardTask[]) => {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | undefined>()
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    () => tasks[0]?.id,
  )
  useEffect(() => {
    const firstId = tasks[0]?.id
    if (!firstId) {
      setSelectedTaskId(undefined)
      return
    }
    if (!selectedTaskId || !tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(firstId)
    }
  }, [tasks, selectedTaskId])
  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
  }, [])

  return {
    hoveredTaskId,
    setHoveredTaskId,
    selectedTaskId,
    selectTask,
  }
}

const useCreationWorkflow = (reload: () => Promise<void>) => {
  const handleCreatedTodo = useCallback(async () => {
    await reload()
  }, [reload])
  const { createTodo, isSubmitting, error } = useCreateTodo({
    onSuccess: handleCreatedTodo,
  })
  return {
    createTodo,
    isCreating: isSubmitting,
    error,
  }
}

const useMovementWorkflow = (
  setBoard: Dispatch<SetStateAction<BoardData | undefined>>,
  reload: () => Promise<void>,
) => {
  const { updatePosition, isUpdating, error } = useUpdateTodoPosition()

  const optimisticallySetPosition = useCallback(
    (taskId: string, position: TaskBoardTask['position']) => {
      setBoard((current) => {
        if (!current) return current
        return {
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === taskId ? { ...task, position } : task,
          ),
        }
      })
    },
    [setBoard],
  )

  const persistPosition = useCallback(
    async (taskId: string, position: TaskBoardTask['position']) => {
      try {
        await updatePosition(taskId, position)
        await reload()
      } catch (cause) {
        console.error('Failed to move task', cause)
        await reload()
      }
    },
    [updatePosition, reload],
  )

  const moveTask = useCallback(
    async (taskId: string, position: TaskBoardTask['position']) => {
      optimisticallySetPosition(taskId, position)
      await persistPosition(taskId, position)
    },
    [optimisticallySetPosition, persistPosition],
  )

  return {
    moveTask,
    isMovePending: isUpdating,
    error,
  }
}

export default App

type LandingPageProps = Readonly<{
  state: UseTaskFiltersResult
  hoveredTaskId?: string
  selectedTaskId?: string
  relationships?: readonly TaskBoardRelationship[]
  initialViewport?: TaskBoardViewport
  onHoverTask: (taskId: string | undefined) => void
  onSelectTask: (taskId: string) => void
  onCreateTodo: (values: AddTodoFormValues) => Promise<void>
  isCreatingTodo: boolean
  creationError?: string
  onMoveTask: (taskId: string, position: TaskBoardTask['position']) => Promise<void> | void
  isMovePending: boolean
  moveError?: string
  boardStatus?: BoardStatusDTO
  isStatusLoading: boolean
  statusError?: string
}>

const LandingPage = ({
  state,
  hoveredTaskId,
  selectedTaskId,
  relationships,
  initialViewport,
  onSelectTask,
  onHoverTask,
  onCreateTodo,
  isCreatingTodo,
  creationError,
  onMoveTask,
  isMovePending,
  moveError,
  boardStatus,
  isStatusLoading,
  statusError,
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
            initialViewport={initialViewport}
            hoveredTaskId={hoveredTaskId}
            onHoverTask={onHoverTask}
            onSelectTask={onSelectTask}
            onMoveTask={onMoveTask}
            isMovePending={isMovePending}
            moveError={moveError}
            selectedTaskId={selectedTaskId}
          />
          <SidebarSection
            tasks={state.filteredTasks}
            relationships={relationships}
            onCreateTodo={onCreateTodo}
            isCreating={isCreatingTodo}
            errorMessage={creationError}
            boardStatus={boardStatus}
            isStatusLoading={isStatusLoading}
            statusError={statusError}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
          />
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
  initialViewport?: TaskBoardViewport
  onSelectTask: (taskId: string) => void
  onHoverTask: (taskId: string | undefined) => void
  onMoveTask?: (taskId: string, position: TaskBoardTask['position']) => Promise<void> | void
  isMovePending?: boolean
  moveError?: string
}>

const TaskBoardSection = ({
  tasks,
  relationships,
  hoveredTaskId,
  selectedTaskId,
  initialViewport,
  onSelectTask,
  onHoverTask,
  onMoveTask,
  isMovePending,
  moveError,
}: TaskBoardSectionProps): JSX.Element => (
  <section className="rounded-[3rem] bg-white/90 p-6 shadow-2xl shadow-primary-500/10">
    {tasks.length === 0 ? (
      <p className="text-center text-sm text-gray-500">
        No visual tasks yet. Create one above or use the CLI to seed your spatial board.
      </p>
    ) : (
      <>
        <TaskBoard
          tasks={tasks}
          relationships={relationships}
          selectedId={selectedTaskId}
          hoverId={hoveredTaskId}
          onHover={onHoverTask}
          onSelect={onSelectTask}
          initialViewport={initialViewport}
          onMoveTask={onMoveTask}
          isMovePending={isMovePending}
        />
        {(isMovePending || moveError) && (
          <div className="mt-4 space-y-2 text-xs">
            {isMovePending && (
              <p className="font-medium text-gray-500">Saving your layout…</p>
            )}
            {moveError && (
              <p role="alert" className="font-semibold text-red-500">
                {moveError}
              </p>
            )}
          </div>
        )}
      </>
    )}
  </section>
)

type SidebarSectionProps = Readonly<{
  tasks: readonly TaskBoardTask[]
  relationships?: readonly TaskBoardRelationship[]
  onCreateTodo: (values: AddTodoFormValues) => Promise<void> | void
  isCreating: boolean
  errorMessage?: string
  boardStatus?: BoardStatusDTO
  isStatusLoading: boolean
  statusError?: string
  selectedTaskId?: string
  onSelectTask?: (taskId: string) => void
}>

const SidebarSection = ({
  tasks,
  relationships,
  onCreateTodo,
  isCreating,
  errorMessage,
  boardStatus,
  isStatusLoading,
  statusError,
  selectedTaskId,
  onSelectTask,
}: SidebarSectionProps): JSX.Element => (
  <div className="space-y-6 xl:sticky xl:top-12">
    <AddTodoForm
      onSubmit={onCreateTodo}
      isSubmitting={isCreating}
      errorMessage={errorMessage}
      className="h-fit"
    />
    <TaskMetricsPanel tasks={tasks} />
    <TaskHierarchyPanel
      tasks={tasks}
      relationships={relationships}
      selectedTaskId={selectedTaskId}
      onSelectTask={onSelectTask}
    />
    <DependencyHealthPanel
      status={boardStatus}
      isLoading={isStatusLoading}
      error={statusError}
    />
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
  onRetry: () => void | Promise<void>
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
