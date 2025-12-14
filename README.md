# Todo for Visual Thinker

Neuroscience-backed todo list optimized for visual thinkers.

## Overview

A task management application designed specifically for visual thinkers, leveraging neuroscience research to enhance productivity through visual cues, spatial organization, and cognitive load reduction.

## Features (Planned)

- **Visual-First Design**: Color-coded tasks, icons, and spatial layouts
- **Dual Interface**: CLI for power users, Web UI for visual exploration
- **Smart Organization**: Priority-based visual hierarchy
- **Accessibility**: WCAG 2.1 AAA compliant
- **Offline-First**: SQLite database, works without internet

## Tech Stack

- **Frontend**: React 18+ with TypeScript, Vite, Tailwind CSS
- **CLI**: Commander.js with Chalk for colored output
- **Database**: SQLite via better-sqlite3
- **Testing**: Vitest with 80%+ coverage requirement
- **Architecture**: Hexagonal (Ports & Adapters)
- **Code Quality**: ESLint, Prettier, strict TypeScript

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Initialize database (creates data/todos.db by default)
pnpm cli init-db --seed-demo
```

### Development

```bash
# Start web dev server
pnpm dev

# Run CLI
pnpm cli <command>

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm typecheck

# Lint
pnpm lint
```

### Building

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
src/
├── cli/          # Command-line interface
├── core/         # Core business logic
│   ├── domain/   # Domain entities
│   ├── usecases/ # Application use cases
│   ├── ports/    # Interfaces for external deps
│   └── adapters/ # Implementations (repositories, etc.)
├── web/          # React web interface
│   ├── components/
│   ├── pages/
│   └── hooks/
└── shared/       # Shared utilities and types
    ├── types/
    ├── utils/
    └── constants/
```

## Architecture

This project follows **Hexagonal Architecture** (Ports & Adapters):

- **Domain**: Pure business logic, framework-independent
- **Use Cases**: Application-specific business rules
- **Ports**: Interfaces defining boundaries
- **Adapters**: Implementations for external systems (DB, UI, etc.)

### Key Principles

- **Dependency Injection**: All external dependencies injected
- **SOLID Principles**: Enforced throughout the codebase
- **Test-Driven**: 80%+ coverage, 90%+ for critical paths
- **Code Metrics**: Max 500 lines/file, 50 lines/function

## Code Quality Standards

- **Lines per file**: ≤500 (excluding comments/blanks)
- **Lines per function**: ≤50
- **Test coverage**: ≥80% overall, ≥90% critical paths
- **Cyclomatic complexity**: ≤10
- **TypeScript**: Strict mode enabled

## Autonomous Development

This project uses AI-driven autonomous development powered by **[steer-driven-runner](https://github.com/RyosukeMondo/steer-driven-runner)**.

### Installation

```bash
# Install steer-driven-runner
pip install git+https://github.com/RyosukeMondo/steer-driven-runner.git

# Or use uv
uv pip install git+https://github.com/RyosukeMondo/steer-driven-runner.git
```

### Running Autonomous Development

```bash
# Run with defaults
steer-run

# Run with custom settings
steer-run -i 100 -c 5 -m gpt-5.1-codex

# Stop gracefully (completes current iteration then exits)
touch stop.txt
# Runner detects stop.txt, stops, and removes the file
```

### Async Feedback System

Post feedback for the AI agent without blocking its progress:

```bash
# Quick feedback
steer-feedback "Web UI doesn't show todos from database"

# With priority and type
steer-feedback "Missing canvas zoom controls" --priority HIGH --type BUG
```

**How it works:**
1. You post feedback to `.spec-workflow/feedback/pending.md`
2. AI checks for feedback on each iteration
3. AI considers your feedback when planning work
4. Processed feedback gets archived automatically

**Feedback is non-blocking:**
- AI continues normal work if feedback isn't urgent
- You can post feedback anytime (like leaving mail)
- AI picks it up on the next iteration
- Multiple feedback items can accumulate

**Visual features checklist:**
- See `.spec-workflow/visual-checklist.md` for visual features requiring human verification
- AI uses this to self-assess visual implementations
- Update checklist with [x] when you verify features work

### Real-Time Monitoring

Monitor autonomous development progress with a rich CLI dashboard:

```bash
# In terminal 1: Run autonomous development
steer-run -i 100

# In terminal 2: Launch monitor
steer-monitor
```

**The monitor shows:**
- Iteration progress with visual progress bar
- Real-time code metrics (lines, files)
- Current task being worked on
- Recent script output
- Status indicators (running, stopped, error)

### Documentation

- [steer-driven-runner](https://github.com/RyosukeMondo/steer-driven-runner) - Main repository and full documentation
- [`scripts/README.md`](scripts/README.md) - Migration notes
- [`AUTONOMOUS-DEV-GUIDE.md`](AUTONOMOUS-DEV-GUIDE.md) - Complete guide
- [`.spec-workflow/steering/`](.spec-workflow/steering/) - Project specifications
- [`.spec-workflow/feedback/README.md`](.spec-workflow/feedback/README.md) - Feedback system docs

## Contributing

This is an experimental project using autonomous AI development. Human contributions are welcome for:

- Architecture decisions
- Steering document improvements
- Quality gate enhancements
- Bug fixes

## License

MIT

## Acknowledgments

Built using autonomous AI-driven development with Codex.
