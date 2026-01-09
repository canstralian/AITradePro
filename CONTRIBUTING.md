# Contributing to AITradePro

Thank you for your interest in contributing to AITradePro! This guide will help you understand our development workflow, coding standards, and best practices.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Security Practices](#security-practices)
- [YAML Configuration Management](#yaml-configuration-management)
- [Dependency Management](#dependency-management)
- [CI/CD Pipeline](#cicd-pipeline)
- [Pull Request Process](#pull-request-process)
- [Versioning](#versioning)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, professional, and collaborative.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- Git
- npm or yarn

### Initial Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/AITradePro.git
   cd AITradePro
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/canstralian/AITradePro.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Initialize database**:
   ```bash
   npm run db:push
   ```

7. **Start development server**:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a Feature Branch

```bash
# Update your local repository
git checkout develop
git pull upstream develop

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in small, logical commits
2. Write descriptive commit messages following conventional commits format:
   ```
   type(scope): subject

   body (optional)

   footer (optional)
   ```

   Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

3. Keep commits focused on a single concern
4. Test your changes thoroughly

### Syncing with Upstream

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream changes into your branch
git checkout develop
git merge upstream/develop

# Rebase your feature branch
git checkout feature/your-feature-name
git rebase develop
```

## Coding Standards

### TypeScript/JavaScript

- **Use TypeScript** for all new code
- **Follow ESLint rules** configured in `eslint.config.js`
- **Use Prettier** for code formatting (`npm run format`)
- **Type safety**: Avoid `any` types; use proper type definitions
- **Naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and components
  - `UPPER_SNAKE_CASE` for constants
- **File organization**:
  - One component per file
  - Group related files in directories
  - Use index files for clean imports

### React Components

- Use functional components with hooks
- Implement proper prop types with TypeScript interfaces
- Keep components small and focused
- Extract reusable logic into custom hooks
- Follow the existing component structure in `client/src/components/`

### Backend Services

- Follow service-oriented architecture patterns
- Keep services in `server/services/`
- Use dependency injection where appropriate
- Implement proper error handling
- Use async/await for asynchronous operations

### Comments and Documentation

- Write self-documenting code when possible
- Add comments for complex logic
- Document public APIs with JSDoc
- Update README.md when adding new features
- Keep inline comments concise and meaningful

## Testing Guidelines

### Test Requirements

- **All new features must include tests**
- **Maintain or improve code coverage** (minimum 70%)
- **Test edge cases and error conditions**

### Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm run test:run

# Generate coverage report
npm run test:coverage

# Open test UI
npm run test:ui
```

### Writing Tests

#### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly with props', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

#### Service Tests

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

### Test Organization

- Place tests next to the code they test
- Use descriptive test names
- Group related tests with `describe` blocks
- Clean up resources in `afterEach` hooks

## Security Practices

### Handling Sensitive Data

**NEVER commit sensitive data to the repository!**

#### Environment Variables

- **Always use `.env` files** for sensitive configuration
- **Never commit `.env` files** (they're in `.gitignore`)
- **Use `.env.example`** as a template showing required variables without values
- **Document all required environment variables** in README.md

Example `.env` structure:
```bash
# Database Configuration
DATABASE_URL=postgresql://REPLACE_WITH_YOUR_USERNAME:REPLACE_WITH_YOUR_PASSWORD@localhost:5432/dbname

# Security Keys (NEVER commit actual values! Use strong random strings)
JWT_SECRET=REPLACE_WITH_RANDOM_32_PLUS_CHARACTER_STRING
SESSION_SECRET=REPLACE_WITH_ANOTHER_RANDOM_32_PLUS_CHARACTER_STRING

# API Keys
MARKET_DATA_API_KEY=REPLACE_WITH_YOUR_API_KEY
```

#### Security Best Practices

1. **Input Validation**
   - Use Zod schemas for all user input
   - Sanitize data before database operations
   - Validate file uploads

2. **Authentication & Authorization**
   - Use JWT tokens with appropriate expiration
   - Implement rate limiting on all endpoints
   - Never store passwords in plain text

3. **Dependency Security**
   - Run `npm audit` regularly
   - Address high and critical vulnerabilities promptly
   - Keep dependencies up to date

### Security Scanning

#### Running Security Audits

```bash
# Run npm audit
npm audit

# Run audit with CI configuration
npm run audit

# Fix automatically (when possible)
npm audit fix
```

#### Reviewing Security Scan Results

When security vulnerabilities are detected:

1. **Assess the severity**:
   - Critical/High: Address immediately
   - Moderate: Plan to fix in next sprint
   - Low: Fix when convenient

2. **Check for patches**:
   ```bash
   npm audit fix
   ```

3. **Manual updates** if auto-fix doesn't work:
   ```bash
   npm update package-name
   ```

4. **Document exceptions**: If a vulnerability can't be fixed immediately, document why in the PR

5. **Test thoroughly** after updating dependencies

#### CI Security Checks

Our CI pipeline automatically runs:
- `npm audit` with moderate level threshold
- Dependency vulnerability scanning
- YAML configuration validation

All security checks must pass before merging.

## YAML Configuration Management

### YAML Best Practices

1. **Consistent Formatting**
   - Use 2 spaces for indentation
   - Keep lines under 120 characters
   - Use lowercase for keys
   - Quote strings when necessary

2. **Validation**
   - Run YAML linter before committing: `npm run lint:yaml`
   - Fix any linting errors
   - Ensure proper YAML syntax

3. **Configuration Files**
   - `.yamllint` - YAML linting rules
   - `.github/workflows/*.yml` - CI/CD workflows
   - `codecov.yml` - Code coverage configuration

### YAML Linting

Our project uses yaml-lint for validation:

```bash
# Lint YAML files
npm run lint:yaml

# The linter checks:
# - Syntax errors
# - Indentation consistency
# - Line length
# - Trailing spaces
# - Key duplicates
```

### GitHub Actions Workflows

When modifying workflow files:

1. **Test locally** when possible using `act` or similar tools
2. **Validate YAML syntax** with the linter
3. **Check job dependencies** are correct
4. **Update documentation** if workflow behavior changes
5. **Test in a draft PR** before marking as ready for review

### Common YAML Issues

- **Indentation errors**: Use 2 spaces, not tabs
- **Missing quotes**: Quote strings with special characters
- **Trailing spaces**: Remove all trailing whitespace
- **Invalid anchors/references**: Ensure they're defined before use

## Dependency Management

### Adding Dependencies

1. **Evaluate necessity**: Do we really need this package?
2. **Check package health**:
   - Regular updates
   - Active maintenance
   - Good security record
   - Appropriate license

3. **Install dependencies**:
   ```bash
   # Production dependency
   npm install package-name

   # Development dependency
   npm install --save-dev package-name
   ```

4. **Run security scan**:
   ```bash
   npm audit
   ```

5. **Test thoroughly**: Ensure the new dependency works as expected

### Updating Dependencies

1. **Check for updates**:
   ```bash
   npm outdated
   ```

2. **Update safely**:
   ```bash
   # Update minor/patch versions
   npm update

   # Update specific package
   npm update package-name

   # Update to latest (use with caution)
   npm install package-name@latest
   ```

3. **Test after updating**:
   ```bash
   npm run test:run
   npm run build
   ```

4. **Review breaking changes**: Check the package's changelog

5. **Update in batches**: Don't update all dependencies at once

### Dependency Versioning

- Use **semantic versioning** (semver)
- Pin exact versions for critical dependencies
- Use `^` for minor updates: `^1.2.3` allows `1.x.x`
- Use `~` for patch updates: `~1.2.3` allows `1.2.x`

### Handling Vulnerabilities

```bash
# Check for vulnerabilities
npm audit

# Attempt automatic fix
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force

# If can't be fixed, document as accepted risk
```

## CI/CD Pipeline

### Pipeline Overview

Our CI/CD pipeline runs on every push and pull request:

1. **Lint and Type Check**
   - YAML validation
   - ESLint
   - TypeScript compilation
   - Security audit

2. **Unit Tests**
   - Run on Node 18.x and LTS
   - Generate coverage reports
   - Upload to Codecov

3. **Integration Tests**
   - Test with SQLite
   - Test with PostgreSQL
   - Verify database migrations

4. **Coverage Upload**
   - Combine coverage from all test runs
   - Upload to Codecov
   - Enforce coverage thresholds

### Pre-commit Hooks

Husky runs these checks before each commit:

```bash
# Automatically run on git commit:
- Prettier formatting
- ESLint validation
- Type checking
```

### Manual CI Commands

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run check

# Format code
npm run format

# Run all tests
npm run test:run

# Security audit
npm run audit
```

### Troubleshooting CI Failures

1. **Lint errors**: Run `npm run lint:fix` locally
2. **Type errors**: Fix TypeScript issues reported by `npm run check`
3. **Test failures**: Run `npm test` locally and fix failing tests
4. **Security audit**: Address vulnerabilities with `npm audit fix`
5. **YAML errors**: Run `npm run lint:yaml` and fix issues

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated if needed
- [ ] No sensitive data committed
- [ ] YAML files are properly formatted
- [ ] Security audit passes
- [ ] Coverage meets minimum requirements

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Security
- [ ] No sensitive data included
- [ ] Security audit passed
- [ ] Dependencies reviewed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console warnings
```

### Review Process

1. **Automated checks** must pass
2. **At least one approval** required
3. **Address review comments** promptly
4. **Resolve conflicts** with base branch
5. **Squash commits** if requested

### After Merge

- Delete your feature branch
- Update your local repository
- Close related issues

## Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Breaking changes
- **MINOR** version: New features (backward compatible)
- **PATCH** version: Bug fixes (backward compatible)

### Version Naming

- Releases: `v1.2.3`
- Pre-releases: `v1.2.3-beta.1`
- Development: `v1.2.3-dev`

### Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release tag
4. Build and test
5. Deploy to production

## Getting Help

- **Documentation**: Check README.md, TESTING.md, and DEPLOYMENT.md
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Ask for clarification in PR comments

## Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Vitest Documentation](https://vitest.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

Thank you for contributing to AITradePro! Your efforts help make this project better for everyone.
