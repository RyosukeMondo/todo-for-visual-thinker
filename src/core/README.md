# Core Module

Core business logic following Hexagonal Architecture (Ports & Adapters).

## Structure

- `domain/` - Domain entities and business rules
- `usecases/` - Application use cases (business operations)
- `ports/` - Interfaces for external dependencies
- `adapters/` - Implementations of ports (repositories, services)

## Principles

- Framework-independent
- Dependency injection
- Testable without external dependencies
