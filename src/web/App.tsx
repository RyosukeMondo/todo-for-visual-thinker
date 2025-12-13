import type { TaskCardProps } from './components'
import { TaskCard } from './components'

const sampleTodos: TaskCardProps[] = [
  {
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

function App() {
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
          <section className="rounded-3xl bg-white/90 p-6 shadow-xl shadow-primary-500/5">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Visual task cards showcase cognitive cues
                </h2>
                <p className="text-gray-600">
                  Each card encodes priority, category, status, and spatial context so visual thinkers can scan work at a glance.
                </p>
              </div>
              <div className="inline-flex items-center gap-3 rounded-full bg-primary-50 px-4 py-2 text-sm text-primary-700">
                <span className="text-lg">⚡</span>
                <span>Now powered by the first interactive TaskCard component.</span>
              </div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sampleTodos.map((todo) => (
                <TaskCard key={todo.title} {...todo} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
