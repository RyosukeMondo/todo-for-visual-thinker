# MVP Foundation Tasks

Phase 1 implementation tasks for Todo for Visual Thinker.

## 1. Core Domain Models

- [ ] 1.1 Create Todo entity with visual properties (id, title, color, icon, status, priority, createdAt, updatedAt)
- [ ] 1.2 Create TodoRepository port interface
- [ ] 1.3 Implement SQLite adapter for TodoRepository
- [ ] 1.4 Write unit tests for domain models (≥90% coverage)
- [ ] 1.5 Write integration tests for repository adapter

## 2. Use Cases

- [ ] 2.1 Implement CreateTodo use case with validation
- [ ] 2.2 Implement ListTodos use case with sorting/filtering
- [ ] 2.3 Implement UpdateTodo use case
- [ ] 2.4 Implement DeleteTodo use case
- [ ] 2.5 Write unit tests for all use cases (≥90% coverage)

## 3. CLI Interface

- [ ] 3.1 Implement 'add' command with color and icon selection
- [ ] 3.2 Implement 'list' command with visual formatting
- [ ] 3.3 Implement 'update' command
- [ ] 3.4 Implement 'delete' command
- [ ] 3.5 Add error handling and user feedback
- [ ] 3.6 Write integration tests for CLI commands

## 4. Web UI - Basic Components

- [ ] 4.1 Create TodoCard component with visual styling
- [ ] 4.2 Create TodoList component
- [ ] 4.3 Create AddTodoForm component
- [ ] 4.4 Implement color picker component
- [ ] 4.5 Implement icon selector component
- [ ] 4.6 Write component tests

## 5. Web UI - State Management

- [ ] 5.1 Create useTodos hook
- [ ] 5.2 Implement CRUD operations in hook
- [ ] 5.3 Add optimistic updates
- [ ] 5.4 Add error handling
- [ ] 5.5 Write tests for hooks

## 6. Database Setup

- [ ] 6.1 Create database schema migration script
- [ ] 6.2 Add database initialization logic
- [ ] 6.3 Implement database seeding for development
- [ ] 6.4 Add database backup/restore utilities

## 7. Quality & Documentation

- [ ] 7.1 Ensure all files ≤500 lines
- [ ] 7.2 Ensure all functions ≤50 lines
- [ ] 7.3 Achieve ≥80% test coverage overall
- [ ] 7.4 Add JSDoc comments to public APIs
- [ ] 7.5 Create development setup guide

## Notes

- Follow hexagonal architecture (ports & adapters)
- Use dependency injection for all external dependencies
- Maintain SOLID principles throughout
- Test coverage: ≥80% overall, ≥90% critical paths
