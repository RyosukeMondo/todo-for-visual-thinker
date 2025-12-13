# Technical Architecture

## Technology Stack

### Core Principles
- CLI-First: All business logic accessible via command line
- Local-First: Data stored locally, cloud sync optional
- Agent-Friendly: Structured APIs, machine-readable output
- Type-Safe: TypeScript throughout
- Test-Driven: 80%+ coverage minimum

### Primary Technologies

#### Backend and CLI
- Runtime: Node.js 18+ (LTS)
- Language: TypeScript 5+
- CLI Framework: Commander.js or Oclif
- Data Storage: SQLite (structured data) plus JSON files (simple config)
- Future: Optional PostgreSQL for server deployment
- Testing: Vitest (fast, modern)
- Build: esbuild (speed) or tsup (convenience)

#### Frontend Web UI
- Framework: React 18+ with TypeScript
- State: Zustand or Jotai (lightweight, avoid Redux complexity)
- Routing: React Router 6+
- Styling: Tailwind CSS (utility-first), CSS-in-JS only where dynamic styling needed
- Canvas Rendering: SVG for simple cases, Canvas API for performance with large datasets
- Consider: Konva.js or PixiJS if complex interactions needed
- Build: Vite (fast, modern)

#### Testing and Quality
- Unit Tests: Vitest
- Integration Tests: Vitest plus Testing Library
- E2E Tests: Playwright (only critical paths)
- Linting: ESLint with strict rules
- Formatting: Prettier
- Type Checking: TypeScript strict mode
- Pre-commit: Husky plus lint-staged

#### DevOps
- Package Manager: pnpm (fast, disk-efficient)
- Monorepo: Optional, start simple (separate CLI and Web if needed)
- CI/CD: GitHub Actions
- Deployment: CLI as npm package, Web on static hosting (Vercel, Netlify, Cloudflare Pages)

---

## Architecture Patterns

### Hexagonal Architecture (Ports and Adapters)

The application follows hexagonal architecture with clear separation:

```
CLI Interface (Commander.js commands)
         |
         v
    Web UI (React components)
         |
         v
  Application Core (Business Logic - Framework Agnostic)
    - Domain Models (Task, TaskBoard, Category, Relationship)
    - Use Cases / Services (CreateTask, UpdateTask, DeleteTask, QueryTasks)
    - Ports / Interfaces (TaskRepository, Logger, EventBus)
         |
         v
  Adapters (Infrastructure)
    - SQLiteTaskRepository
    - FileSystemLogger
    - InMemoryEventBus
```

### Key Architectural Decisions

#### Dependency Injection (Mandatory)
All external dependencies must be injected. This enables testing and flexibility.

Bad example - Hard-coded dependency:
```typescript
class TaskService {
  private repo = new SQLiteTaskRepository(); // Cannot test!
}
```

Good example - Dependency injection:
```typescript
class TaskService {
  constructor(private repo: TaskRepository) {}
}

// Usage
const repo = new SQLiteTaskRepository(dbPath);
const service = new TaskService(repo);
```

#### Single Source of Truth (SSOT)
- Domain models are canonical
- UI state derived from domain state
- No duplicate data representations
- Event sourcing for audit trail (future)

#### SOLID Principles
- Single Responsibility: Each class/module does one thing
- Open/Closed: Extend via interfaces, not modification
- Liskov Substitution: Implementations interchangeable
- Interface Segregation: Small, focused interfaces
- Dependency Inversion: Depend on abstractions

#### Single Level of Abstraction Principle (SLAP)
Each function operates at one level of abstraction.

Bad example - Mixed abstraction levels:
```typescript
async function createTask(data: TaskInput) {
  const id = generateUUID();
  const timestamp = Date.now();
  const task = { ...data, id, createdAt: timestamp };
  await db.query("INSERT INTO tasks VALUES (?, ?, ?)", [id, data.title, timestamp]);
  logger.info("Task created", { id });
  return task;
}
```

Good example - Consistent abstraction:
```typescript
async function createTask(data: TaskInput): Promise<Task> {
  const task = buildTask(data);
  await repository.save(task);
  logger.taskCreated(task);
  return task;
}
```

---

## Code Quality Standards

### Code Metrics (Enforced)
- Max 500 lines per file (excluding tests, comments, blank lines)
- Max 50 lines per function (excluding tests)
- 80% test coverage minimum (90% for critical paths)
- Cyclomatic complexity: less than 10 per function
- No console.log in production code (use logger)

### Error Handling

#### Fail Fast Philosophy
- Validate inputs at entry points
- Throw errors immediately for invalid state
- No silent failures
- No returning null/undefined for errors (use Result type or throw)

#### Custom Error Hierarchy
```typescript
// Domain errors
class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

class TaskNotFoundError extends DomainError {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`, 'TASK_NOT_FOUND', { taskId });
  }
}

class ValidationError extends DomainError {
  constructor(field: string, reason: string) {
    super(`Validation failed: ${field} - ${reason}`, 'VALIDATION_ERROR', { field, reason });
  }
}
```

#### Structured Logging
JSON format for machine parsing:

```typescript
interface LogEntry {
  timestamp: string;      // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;        // e.g., 'task-service'
  event: string;          // e.g., 'task.created'
  context: Record<string, unknown>;
  message: string;
}
```

Never log:
- Passwords, tokens, API keys
- PII without explicit consent
- Full file paths (use relative paths)

### Testing Strategy

#### Unit Tests (80%+ coverage)
- Test business logic in isolation
- Mock all external dependencies
- Fast (less than 1ms per test ideal)
- No network, file system, or database access

#### Integration Tests
- Test adapters with real dependencies (test databases)
- Verify end-to-end flows
- Use test containers for databases
- Slower but comprehensive

#### E2E Tests (Critical paths only)
- User flows that must never break
- Task creation, display, completion, deletion
- Keep minimal to avoid flakiness

### Performance Targets

#### CLI Operations
- Task CRUD: less than 50ms
- Query 1000 tasks: less than 200ms
- Startup time: less than 500ms

#### Web UI
- Initial render: less than 1s
- Task operations: less than 100ms
- Canvas render (100 tasks): less than 500ms
- Canvas render (1000 tasks): less than 2s
- Time to interactive: less than 2s

#### Bundle Sizes
- CLI: less than 5MB (with dependencies)
- Web JS bundle: less than 200KB (gzipped)
- Web CSS: less than 50KB (gzipped)

---

## Project Structure

### Directory Organization

```
todo-for-visual-thinker/
├── .spec-workflow/              # Specification workflow files
│   ├── steering/                # Project steering documents
│   │   ├── product.md           # Product vision and requirements
│   │   ├── tech.md              # Technical architecture (this file)
│   │   └── design.md            # Design system
│   └── specs/                   # Feature specifications
│       └── [feature-name]/      # Per-feature specs
│           ├── requirements.md
│           ├── design.md
│           ├── tasks.md
│           └── implementation-log.md
│
├── src/                         # Source code
│   ├── cli/                     # Command-line interface
│   │   ├── commands/            # CLI command implementations
│   │   │   ├── task.ts          # task create, list, update, delete
│   │   │   ├── board.ts         # board operations
│   │   │   ├── status.ts        # status reporting
│   │   │   └── index.ts         # Command registry
│   │   ├── output/              # Output formatters
│   │   │   ├── json.ts          # JSON formatter
│   │   │   ├── pretty.ts        # Human-readable formatter
│   │   │   └── table.ts         # Table formatter
│   │   ├── cli.ts               # CLI entry point
│   │   └── index.ts             # CLI bootstrap
│   │
│   ├── core/                    # Business logic (framework-agnostic)
│   │   ├── domain/              # Domain models
│   │   │   ├── Task.ts          # Task entity
│   │   │   ├── TaskBoard.ts     # Board entity
│   │   │   ├── Category.ts      # Category value object
│   │   │   ├── Relationship.ts  # Task relationship
│   │   │   └── types.ts         # Shared domain types
│   │   │
│   │   ├── usecases/            # Application services
│   │   │   ├── CreateTask.ts
│   │   │   ├── UpdateTask.ts
│   │   │   ├── DeleteTask.ts
│   │   │   ├── QueryTasks.ts
│   │   │   ├── CreateRelationship.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── ports/               # Interfaces (contracts)
│   │   │   ├── TaskRepository.ts
│   │   │   ├── Logger.ts
│   │   │   ├── EventBus.ts
│   │   │   └── index.ts
│   │   │
│   │   └── errors/              # Domain errors
│   │       ├── DomainError.ts
│   │       ├── TaskNotFoundError.ts
│   │       ├── ValidationError.ts
│   │       └── index.ts
│   │
│   ├── infrastructure/          # Adapters (implementations)
│   │   ├── repositories/        # Data persistence
│   │   │   ├── SQLiteTaskRepository.ts
│   │   │   ├── InMemoryTaskRepository.ts  # For testing
│   │   │   └── migrations/      # Database migrations
│   │   │       └── 001_initial.sql
│   │   │
│   │   ├── logging/             # Logging implementations
│   │   │   ├── ConsoleLogger.ts
│   │   │   ├── FileLogger.ts
│   │   │   └── JSONLogger.ts    # Structured logging
│   │   │
│   │   └── events/              # Event bus implementations
│   │       ├── InMemoryEventBus.ts
│   │       └── index.ts
│   │
│   ├── web/                     # Web UI (React)
│   │   ├── components/          # React components
│   │   │   ├── TaskCard.tsx     # Individual task display
│   │   │   ├── TaskBoard.tsx    # Canvas board
│   │   │   ├── TaskForm.tsx     # Task creation/edit
│   │   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   │   └── index.ts
│   │   │
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useTasks.ts      # Task operations
│   │   │   ├── useBoard.ts      # Board state
│   │   │   └── index.ts
│   │   │
│   │   ├── pages/               # Page components
│   │   │   ├── BoardPage.tsx    # Main visual board
│   │   │   ├── ListView.tsx     # List view alternative
│   │   │   ├── SettingsPage.tsx # Settings
│   │   │   └── index.ts
│   │   │
│   │   ├── store/               # State management
│   │   │   ├── taskStore.ts     # Zustand store for tasks
│   │   │   └── index.ts
│   │   │
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # Web entry point
│   │   └── index.html           # HTML template
│   │
│   └── shared/                  # Shared utilities
│       ├── types/               # Shared TypeScript types
│       │   ├── api.ts           # API types
│       │   └── common.ts        # Common types
│       │
│       └── utils/               # Pure utility functions
│           ├── validation.ts    # Input validation
│           ├── formatting.ts    # Data formatting
│           └── index.ts
│
├── tests/                       # Test files
│   ├── unit/                    # Unit tests
│   │   ├── core/                # Core business logic tests
│   │   │   ├── Task.test.ts
│   │   │   ├── CreateTask.test.ts
│   │   │   └── ...
│   │   └── shared/              # Utility tests
│   │
│   ├── integration/             # Integration tests
│   │   ├── cli/                 # CLI integration tests
│   │   ├── repositories/        # Repository tests
│   │   └── ...
│   │
│   ├── e2e/                     # End-to-end tests
│   │   ├── task-lifecycle.spec.ts
│   │   └── visual-board.spec.ts
│   │
│   └── fixtures/                # Test data
│       ├── tasks.json
│       └── boards.json
│
├── scripts/                     # Development scripts
│   ├── autonomous-dev.sh        # Autonomous development runner
│   ├── setup-db.ts              # Database setup
│   ├── seed-data.ts             # Test data seeding
│   └── validate-commit.sh       # Pre-commit validation
│
├── docs/                        # Documentation
│   ├── architecture/            # Architecture docs
│   │   ├── adr/                 # Architecture Decision Records
│   │   │   ├── 001-cli-first.md
│   │   │   ├── 002-sqlite.md
│   │   │   └── ...
│   │   └── diagrams/            # Architecture diagrams
│   │
│   ├── api/                     # API documentation
│   │   ├── cli-commands.md      # CLI reference
│   │   └── core-api.md          # Core API reference
│   │
│   └── user-guide/              # User documentation
│       ├── getting-started.md
│       ├── visual-board.md
│       └── cli-usage.md
│
├── .github/                     # GitHub configuration
│   ├── workflows/               # GitHub Actions
│   │   ├── ci.yml               # Continuous integration
│   │   ├── release.yml          # Release automation
│   │   └── quality-checks.yml   # Code quality checks
│   └── ISSUE_TEMPLATE/          # Issue templates
│
├── .husky/                      # Git hooks
│   ├── pre-commit               # Pre-commit hook
│   └── commit-msg               # Commit message validation
│
├── .vscode/                     # VS Code settings
│   ├── settings.json            # Editor settings
│   ├── extensions.json          # Recommended extensions
│   └── launch.json              # Debug configurations
│
├── package.json                 # Project manifest
├── tsconfig.json                # TypeScript config
├── vitest.config.ts             # Vitest configuration
├── eslint.config.js             # ESLint configuration
├── prettier.config.js           # Prettier configuration
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore patterns
├── LICENSE                      # License file
└── README.md                    # Project overview
```

### File Naming Conventions

#### General Rules
- **PascalCase**: Classes, interfaces, types, React components
  - `Task.ts`, `TaskRepository.ts`, `TaskCard.tsx`
- **camelCase**: Functions, variables, files with exports
  - `createTask.ts`, `useTasks.ts`, `validation.ts`
- **kebab-case**: Configuration files, scripts
  - `tsconfig.json`, `setup-db.ts`, `autonomous-dev.sh`
- **SCREAMING_SNAKE_CASE**: Constants, environment variables
  - `MAX_TASKS`, `DB_PATH`

#### Test Files
- Same name as source file with `.test.ts` or `.spec.ts` suffix
- Example: `Task.ts` → `Task.test.ts`
- E2E tests use `.spec.ts` (Playwright convention)

#### Component Files
- React components use `.tsx` extension
- One component per file (except small helper components)
- File name matches component name: `TaskCard.tsx` exports `TaskCard`

### Module Organization

#### Import Order (Enforced by ESLint)
```typescript
// 1. External dependencies
import { Command } from 'commander';
import React from 'react';

// 2. Internal absolute imports (@/ alias)
import { Task } from '@/core/domain/Task';
import { TaskRepository } from '@/core/ports/TaskRepository';

// 3. Relative imports (same module)
import { validateTaskInput } from './validation';
import type { TaskInput } from './types';

// 4. Type-only imports (separate)
import type { Logger } from '@/core/ports/Logger';
```

#### Path Aliases (tsconfig.json)
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@core/*": ["./src/core/*"],
      "@cli/*": ["./src/cli/*"],
      "@web/*": ["./src/web/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

### Build Outputs

```
dist/                            # Build output
├── cli/                         # CLI bundle
│   ├── index.js                 # Entry point
│   └── index.js.map             # Source map
│
├── web/                         # Web bundle
│   ├── assets/                  # Static assets
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── ...
│   └── index.html               # HTML entry
│
└── types/                       # Type definitions
    └── index.d.ts
```

### Configuration Files

#### TypeScript Configuration
- `tsconfig.json`: Base configuration
- `tsconfig.node.json`: Node/CLI specific
- `tsconfig.web.json`: Web/React specific (if needed)

#### Code Quality
- `eslint.config.js`: Linting rules (Flat config, ESLint 9+)
- `prettier.config.js`: Code formatting
- `vitest.config.ts`: Test configuration

#### Build Tools
- `vite.config.ts`: Web bundler (Vite)
- `tsup.config.ts`: CLI bundler (tsup) - alternative to esbuild

### Data Storage

#### Local Data Location
```
~/.todo-visual-thinker/          # User data directory
├── tasks.db                     # SQLite database
├── config.json                  # User preferences
└── logs/                        # Application logs
    ├── app.log                  # Rolling log file
    └── error.log                # Error log
```

#### Database Schema
```sql
-- tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,  -- pending, in_progress, completed
  priority INTEGER,      -- 1-5
  category TEXT,
  color TEXT,            -- Hex color code
  position_x REAL,       -- Canvas X position
  position_y REAL,       -- Canvas Y position
  created_at INTEGER,    -- Unix timestamp
  updated_at INTEGER,
  completed_at INTEGER
);

-- relationships table
CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  from_task_id TEXT NOT NULL,
  to_task_id TEXT NOT NULL,
  type TEXT NOT NULL,    -- depends_on, blocks, related_to
  created_at INTEGER,
  FOREIGN KEY (from_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (to_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT,
  created_at INTEGER
);
```

### Environment Variables

#### Required
```bash
# None for MVP - all defaults work
```

#### Optional
```bash
# Development
DEBUG=true                       # Enable debug logging
NODE_ENV=development|production  # Environment mode

# Data
DATA_DIR=~/.todo-visual-thinker  # Custom data directory
DB_PATH=/custom/path/tasks.db    # Custom database path

# Logging
LOG_LEVEL=debug|info|warn|error  # Logging level
LOG_FORMAT=json|pretty           # Log output format

# Web UI (for server mode in future)
PORT=3000                        # Server port
HOST=localhost                   # Server host
```

---

## CLI-First & AI-First Architecture

This comprehensive framework ensures the CLI is truly AI-first and automation-ready from day one.

### Philosophy

**CLI-First**: All functionality accessible via command line, GUI is a thin wrapper
**AI-First**: Designed for autonomous agents to operate without human intervention

### 1. Data Layer Architecture

#### Principles
- **Structured & Queryable**: Data must be easily queryable by CLI and AI
- **Schema-Driven**: Strong schemas for validation
- **Portable**: Easy export/import for AI processing
- **Versioned**: Data migrations automated

#### Data Model (Structured)

**Schema Definition:**
```typescript
// Domain models with strict typing
interface Task {
  id: string;              // UUID
  title: string;           // 1-200 chars
  description?: string;    // 0-5000 chars
  status: TaskStatus;      // enum: pending | in_progress | completed
  priority: number;        // 1-5
  category?: string;       // reference to Category
  position: Position;      // {x: number, y: number}
  color: string;           // hex color
  createdAt: number;       // Unix timestamp
  updatedAt: number;
  completedAt?: number;
  metadata: Record<string, unknown>;  // extensible
}

// Export schema as JSON Schema for validation
const taskSchema = {
  type: "object",
  required: ["id", "title", "status", "position"],
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string", minLength: 1, maxLength: 200 },
    status: { enum: ["pending", "in_progress", "completed"] },
    // ... complete schema
  }
};
```

**CLI Access:**
```bash
# Query data with structured output
todo task list --format json
todo task list --format csv
todo task list --format table
todo task get <id> --format json

# Export entire database
todo export --format json --output backup.json
todo export --format sqlite --output backup.db

# Import data
todo import --format json --input backup.json --merge
```

**AI Access:**
```typescript
// Programmatic API for AI agents
const tasks = await queryTasks({
  status: 'pending',
  priority: { gte: 3 },
  category: 'work'
});

// Batch operations
await batchUpdate(tasks, { status: 'in_progress' });
```

#### Schema Validation

**Validation Strategy:**
- All data validated on write
- Schema exported for external validation
- JSON Schema for interoperability
- TypeScript types generated from schema

```bash
# Validate data against schema
todo validate data --input tasks.json --schema task
todo validate database --fix  # Auto-fix minor issues

# Export schema
todo schema export --type task --format json-schema
todo schema export --type task --format typescript
```

#### Data Migrations

**Migration Framework:**
```typescript
// migrations/001_add_color_field.ts
export const up = async (db: Database) => {
  await db.exec(`
    ALTER TABLE tasks ADD COLUMN color TEXT DEFAULT '#808080';
  `);
};

export const down = async (db: Database) => {
  await db.exec(`
    ALTER TABLE tasks DROP COLUMN color;
  `);
};
```

**CLI Automation:**
```bash
# Run migrations
todo migrate up           # Apply pending migrations
todo migrate down         # Rollback last migration
todo migrate status       # Show migration status
todo migrate create <name>  # Generate new migration

# AI-friendly migration status
todo migrate status --format json
{
  "current": "003_add_categories",
  "pending": ["004_add_relationships"],
  "applied": [
    "001_initial_schema",
    "002_add_positions",
    "003_add_categories"
  ]
}
```

#### Data Portability

**Export/Import Formats:**
- JSON (human-readable, git-friendly)
- SQLite (binary, efficient)
- CSV (spreadsheet compatible)
- Markdown (documentation)

```bash
# Full backup
todo backup create --output ~/backups/todo-$(date +%Y%m%d).json

# Selective export
todo export --filter "status=completed" --since "2025-01-01"

# Import with conflict resolution
todo import --input data.json --on-conflict merge
todo import --input data.json --on-conflict skip
todo import --input data.json --on-conflict overwrite
```

### 2. API Design (CLI as API)

#### Principles
- **Consistent Interface**: All commands follow same patterns
- **Composable**: Commands can pipe to each other
- **Idempotent**: Same command, same result (where applicable)
- **Versioned**: Breaking changes require version bump

#### Command Structure

**Standard Format:**
```bash
todo <resource> <action> [options] [arguments]
     └─noun    └─verb
```

**Examples:**
```bash
# CRUD operations
todo task create "New task" --priority 3
todo task list --status pending
todo task get <id>
todo task update <id> --status completed
todo task delete <id>

# Batch operations
todo task batch-update --filter "status=pending" --set priority=5
todo task batch-delete --filter "completedAt<2025-01-01"

# Relationships
todo relationship create <from-id> <to-id> --type depends_on
todo relationship list --task <id>
```

#### Output Formats

**Machine-Readable (Default for AI):**
```bash
# JSON (default for --format json)
todo task list --format json
{
  "data": [...],
  "count": 42,
  "page": 1,
  "total_pages": 3
}

# JSON Lines (streaming)
todo task list --format jsonl
{"id": "1", "title": "Task 1", ...}
{"id": "2", "title": "Task 2", ...}

# CSV
todo task list --format csv
id,title,status,priority
1,"Task 1",pending,3

# TSV (tab-separated)
todo task list --format tsv
```

**Human-Readable:**
```bash
# Table (pretty-printed)
todo task list --format table
┌────┬──────────┬──────────┬──────────┐
│ ID │ Title    │ Status   │ Priority │
├────┼──────────┼──────────┼──────────┤
│ 1  │ Task 1   │ pending  │ 3        │
└────┴──────────┴──────────┴──────────┘

# Tree (hierarchical)
todo task list --format tree
📋 Work (12 tasks)
├─ 🔴 Critical bug fix (priority: 5)
├─ 🟡 Feature planning (priority: 3)
└─ 🟢 Documentation (priority: 1)

# Summary
todo task list --format summary
Total: 42 tasks
Pending: 12 (28.5%)
In Progress: 8 (19%)
Completed: 22 (52.5%)
```

#### Filtering & Querying

**Query Language:**
```bash
# Simple filters
todo task list --status pending
todo task list --priority 5
todo task list --category work

# Comparison operators
todo task list --priority ">3"
todo task list --created-after "2025-01-01"
todo task list --updated-before "2025-12-31"

# Logical operators
todo task list --status pending --priority ">3"  # AND
todo task list --filter "status=pending OR priority>3"  # OR

# Complex queries (SQL-like)
todo task query "SELECT * FROM tasks WHERE status='pending' AND priority > 3 ORDER BY createdAt DESC LIMIT 10"

# Full-text search
todo task search "visual thinker"
todo task search "canvas" --field title,description
```

#### Pagination & Performance

**Large Result Sets:**
```bash
# Pagination
todo task list --page 2 --per-page 20
todo task list --limit 100 --offset 50

# Streaming (for AI processing)
todo task list --stream  # Output as JSON lines, infinite scroll

# Cursor-based (stable pagination)
todo task list --after <cursor>
todo task list --before <cursor>
```

#### Versioning

**API Versioning:**
```bash
# Explicit version
todo --api-version 1 task list
todo --api-version 2 task list  # Future breaking changes

# Version negotiation
todo --require-version ">=1.2.0" task create "New task"

# Deprecation warnings
todo task legacy-command
Warning: This command is deprecated in v2.0.0. Use 'todo task new-command' instead.
```

### 3. Configuration Management

#### Principles
- **Configuration as Code**: All settings in version-controllable files
- **Environment-Based**: Different configs for dev/staging/prod
- **Overridable**: CLI flags > env vars > config files > defaults
- **Validated**: Schema-validated configuration

#### Configuration Files

**Hierarchy:**
```
~/.config/todo/config.json        # Global config
~/project/.todo/config.json       # Project config (overrides global)
~/.config/todo/config.local.json  # Local overrides (gitignored)
```

**Configuration Schema:**
```json
{
  "database": {
    "path": "~/.local/share/todo/tasks.db",
    "backup": {
      "enabled": true,
      "frequency": "daily",
      "retention": 30
    }
  },
  "defaults": {
    "format": "json",
    "editor": "vim",
    "timezone": "UTC"
  },
  "features": {
    "analytics": false,
    "auto_backup": true,
    "sync": false
  },
  "ai": {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

**CLI Access:**
```bash
# Get configuration
todo config get database.path
todo config get --all --format json

# Set configuration
todo config set defaults.format table
todo config set features.analytics true

# Validate configuration
todo config validate
todo config validate --fix

# Reset to defaults
todo config reset
todo config reset database.path
```

#### Environment Variables

**Standard Environment Variables:**
```bash
# Database
TODO_DB_PATH=/custom/path/tasks.db
TODO_DB_BACKUP_ENABLED=true

# Output
TODO_FORMAT=json
TODO_COLOR=auto  # auto | always | never

# Behavior
TODO_EDITOR=code
TODO_TIMEZONE=America/New_York

# AI/Agent mode
TODO_AGENT_MODE=true  # Disables interactive prompts
TODO_API_KEY=sk-...

# Debug
TODO_DEBUG=true
TODO_LOG_LEVEL=debug
```

**Priority Order:**
```
CLI flags > Environment variables > Project config > Global config > Defaults
```

#### Feature Flags

**Dynamic Feature Control:**
```bash
# Enable/disable features
todo feature enable experimental_ai_suggestions
todo feature disable analytics

# List features
todo feature list --format json
{
  "features": [
    {
      "name": "experimental_ai_suggestions",
      "enabled": true,
      "description": "AI-powered task suggestions",
      "stable": false
    }
  ]
}

# Feature-gated commands
todo task suggest  # Only works if experimental_ai_suggestions enabled
```

### 4. Observability & Debugging

#### Principles
- **Observable**: Can inspect internal state at any time
- **Debuggable**: Rich error messages and traces
- **Auditable**: All changes logged
- **Monitorable**: Metrics exposed for tracking

#### Structured Logging

**Log Levels:**
```bash
# Set log level
TODO_LOG_LEVEL=debug todo task create "Test"

# Logs output (JSON)
{"timestamp":"2025-01-15T10:30:00Z","level":"debug","event":"task.create","context":{"title":"Test"},"message":"Creating task"}
{"timestamp":"2025-01-15T10:30:00Z","level":"info","event":"task.created","context":{"id":"abc123"},"message":"Task created successfully"}

# Human-readable logs
TODO_LOG_FORMAT=pretty todo task create "Test"
[DEBUG] 10:30:00 Creating task (title=Test)
[INFO]  10:30:00 Task created successfully (id=abc123)
```

**Log Destinations:**
```bash
# File logging
TODO_LOG_FILE=~/.local/share/todo/logs/todo.log todo task create "Test"

# Syslog
TODO_LOG_SYSLOG=true todo task create "Test"

# Multiple destinations
TODO_LOG_FILE=app.log TODO_LOG_SYSLOG=true TODO_LOG_STDOUT=true
```

#### Debugging & Tracing

**Debug Mode:**
```bash
# Verbose debugging
todo --debug task create "Test"
todo --trace task create "Test"  # Even more verbose

# Debug specific subsystems
TODO_DEBUG=database,api todo task create "Test"

# Performance profiling
todo --profile task list
Execution time: 234ms
  - Query: 145ms
  - Serialization: 67ms
  - Rendering: 22ms
```

**Trace IDs:**
```bash
# Generate trace ID for request tracking
todo --trace-id abc-123 task create "Test"

# All logs include trace ID
{"trace_id":"abc-123","level":"info","event":"task.created"}
```

#### Audit Logging

**Change Tracking:**
```bash
# Audit log (all mutations)
todo audit log --format json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "user": "alice",
  "command": "task update abc123 --status completed",
  "changes": {
    "status": {"from": "pending", "to": "completed"}
  }
}

# Query audit log
todo audit search --entity task --id abc123
todo audit search --user alice --since "2025-01-01"
todo audit search --command "task delete"
```

#### Health Checks

**System Health:**
```bash
# Health check (exit code 0 = healthy)
todo health check
todo health check --format json
{
  "status": "healthy",
  "checks": {
    "database": {"status": "ok", "latency_ms": 5},
    "filesystem": {"status": "ok", "free_space_gb": 50},
    "migrations": {"status": "ok", "current": "003"}
  }
}

# Individual subsystems
todo health check database
todo health check filesystem
```

#### Metrics & Stats

**Usage Metrics:**
```bash
# Statistics
todo stats --format json
{
  "tasks": {
    "total": 156,
    "by_status": {
      "pending": 45,
      "in_progress": 12,
      "completed": 99
    }
  },
  "performance": {
    "avg_query_time_ms": 15,
    "avg_write_time_ms": 8
  },
  "storage": {
    "database_size_mb": 2.3,
    "backup_size_mb": 1.8
  }
}

# Metrics export (Prometheus format)
todo metrics export --format prometheus
# TYPE todo_tasks_total counter
todo_tasks_total{status="pending"} 45
```

### 5. Error Handling & Recovery

#### Principles
- **Structured Errors**: Machine-readable error codes
- **Actionable**: Clear guidance on how to fix
- **Recoverable**: Automatic retry where appropriate
- **Fail-Fast**: Don't continue with invalid state

#### Error Codes

**Standard Error Codes:**
```typescript
enum ErrorCode {
  // Input errors (4xx equivalent)
  VALIDATION_ERROR = 'E_VALIDATION',
  NOT_FOUND = 'E_NOT_FOUND',
  CONFLICT = 'E_CONFLICT',

  // System errors (5xx equivalent)
  DATABASE_ERROR = 'E_DATABASE',
  FILESYSTEM_ERROR = 'E_FILESYSTEM',
  NETWORK_ERROR = 'E_NETWORK',

  // Business logic errors
  INVALID_STATE = 'E_INVALID_STATE',
  DEPENDENCY_ERROR = 'E_DEPENDENCY',
}
```

**Error Output:**
```bash
# Human-readable
todo task create ""
Error: Task title cannot be empty
Code: E_VALIDATION
Field: title
Constraint: minLength(1)

# Machine-readable (JSON)
todo task create "" --format json
{
  "error": {
    "code": "E_VALIDATION",
    "message": "Task title cannot be empty",
    "field": "title",
    "constraint": "minLength(1)",
    "documentation": "https://docs.todo.app/errors/E_VALIDATION"
  }
}

# Exit code mapping
# 0 = success
# 1 = validation error
# 2 = not found
# 3 = conflict
# 64 = database error
# 65 = filesystem error
```

#### Error Recovery

**Automatic Retry:**
```bash
# Retry on transient failures
todo task create "Test" --retry 3 --retry-delay 1000

# Exponential backoff
todo task create "Test" --retry 3 --retry-backoff exponential
```

**Graceful Degradation:**
```bash
# Fallback strategies
todo task list  # If database locked, use cached version
Warning: Using cached data (database locked)
```

#### Validation

**Input Validation:**
```bash
# Validate before execution
todo task create "" --validate-only
Validation failed: Title required

# Schema validation
todo task create '{"invalid":"data"}' --from-json
Error: Missing required field 'title'
```

### 6. State Management

#### Principles
- **Inspectable**: Current state always queryable
- **Persistent**: State survives restarts
- **Migratable**: State can be moved between systems
- **Repairable**: Corrupted state can be fixed

#### State Inspection

**Query State:**
```bash
# Current state
todo state show --format json
{
  "database": {
    "path": "/home/user/.local/share/todo/tasks.db",
    "version": "003",
    "size_mb": 2.3
  },
  "cache": {
    "enabled": true,
    "size_mb": 0.5
  },
  "session": {
    "active_tasks": 3,
    "last_sync": "2025-01-15T10:00:00Z"
  }
}

# State history
todo state history --limit 10
```

#### State Export/Import

**Backup & Restore:**
```bash
# Export complete state
todo state export --output state-backup.tar.gz

# Import state
todo state import --input state-backup.tar.gz

# Merge states (conflict resolution)
todo state merge --input other-state.tar.gz --strategy merge
```

#### State Repair

**Fix Corruption:**
```bash
# Detect issues
todo state validate
Found issues:
- Orphaned relationships: 3
- Invalid task status: 2
- Missing required fields: 1

# Auto-fix
todo state repair --fix
Fixed 3 orphaned relationships
Fixed 2 invalid statuses
Removed 1 invalid task

# Manual repair
todo state repair --interactive
```

### 7. Automation & Scripting

#### Principles
- **Scriptable**: All commands work in scripts
- **Non-Interactive**: Agent mode disables prompts
- **Pipeable**: Commands compose via pipes
- **Batch-Friendly**: Bulk operations supported

#### Non-Interactive Mode

**Agent Mode:**
```bash
# Disable all prompts
TODO_AGENT_MODE=true todo task delete <id>
# No confirmation prompt, deletes immediately

# Explicit flag
todo task delete <id> --yes  # Skip confirmation
todo task delete <id> --no-confirm
```

#### Piping & Composition

**Unix Philosophy:**
```bash
# Pipe output to other commands
todo task list --format json | jq '.data[] | select(.priority > 3)'

# Chain commands
todo task list --status pending --format json \
  | todo task batch-update --set status=in_progress

# Output to file
todo task list --format csv > tasks.csv
```

#### Batch Operations

**Bulk Processing:**
```bash
# Batch create
cat tasks.txt | todo task batch-create --from-stdin

# Batch update
todo task batch-update \
  --filter "status=pending AND priority<3" \
  --set priority=1

# Batch delete
todo task batch-delete \
  --filter "completedAt<2024-01-01" \
  --confirm-count

# Progress reporting
todo task batch-update --filter "status=pending" --set status=done --progress
Updating tasks: [████████████████████] 156/156 (100%)
```

### 8. Testing & Validation

#### Principles
- **Testable**: CLI fully testable via automated tests
- **Reproducible**: Same inputs = same outputs
- **Isolated**: Tests don't interfere with real data
- **Fast**: Test suite runs in seconds

#### Test Mode

**Isolated Testing:**
```bash
# Use test database
TODO_DB_PATH=:memory: todo task create "Test"
TODO_TEST_MODE=true todo task create "Test"

# Dry-run mode
todo task delete <id> --dry-run
Would delete task: abc123 (title: "Old task")
```

#### Fixtures & Mocking

**Test Data:**
```bash
# Load fixtures
todo fixtures load --file test-data.json

# Generate test data
todo fixtures generate --tasks 100 --relationships 50

# Clear test data
todo fixtures clear
```

#### Contract Testing

**API Contracts:**
```typescript
// Test CLI contract
describe('task create', () => {
  it('returns JSON with task ID', async () => {
    const output = await cli('task create "Test" --format json');
    const result = JSON.parse(output);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('title', 'Test');
    expect(result).toHaveProperty('status', 'pending');
  });

  it('validates required fields', async () => {
    const result = await cli('task create "" --format json');

    expect(result.error.code).toBe('E_VALIDATION');
    expect(result.error.field).toBe('title');
  });
});
```

### 9. Extensibility & Plugins

#### Principles
- **Pluggable**: Core functionality extensible via plugins
- **Isolated**: Plugins can't break core
- **Discoverable**: Plugins auto-discovered
- **Documented**: Plugin API well-defined

#### Plugin System

**Plugin Structure:**
```typescript
// plugins/my-plugin/index.ts
export default {
  name: 'my-plugin',
  version: '1.0.0',

  commands: [
    {
      name: 'custom-command',
      description: 'My custom command',
      handler: async (args) => {
        // Implementation
      }
    }
  ],

  hooks: {
    'task:created': async (task) => {
      // React to events
    }
  }
};
```

**Plugin Management:**
```bash
# Install plugin
todo plugin install my-plugin

# List plugins
todo plugin list
Installed plugins:
- my-plugin (v1.0.0)
- another-plugin (v2.1.0)

# Use plugin command
todo custom-command --arg value
```

#### Hooks & Events

**Event System:**
```typescript
// Subscribe to events
todo.on('task:created', (task) => {
  console.log('Task created:', task.id);
});

// Emit events
await todo.emit('task:updated', { id, changes });
```

**CLI Hooks:**
```bash
# Configure hooks
todo hook add pre-commit "todo validate"
todo hook add post-update "todo backup create"

# Execute hooks
todo hook run pre-commit
```

### 10. Documentation & Help

#### Principles
- **Self-Documenting**: Help always available
- **Contextual**: Help relevant to current command
- **Explorable**: Easy to discover features
- **Example-Rich**: Practical examples provided

#### Built-in Help

**Help System:**
```bash
# Global help
todo --help
todo -h

# Command help
todo task --help
todo task create --help

# Format options
todo task --help --format json
todo task --help --format markdown
```

#### Examples & Recipes

**Common Workflows:**
```bash
# Show examples
todo task create --examples
Examples:
  # Create simple task
  $ todo task create "Write documentation"

  # Create with metadata
  $ todo task create "Deploy app" --priority 5 --category work

  # Create from JSON
  $ echo '{"title":"Test","priority":3}' | todo task create --from-json
```

#### Interactive Mode

**Guided Experience:**
```bash
# Interactive task creation
todo task create --interactive
? Title: Write documentation
? Priority (1-5): 3
? Category: work
✓ Task created: abc123

# AI-assisted
todo task create --ai-assist
AI: Based on your input "doc", did you mean:
1. Write documentation
2. Create API docs
3. Update README
Choose (1-3):
```

---

## Development Workflow

### Pre-commit Hooks (Mandatory)
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ]
  }
}
```

### Pre-commit Checklist
- Linting passes (ESLint)
- Formatting passes (Prettier)
- Type checking passes (tsc --noEmit)
- Tests pass (vitest)
- Coverage threshold met
- No console.log statements
- No TODO comments without issue number

### Git Workflow
- Branches: main (production), develop (integration)
- Commits: Conventional Commits format
- Format: `type(scope): description` followed by optional body and footer
- Types: feat, fix, docs, style, refactor, test, chore
- Atomic commits: One logical change per commit

Example commit message:
```
feat(tasks): add visual task board component

Implemented drag-and-drop canvas for task organization.
Uses React and Canvas API for rendering.

Task: 1.2.3
Coverage: 85%
```

### Debug Mode
- All services support DEBUG=true environment variable
- Verbose logging enabled
- Performance timing included
- Request/response logging

---

## Security

### Input Validation
- Validate all user input at entry points
- Use schema validation (Zod, io-ts)
- Sanitize for display (prevent XSS)
- Parameterized queries (prevent SQL injection)

### Dependency Management
- Regular security audits (npm audit)
- Automated updates (Dependabot)
- Minimal dependencies (avoid bloat)
- Vet dependencies before adding

### Secrets Management
- Never commit secrets to git
- Use environment variables
- .env in .gitignore
- Document required env vars in .env.example

---

## Monitoring and Observability

### Logging Levels
- DEBUG: Verbose, development only
- INFO: Important business events (task created, etc.)
- WARN: Recoverable errors, degraded functionality
- ERROR: Unrecoverable errors requiring attention

### Metrics to Track
- Task operation latency
- Error rates by type
- CLI command usage
- Web UI page views
- Bundle size over time

### Health Checks
- Database connectivity
- File system access
- Memory usage
- Startup time

---

## Deployment Strategy

### CLI Package
- Publish to npm registry
- Semantic versioning (semver)
- Changelog maintained
- Installation: npm install -g todo-visual-thinker

### Web Application
- Static site deployment
- Environment-based builds (dev, staging, prod)
- CDN for assets
- Lighthouse score greater than 90 (performance, accessibility, best practices)

---

## Future Technical Considerations

### Scalability (When Needed)
- Server-side rendering for SEO
- GraphQL API for efficient data fetching
- WebSocket for real-time collaboration
- Horizontal scaling with load balancer

### Advanced Features (Post-v1.0)
- Offline-first with service workers
- Optimistic UI updates
- Conflict resolution for sync
- Plugin architecture for extensibility

---

## Developer Experience (DX) for Rapid Iteration

### Philosophy: Extreme Feedback Loops

For autonomous development and extreme iteration frequency, we optimize for:
- **Instant feedback**: Changes visible in less than 100ms
- **Zero friction**: No manual steps between code change and test
- **Autonomous operation**: AI agents can develop without manual intervention
- **Local-first**: Full development offline, no cloud dependencies

### Modern Tooling Stack (2025)

#### Build System: Vite 6+

**Why Vite:**
- HMR updates in 47ms (68x faster than Webpack)
- Instant server start regardless of project size
- Only changed modules reload, preserving application state
- Native ESM for development, optimized bundles for production

**Performance Targets:**
- Cold start: Less than 500ms
- HMR update: Less than 50ms
- Production build: Less than 30s

#### TypeScript 7.0: Native Performance

**Revolutionary Improvements:**
- 10x speedup over TypeScript 6.0 (native Go rewrite)
- Multi-threaded builds on single projects
- Parallel builds across multiple projects
- Incremental compilation with smart caching

**Impact:**
- Type checking during development: Near-instant
- Full project build: Seconds, not minutes
- CI/CD pipeline: Dramatically faster

#### BiomeJS: Unified Toolchain

**Replaces ESLint + Prettier:**
- 100x faster than ESLint (Rust-based)
- Unified linting and formatting
- Single configuration file
- Multi-threaded architecture

**Developer Experience:**
- Instant feedback on save
- No configuration complexity
- Works out of the box

#### Vitest: Lightning-Fast Testing

**Why Vitest:**
- Instant test startup (uses Vite)
- Watch mode with HMR for tests
- Compatible with Jest API
- Built-in TypeScript support

**Test Execution:**
- Unit tests: Less than 1ms each
- Full test suite: Less than 5s
- Watch mode: Instant re-run on change

### Autonomous Development Tools

#### AI-Powered Development

**Claude Code Integration:**
- Autonomous feature implementation
- Multi-file changes with context awareness
- Automated commit messages
- Built-in quality gates

**Agent Mode Capabilities:**
- Execute multi-step tasks independently
- Terminal command execution
- Version control automation
- Self-testing and validation

**Productivity Gains:**
- 30-55% faster development (2025 research)
- Reduced context switching
- Automated repetitive tasks
- Consistent code quality

#### Automated Version Control

**Git Automation:**
- Automatic commits on successful builds
- Semantic commit messages (auto-generated)
- Branch management via CLI
- Pre-commit hooks run automatically

**Commit Format (Auto-generated):**
```
feat(tasks): add visual task board component

Implemented infinite canvas with drag-and-drop.
Uses React and Konva.js for rendering.

- Added TaskBoard component
- Implemented drag handlers
- Added zoom/pan controls

Task: 1.2.3
Coverage: 87%
Tests: 23 passed

🤖 Generated with Claude Code
```

### Local Development Environment

#### Instant Feedback Loop

**Development Server:**
- Vite dev server with HMR
- Auto-restart on config changes
- Error overlay in browser
- Source maps for debugging

**File Watching:**
- TypeScript compiler in watch mode
- Test runner in watch mode
- Linter in watch mode
- All running in parallel

**Terminal Dashboard:**
```
┌─ TypeScript ────────────────┐  ┌─ Tests ─────────────────────┐
│ ✓ No errors                  │  │ ✓ 156 passed                │
│ ⏱ 234ms                      │  │ ⏱ 3.2s                      │
└──────────────────────────────┘  └──────────────────────────────┘
┌─ Lint ──────────────────────┐  ┌─ Dev Server ────────────────┐
│ ✓ No issues                  │  │ ✓ Ready                     │
│ ⏱ 89ms                       │  │ 🌐 http://localhost:5173    │
└──────────────────────────────┘  └──────────────────────────────┘
```

#### Ephemeral Test Environments

**Fast Environment Spin-up:**
- In-memory SQLite for tests
- Mock file system for CLI tests
- Parallel test execution
- Automatic cleanup

**Docker for Integration Tests:**
```yaml
# docker-compose.test.yml
services:
  test-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: test
    tmpfs: /var/lib/postgresql/data  # In-memory, fast
```

**Skaffold for Kubernetes (Future):**
- Automated build-deploy-test cycle
- Hot reload in cluster
- Local and remote dev parity

### Development Workflow Optimization

#### Pre-commit Automation

**Fast Pre-commit Hooks:**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "biome check --write",           // Format + lint (100x faster)
      "vitest related --run --silent"  // Only test affected
    ]
  }
}
```

**Parallel Execution:**
- Lint, format, type-check in parallel
- Only test files affected by changes
- Skip tests if no logic changes

#### CI/CD Pipeline (GitHub Actions)

**Optimized Pipeline:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1  # Faster than npm/pnpm

      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}

      - run: bun install --frozen-lockfile

      # Parallel execution
      - name: Quality Gates
        run: |
          bun run typecheck &
          bun run lint &
          bun run test:coverage &
          wait

      - name: Build
        run: bun run build
```

**Pipeline Performance:**
- Dependency install: Less than 30s (cached: Less than 5s)
- Quality gates: Less than 2min (parallel)
- Build: Less than 1min
- Total: Less than 4min (cold), Less than 2min (cached)

### Monitoring and Observability

#### Development Metrics Dashboard

**Track DX Core 4:**
- **Speed**: Build time, HMR time, test time
- **Effectiveness**: Features completed per day
- **Quality**: Test coverage, bug rate
- **Impact**: User value delivered

**Tools:**
- Grafana for metrics visualization
- Custom scripts to track build times
- GitHub Actions insights

#### Real-time Performance Monitoring

**Bundle Analysis:**
- Automatic bundle size checks
- Performance budget enforcement
- Dependency size tracking

**Runtime Monitoring:**
- Lighthouse CI for web vitals
- Memory profiling in development
- Performance regression alerts

### Developer Ergonomics

#### IDE Integration

**VS Code Extensions (Required):**
- Biome (linting + formatting)
- TypeScript + JavaScript
- Vitest Test Explorer
- Error Lens (inline errors)
- GitLens (git context)

**Settings Sync:**
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.fixAll": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

#### CLI Developer Tools

**Task Runner (package.json):**
```json
{
  "scripts": {
    "dev": "vite",
    "dev:cli": "tsx watch src/cli/index.ts",
    "dev:all": "concurrently \"bun dev\" \"bun dev:cli\"",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "build": "tsc && vite build",
    "build:cli": "tsup src/cli/index.ts --format cjs,esm",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "validate": "bun run typecheck && bun run lint && bun run test"
  }
}
```

**Fast Task Execution:**
- `bun run dev` - Start dev server (500ms)
- `bun run test` - Run tests (instant)
- `bun run validate` - Full check (less than 10s)

### Autonomous Development Integration

#### Agent-Friendly APIs

**Structured Output:**
```bash
# All commands support --json flag
todo task list --json
# {"tasks": [...], "count": 5, "status": "success"}

todo task create --json "New task"
# {"id": "abc123", "title": "New task", "created": "2025-..."}
```

**Machine-Readable Errors:**
```json
{
  "error": "VALIDATION_ERROR",
  "code": "INVALID_TASK_TITLE",
  "message": "Task title must be 1-200 characters",
  "context": {
    "field": "title",
    "value": "",
    "constraint": "minLength: 1"
  }
}
```

#### Self-Healing Development

**Automatic Error Recovery:**
- Type errors: Auto-fix imports
- Lint errors: Auto-fix on save
- Test failures: Re-run with debug
- Build errors: Clear cache, retry

**Health Checks:**
```bash
# Self-diagnostic command
todo doctor

✓ TypeScript compiler working
✓ Dependencies up to date
✓ Database accessible
✓ Tests passing
⚠ Bundle size over budget (action: run `bun analyze`)
```

### Performance Budgets

**Enforced Limits:**
- CLI startup: Less than 300ms
- CLI command execution: Less than 100ms
- Web bundle size: Less than 200KB (gzipped)
- Test suite: Less than 10s
- Type check: Less than 5s
- Build: Less than 60s

**Automated Enforcement:**
```json
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 200  // Fail build if exceeded
  }
}
```

---

## Autonomous Development Process

### Required Files for Autonomous Development
```
project/
├── .spec-workflow/
│   ├── steering/                # Vision & architecture
│   │   ├── product.md           # ✓ Created
│   │   ├── tech.md              # ✓ Created (this file)
│   │   └── design.md            # ✓ Created
│   │
│   └── specs/                   # Feature specs (generated)
│       └── [feature]/
│           └── tasks.md         # Task tracking
│
├── scripts/
│   └── autonomous-dev.sh        # Automation runner
│
└── .github/
    └── workflows/
        └── autonomous-dev.yml   # CI for autonomous dev
```

### Task Tracking Format (tasks.md)
```markdown
# Tasks

## Pending
- [ ] 1. Setup project structure
- [ ] 2. Implement core domain models
- [ ] 3. Build CLI interface

## In Progress
- [-] 4. Create SQLite repository adapter

## Completed
- [x] 0. Initialize project
```

### Autonomous Development Prompt Template
```markdown
# Autonomous Development Session

## Your Mission
Implement features for "Todo for Visual Thinker" by following this process:

1. **Read Steering Documents**
   - .spec-workflow/steering/product.md
   - .spec-workflow/steering/tech.md
   - .spec-workflow/steering/design.md

2. **Check Current Tasks**
   - Read tasks.md in current spec
   - If tasks exist → Implement next task
   - If all complete → Analyze gaps vs steering docs

3. **Implementation Standards**
   - Follow tech.md architecture patterns
   - Maintain code quality metrics (500 lines/file, 50 lines/function, 80% coverage)
   - Run quality gates before committing
   - Write structured commit messages

4. **Quality Gates (Must Pass)**
   - [ ] ESLint passes
   - [ ] Prettier passes
   - [ ] TypeScript compiles
   - [ ] Tests pass
   - [ ] Coverage ≥80%

5. **Commit When**
   - Single atomic task complete
   - All quality gates pass
   - Tests written and passing

6. **Escalate When**
   - Quality gates fail 3x
   - Unclear requirement
   - Architectural decision needed
   - External dependency issue

## Current Context
- Project: Todo for Visual Thinker
- Phase: [MVP/Enhancement/etc]
- Current Iteration: [N]
- Max Iterations: 50

## Exit Codes
- 0: Success, continue
- 99: Project complete, ready for UAT
- 1: Error, escalate to human
- 2: Checkpoint reached, request review
```

---

## Versioning Strategy

### Semantic Versioning (semver)
- **Major**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **Minor**: New features, backward compatible (e.g., 1.0.0 → 1.1.0)
- **Patch**: Bug fixes (e.g., 1.0.0 → 1.0.1)

### Version Milestones
- `0.1.0`: Initial CLI working
- `0.2.0`: Web UI basic functionality
- `0.3.0`: Visual canvas with drag-drop
- `1.0.0`: MVP feature complete (all Phase 1 features)
- `1.1.0`: Phase 2 features
- `2.0.0`: Multi-user support (breaking change)

---

## Documentation Standards

### Code Comments
- Avoid comments explaining "what" (code should be self-documenting)
- Use comments for "why" decisions were made
- JSDoc for public APIs
- No commented-out code (use git history)

### README.md Sections
1. Project overview
2. Features
3. Installation
4. Quick start
5. CLI usage
6. Development setup
7. Contributing
8. License

### API Documentation
- Auto-generated from JSDoc comments
- Examples for each CLI command
- Type definitions for all public APIs

---

## Development Tools

### Recommended VS Code Extensions
- `dbaeumer.vscode-eslint`: ESLint integration
- `esbenp.prettier-vscode`: Prettier integration
- `vitest.explorer`: Vitest test runner
- `ms-playwright.playwright`: Playwright test runner
- `bradlc.vscode-tailwindcss`: Tailwind CSS IntelliSense
- `YoavBls.pretty-ts-errors`: Better TypeScript errors

### CLI Commands
```bash
# Development
pnpm dev             # Start dev server (web)
pnpm dev:cli         # Run CLI in watch mode
pnpm build           # Build for production
pnpm test            # Run all tests
pnpm test:watch      # Run tests in watch mode
pnpm test:coverage   # Generate coverage report
pnpm lint            # Run ESLint
pnpm format          # Run Prettier
pnpm typecheck       # Run TypeScript compiler check

# CLI Usage
pnpm cli task create "My task"
pnpm cli task list --json
pnpm cli status
```

---

## Decision Records

### ADR-001: Why CLI-First?
- Context: Need to support AI agents and automation
- Decision: Build CLI as primary interface, GUI as wrapper
- Consequences: More upfront work, but enables automation and better architecture

### ADR-002: Why SQLite for Local Storage?
- Context: Need structured data storage with relations
- Decision: SQLite for local-first, relational data
- Alternatives Considered: JSON files (too simple), IndexedDB (browser-only)
- Consequences: Requires SQLite installation, but provides SQL power

### ADR-003: Why Hexagonal Architecture?
- Context: Need testable, maintainable codebase
- Decision: Ports and Adapters pattern
- Consequences: More boilerplate, but excellent testability and flexibility

### ADR-004: Why React Over Vue/Svelte?
- Context: Need mature ecosystem for visual canvas interactions
- Decision: React 18+ with TypeScript
- Alternatives: Vue (smaller ecosystem for canvas), Svelte (less mature)
- Consequences: Larger bundle, but better tooling and libraries

### ADR-005: Why Vite Over Webpack/Turbopack?
- Context: Need instant feedback for rapid iteration
- Decision: Vite 6+ for development and builds
- Alternatives: Webpack (too slow), Turbopack (Next.js only)
- Consequences: 47ms HMR vs 3s, dramatically better DX
- Impact: Enables autonomous development with instant feedback

### ADR-006: Why BiomeJS Over ESLint + Prettier?
- Context: Need fast, unified linting and formatting
- Decision: BiomeJS for 100x faster performance
- Alternatives: ESLint + Prettier (slow, complex config)
- Consequences: Simpler toolchain, instant feedback
- Impact: Pre-commit hooks run in milliseconds, not seconds

### ADR-007: Why TypeScript 7.0 Native?
- Context: Type checking slowing down development
- Decision: Upgrade to TypeScript 7.0 when released
- Benefits: 10x faster compilation, multi-threaded builds
- Impact: Type checking becomes negligible overhead

---

## Research Sources

This developer experience strategy is informed by 2025 research:

**DX Trends:**
- [Top 10 Developer Experience Tools 2025](https://www.port.io/blog/top-developer-experience-tools)
- [DX Core 4 Framework](https://www.infoq.com/news/2025/01/dx-core-4-framework/)
- [JetBrains State of Developer Ecosystem 2025](https://devecosystem-2025.jetbrains.com/productivity)
- [Top 15 Developer Experience Tools](https://linearb.io/blog/developer-experience-tools)

**Build Tools:**
- [Vite vs Turbopack 2025](https://dev.to/vishwark/vite-vs-turbopack-the-present-future-of-frontend-build-tools-2025-edition-1iom)
- [Vite 6 + Vue 4 Stack](https://metadesignsolutions.com/vite-6-vue-4-the-ultimate-stack-for-lightningfast-apps-in-2025/)
- [Frontend Build Tools Comparison](https://www.meerako.com/blogs/frontend-build-tools-vite-vs-webpack-turbopack-comparison)

**TypeScript Performance:**
- [A 10x Faster TypeScript](https://devblogs.microsoft.com/typescript/typescript-native-port/)
- [Progress on TypeScript 7](https://devblogs.microsoft.com/typescript/progress-on-typescript-7-december-2025/)
- [JavaScript & TypeScript in 2025](https://mysticmatrix.tech/javascript-typescript-in-2025/)

**Autonomous Coding:**
- [Best AI Coding Tools 2025](https://www.pragmaticcoders.com/resources/ai-developer-tools)
- [Top 8 Autonomous Coding Solutions](https://zencoder.ai/blog/best-autonomous-coding-solutions)
- [AI Coding Assistants December 2025](https://www.shakudo.io/blog/best-ai-coding-assistants)

**Local Development:**
- [Code Faster with Tuned Dev Environment](https://speedscale.com/blog/local-development-environments/)
- [Dev, Test, Prod Best Practices 2025](https://www.bunnyshell.com/blog/best-practices-for-dev-qa-and-production-environments/)
- [Rapid Application Development 2025](https://quixy.com/blog/rapid-application-development/)
