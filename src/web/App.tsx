import type { TodoStatus } from '@core/domain/Todo'

import type { TaskBoardTask } from './components'
import { TaskBoard } from './components'
import { TaskFilters } from './components/TaskFilters'
import { useTaskFilters } from './hooks/useTaskFilters'

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
  const {
    filters,
    filteredTasks,
    toggleStatus,
    toggleCategory,
    resetCategories,
    categories,
  } = useTaskFilters(sampleTodos, INITIAL_STATUSES)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="container mx-auto px-4 py-10">
        <header className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary-500">
            Visual-first productivity
          </p>
          <h1 className="mt-3 text-4xl font-bold text-gray-900">
            Todo for Visual Thinker
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Neuroscience-backed task management for spatial minds, built in the open.
          </p>
        </header>

        <main className="mx-auto max-w-6xl space-y-8">
          <TaskFilters
            statuses={INITIAL_STATUSES}
            categories={categories}
            value={filters}
            onStatusToggle={toggleStatus}
            onCategoryToggle={toggleCategory}
            onClearCategories={resetCategories}
          />
          <section className="rounded-[3rem] bg-white/90 p-6 shadow-2xl shadow-primary-500/10">
            <TaskBoard tasks={filteredTasks} selectedId="todo-001" />
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
