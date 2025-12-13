function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Todo for Visual Thinker
          </h1>
          <p className="text-lg text-gray-600">
            Neuroscience-backed task management for visual minds
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-700">
              Welcome! This application is being developed using autonomous AI-driven development.
            </p>
            <p className="text-gray-600 mt-4 text-sm">
              Core features will be implemented according to the specification in{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">.spec-workflow/steering/</code>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
