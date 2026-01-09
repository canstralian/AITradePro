# Testing Guide

This document provides comprehensive testing guidelines for the AI Trading Platform.

## 🧪 Test Framework

We use **Vitest** as our primary testing framework, chosen for its:

- Native TypeScript support
- Fast execution with ES modules
- Built-in coverage reporting
- Excellent developer experience

## 📁 Test Structure

```
├── client/src/test/
│   ├── setup.ts                 # Test configuration
│   └── components/              # React component tests
│       └── AIInsights.test.tsx
├── server/test/                 # Backend service tests
│   └── storage.test.ts
└── vitest.config.ts            # Test configuration
```

## 🚀 Running Tests

### Basic Commands

```bash
# Run tests in watch mode
npm test

# Run all tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI dashboard
npm run test:ui
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- `coverage/index.html` - Visual coverage report
- `coverage/coverage-final.json` - JSON coverage data

## ✍️ Writing Tests

### React Component Tests

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Backend Service Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyService } from '../services/MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('performs expected operation', async () => {
    const result = await service.doSomething();
    expect(result).toBeDefined();
  });
});
```

### Mock Guidelines

- Mock external dependencies (APIs, databases)
- Use `vi.fn()` for function mocking
- Mock WebSocket connections in component tests
- Avoid mocking internal business logic

## 📊 Coverage Requirements

- **Minimum Coverage**: 70% overall
- **Critical Components**: 90%+ coverage
- **Exclusions**: Test files, config files, type definitions

### Coverage Targets by Area

| Area               | Target | Priority |
| ------------------ | ------ | -------- |
| Storage Layer      | 90%    | High     |
| AI Services        | 85%    | High     |
| React Components   | 80%    | Medium   |
| API Routes         | 85%    | High     |
| WebSocket Handlers | 75%    | Medium   |

## 🔄 Continuous Integration

### GitHub Actions Pipeline

Our CI pipeline runs on every push and PR:

1. **YAML Lint**: Workflow configuration validation
2. **Lint Check**: ESLint code quality validation
3. **Type Check**: TypeScript compilation and type safety
4. **Unit Tests**: Full test suite execution on Node.js matrix
5. **Integration Tests**: SQLite and PostgreSQL database testing
6. **Coverage Report**: Multi-source coverage analysis and upload
7. **Security Audit**: npm dependency vulnerability scanning

For detailed information about CI/CD workflows, troubleshooting, and YAML configuration guidelines, see [CI/CD Workflows Documentation](docs/CI_CD_WORKFLOWS.md).

### Pre-commit Hooks

Husky runs these checks before each commit:

- Code formatting (Prettier)
- Linting (ESLint)
- Type checking (TypeScript)

## 🧩 Test Categories

### Unit Tests

- Individual function/component testing
- Isolated business logic validation
- Fast execution (<100ms per test)

### Integration Tests

- API endpoint testing
- Database interaction testing
- Service integration validation

### Component Tests

- React component rendering
- User interaction simulation
- Props and state validation

## 📝 Best Practices

### Test Organization

```typescript
describe('ComponentName', () => {
  describe('when condition', () => {
    it('should do expected behavior', () => {
      // Test implementation
    });
  });
});
```

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Descriptive test names explaining behavior
- Group related tests with `describe` blocks

### Test Data

- Use realistic test data
- Create reusable mock data factories
- Avoid hardcoded values when possible

### Assertions

```typescript
// Good - specific assertions
expect(result.status).toBe('success');
expect(result.data).toHaveLength(3);
expect(result.timestamp).toBeInstanceOf(Date);

// Avoid - vague assertions
expect(result).toBeTruthy();
expect(result).toEqual(expect.anything());
```

## 🔧 Debugging Tests

### Common Issues

1. **Module Resolution**: Ensure import paths match project structure
2. **Async Operations**: Use `await` for async operations in tests
3. **Mock Cleanup**: Reset mocks between tests with `beforeEach`
4. **DOM Cleanup**: React Testing Library auto-cleans DOM

### Debug Tools

```bash
# Run specific test file
npx vitest run path/to/test.ts

# Debug mode with console output
npx vitest run --reporter=verbose

# Run tests matching pattern
npx vitest run --grep "pattern"
```

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🎯 Test Checklist

Before submitting a PR, ensure:

- [ ] All tests pass locally
- [ ] New features include tests
- [ ] Coverage meets minimum requirements
- [ ] No console errors in test output
- [ ] Tests follow naming conventions
- [ ] Mock data is realistic and relevant
