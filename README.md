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

This project uses AI-driven autonomous development. See:

- [`scripts/README.md`](scripts/README.md) - Autonomous development script docs
- [`AUTONOMOUS-DEV-GUIDE.md`](AUTONOMOUS-DEV-GUIDE.md) - Complete guide
- [`.spec-workflow/steering/`](.spec-workflow/steering/) - Project specifications

### Running Autonomous Development

```bash
# Run with defaults
./scripts/autonomous-dev.sh

# Run with custom settings
./scripts/autonomous-dev.sh -i 100 -c 5 -m gpt-5.1-codex
```

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
