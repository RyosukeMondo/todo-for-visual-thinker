# Design Document

## Overview
The MVP foundation delivers the baseline task lifecycle, CLI automation pathways, and visual canvas experience that every later feature relies on. The design keeps business logic in the `src/core` domain/use-case layer, exposes it through CLI commands (automation-first), and renders the state through the existing React infinite canvas (`TaskBoard`, `TaskCard`, minimap, filters). SQLite—via `better-sqlite3` adapters—persists all spatial/task metadata so that both CLI and UI can restore identical board state across sessions. Relationships, categories, and task filters share the same core data contracts to avoid divergent representations.

## Steering Document Alignment

### Technical Standards (tech.md)
- **Hexagonal architecture**: Continue routing CLI + React UIs through `@core/usecases` and `@core/ports`, with adapters (`SQLite*Repository`, `ConsoleJsonLogger`) injected via `src/cli/runtime.ts` and React hooks in `src/web/hooks`.
- **Type-safe + DI-first**: All services remain typed (TypeScript strict mode) and accept repositories/logger interfaces in their constructors. We reuse the `TodoRepository`, `RelationshipRepository`, and `CategoryRepository` contracts already defined in `src/core/ports`.
- **Performance budgets**: CLI commands must complete in <50ms, React canvas renders stay under 500ms for 100 tasks, and SQLite queries stay within the `ListTodos` pagination defaults (limit 500) described in tech.md.
- **Quality gates**: Maintain existing Vitest suites under `tests/` plus the `src/web` Testing Library specs to keep ≥80% coverage of domain logic and ≥90% on `create/update` flows per steering expectations.

### Project Structure (structure.md)
- Follow the structure documented in `tech.md` (Project Structure section) because a dedicated `structure.md` was not provided. Artifacts continue to live in `src/core` (domain/usecases/adapters), `src/cli` (Commander commands + runtime), `src/web` (React canvas + hooks/stores), `tests/` (unit/integration), and `.spec-workflow/specs/mvp-foundation` for specs.
- New files will slot into existing directories: CLI interaction stays in `src/cli/commands`, canvas behavior in `src/web/components`/`hooks`, persistence in `src/core/adapters`, and shared DTOs/types in `src/shared`.

## Code Reuse Analysis
We already have strong primitives to satisfy requirements. The design leans on them instead of rewriting functionality.

- **Domain**: `Todo`, `Relationship`, and `Category` entities already enforce validation rules (length, hex colors, dependency types). They remain the single source of truth.
- **Repositories**: `SQLiteTodoRepository`, `SQLiteRelationshipRepository`, and `SQLiteCategoryRepository` offer schema creation, filtering, and bulk delete; we reuse them for persistence.
- **Use cases**: `CreateTodo`, `UpdateTodo`, `ListTodos`, relationship/category use cases, and `GetBoardSnapshot` expose the necessary orchestration for CLI and UI.
- **CLI**: Commands under `src/cli/commands` (e.g., `addTodo.ts`, `listTodos.ts`, `updateTodo.ts`) already parse args and output JSON; enhancements will extend these commands instead of creating new binaries.
- **Web UI**: Canvas-related components (`TaskBoard.tsx`, `TaskBoardCanvas.tsx`, `TaskBoardMinimap.tsx`, `TaskCard.tsx`, `TaskFilters.tsx`) plus hooks (`useTodos`, `useBoardViewport`) provide zoom/pan/drag behavior and will be extended to meet animation + filtering requirements.

### Existing Components to Leverage
- **`Todo` entity (`src/core/domain/Todo.ts`)**: Already models coordinates, colors, icons, and timestamps—no new entity required.
- **`GetBoardSnapshot` use case**: Provides aggregated data for UI metrics panels (`TaskMetricsPanel.tsx`), so the canvas can derive dependency health and filters.
- **`TaskBoard` component suite**: Implements infinite canvas controls, minimap, and connection drawing via `TaskBoard.connections.ts`. We'll extend the animation + persistence hooks using these files.
- **CLI serialization helpers (`src/cli/serializers.ts`)**: Keep JSON structure consistent for automation consumers when new fields (icon, category) surface.

### Integration Points
- **SQLite storage**: All task/relationship operations continue using the SQLite repositories; migrations stay co-located with adapters.
- **Commander CLI runtime**: `src/cli/program.ts` remains the entry point and wires CLI commands to use cases.
- **React canvas**: Hooks in `src/web/hooks` (e.g., `useBoardState`) subscribe to store changes and trigger persistence writes via use cases exposed through a shared API context.

## Architecture
Business logic sits in the core layer, fronted by CLI and React. Repositories adapt SQLite; no UI directly touches SQLite.

```mermaid
graph TD
    CLI[CLI Commands] --> UC[Use Cases]
    Web[React Canvas + Hooks] --> UC
    UC --> Ports[Ports (Todo/Relationship/Category Repos)]
    Ports --> SQLite[(SQLite DB via better-sqlite3)]
    UC --> Logger[ConsoleJsonLogger]
```

### Modular Design Principles
- **Single File Responsibility**: Keep CLI commands <200 lines focusing on parsing and delegating to use cases; React components remain presentational while hooks manage state.
- **Component Isolation**: Canvas controls (`TaskBoardCanvas`, `TaskBoardMinimap`, `TaskBoardHeader`) remain isolated to avoid monolithic files.
- **Service Layer Separation**: `@core/usecases` mediate all writes/reads; UI and CLI never call repositories directly.
- **Utility Modularity**: Shared helpers like `TaskBoard.viewport.ts` and CLI serializers remain small, composable utilities.

## Components and Interfaces

### 1. Core Task Lifecycle Service
- **Purpose:** Coordinate creation, updates (status, position, color, icon), and deletion for todos + relationships through use cases.
- **Interfaces:** `CreateTodo.execute(input)`, `UpdateTodo.execute({ id, patch })`, `ListTodos.execute(query)`, `CreateRelationship.execute`, etc.
- **Dependencies:** `TodoRepository`, `RelationshipRepository`, `Logger`.
- **Reuses:** Domain entities for validation; existing SQLite repositories for persistence.

### 2. CLI Interaction Layer
- **Purpose:** Provide automation-friendly commands with JSON output fulfilling Requirement 2.
- **Interfaces:** Commander commands (`addTodo`, `listTodos`, `updateTodo`, `addRelationship`, etc.) each exposing `--json` and `--pretty` flags, plus shared option builders in `todoQueryOptions.ts`.
- **Dependencies:** Use case services injected via `src/cli/runtime.ts`, CLI serialization utilities, Node stdout/stderr.
- **Reuses:** Shared serializer + validation pipelines, `ConsoleJsonLogger` for structured logs.

### 3. Canvas Interaction Engine
- **Purpose:** Render the infinite canvas, handle drag/zoom/pan, show relationships, respect filters, and trigger persistence.
- **Interfaces:**
  - Hooks: `useBoardViewport()` (pan/zoom state), `useTodos()` (subscribe to store), `useRelationships()`.
  - Components: `TaskBoardCanvas` (SVG/canvas layer), `TaskBoard.connections.ts` (Bezier path generation), `TaskCard` (visual states), `TaskBoardMinimap`.
- **Dependencies:** Zustand (or current store), React DnD/pointer handlers, animation utilities, `ListTodos`/`ListRelationships` for data.
- **Reuses:** Current `TaskBoard` component tree, `TaskBoard.constants.ts` for zoom thresholds, `TaskBoard.viewport.ts` for viewport math.

### 4. Relationship & Filter Orchestrator
- **Purpose:** Manage dependency graph (detect cycles, block invalid connects) and filtering for categories/status.
- **Interfaces:**
  - Use cases: `CreateRelationship`, `UpdateRelationship`, `DeleteRelationship`.
  - UI: `TaskFilters` component, `DependencyHealthPanel`, `TaskHierarchyPanel`.
- **Dependencies:** Relationship repository, `GetBoardSnapshot` for aggregated visibility, `TaskBoard.connections.ts` for rendering.
- **Reuses:** Relationship domain entity validations, existing dependency metrics panels.

## Data Models

### TodoRecord
```
type TodoRecord = {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 1 | 2 | 3 | 4 | 5
  category?: string
  color: `#${string}`
  icon?: string
  position: { x: number; y: number }
  createdAt: number
  updatedAt: number
  completedAt?: number
}
```

### RelationshipRecord
```
type RelationshipRecord = {
  id: string
  fromId: string
  toId: string
  type: 'depends_on' | 'blocks' | 'related_to' | 'parent_of'
  description?: string
  createdAt: number
  updatedAt: number
}
```

### CategoryRecord
```
type CategoryRecord = {
  id: string
  name: string
  color: `#${string}`
  icon?: string
  createdAt: number
}
```

### ViewportState
```
type ViewportState = {
  zoom: number // 0.25 - 4 range
  offset: { x: number; y: number }
  snapToGrid: boolean
  filters: {
    status?: TodoStatus[]
    categories?: string[]
    search?: string
  }
}
```

### CliResponse<T>
```
type CliResponse<T> = {
  status: 'success' | 'error'
  data?: T
  error?: { code: string; message: string; context?: Record<string, unknown> }
}
```

## Error Handling

### Scenario 1: Validation or constraint violations
- **Handling:** Domain entities throw `ValidationError`; CLI catches and serializes with code/context; React surfaces inline toasts.
- **User Impact:** CLI exits 1 with machine-readable JSON; UI highlights invalid fields and keeps optimistic state rolled back.

### Scenario 2: Relationship cycle attempts
- **Handling:** Use case performs DFS against existing `ListRelationships` output before saving. On detection, throw `DomainError` with `CYCLE_DETECTED` code.
- **User Impact:** CLI surfaces descriptive error; UI shows toast plus highlights involved tasks without mutating canvas.

### Scenario 3: Persistence or SQLite failures
- **Handling:** Repository operations wrapped in try/catch to emit `RepositoryError` plus context; CLI logs actionable hints; UI toggles offline/degraded banner and retries via exponential backoff.
- **User Impact:** Users see fail-fast messaging (e.g., “Unable to save task, please retry”) while state remains consistent (no optimistic commit).

## Testing Strategy

### Unit Testing
- Domain entities (`Todo`, `Relationship`, `Category`) already have coverage; extend tests for new behaviors (icon validation, coordinate constraints, cycle detection) inside `tests/unit/core`.
- CLI command option parsing and serializers validated with Vitest + mocks for repositories to guarantee JSON schema compatibility.

### Integration Testing
- Use `tests/integration` with an in-memory SQLite database (via temporary file) to validate CLI → use case → repository flows for CRUD and relationship creation.
- React hooks/components tested via Testing Library to ensure drag/zoom updates coordinates, filters hide/show nodes, and animation toggles respect reduced-motion settings.

### End-to-End Testing
- Playwright-style flows cover: create/update/complete tasks via UI, persistence across reloads, dependency creation and cycle rejection, category filter toggling, CLI commands invoked via spawned process (snapshot tests on JSON output).
- Include accessibility checks (axe) on the canvas and keyboard navigation across task cards.
