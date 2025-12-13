# Tests

Test suite for the application.

## Structure

- `unit/` - Unit tests (isolated, mocked dependencies)
- `integration/` - Integration tests (real dependencies)

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch

# UI mode
pnpm test:ui
```

## Coverage Requirements

- Minimum 80% overall coverage
- 90%+ for critical paths
