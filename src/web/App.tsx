import { useCallback, useEffect, useState } from 'react'

import type { TodoStatus } from '@core/domain/Todo'

import type { TaskBoardTask } from './components'
import { AddTodoForm, TaskBoard, TaskMetricsPanel } from './components'
import { TaskFilters } from './components/TaskFilters'
import { useTaskFilters } from './hooks/useTaskFilters'
import type { UseTaskFiltersResult } from './hooks/useTaskFilters'

const sampleTodos: TaskBoardTask[] = [
  {
    id: 'todo-001',
    title: 'Map the launch journey',
    description:
      'Sketch the key milestones and dependencies for the v1 product launch to anchor the spatial board.',
    status: 'in_progress',
    priority: 4,
    category: 'Strategy',
    color: '#f97316',
    icon: '🧭',
    position: { x: 320, y: -140 },
    isSelected: true,
  },
  {
    id: 'todo-002',
    title: 'Design visual palette',
    description:
      'Validate the color semantics and iconography that reduce cognitive load for visual thinkers.',
    status: 'pending',
    priority: 3,
    category: 'Design',
    color: '#60a5fa',
    icon: '🎨',
    position: { x: -120, y: 40 },
  },
  {
    id: 'todo-003',
    title: 'Prototype infinite canvas',
    description:
      'Create an interactive slice of the canvas experience with zoom, pan, and clustering.',
    status: 'completed',
    priority: 5,
    category: 'Experience',
    color: '#34d399',
    icon: '🛰️',
    position: { x: 40, y: 220 },
  },
]

const INITIAL_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed']

function App() {
  const state = useTaskFilters(sampleTodos, INITIAL_STATUSES)
  const [hoveredTaskId, setHoveredTaskId] = useState<string | undefined>()
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    () => sampleTodos[0]?.id,
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

  return (
    <LandingPage
      state={state}
      hoveredTaskId={hoveredTaskId}
      selectedTaskId={selectedTaskId}
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
  onHoverTask: (taskId: string | undefined) => void
  onSelectTask: (taskId: string) => void
}>

const LandingPage = ({
  state,
  hoveredTaskId,
  selectedTaskId,
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
  hoveredTaskId?: string
  selectedTaskId?: string
  onSelectTask: (taskId: string) => void
  onHoverTask: (taskId: string | undefined) => void
}>

const TaskBoardSection = ({
  tasks,
  hoveredTaskId,
  selectedTaskId,
  onSelectTask,
  onHoverTask,
}: TaskBoardSectionProps): JSX.Element => (
  <section className="rounded-[3rem] bg-white/90 p-6 shadow-2xl shadow-primary-500/10">
    <TaskBoard
      tasks={tasks}
      selectedId={selectedTaskId}
      hoverId={hoveredTaskId}
      onHover={onHoverTask}
      onSelect={onSelectTask}
    />
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
