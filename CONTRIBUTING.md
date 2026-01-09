# Contributing to AITradePro

Thank you for your interest in contributing to AITradePro! This guide will help you understand our development workflow and best practices.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Configuration and YAML Files](#configuration-and-yaml-files)
- [Security Best Practices](#security-best-practices)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/AITradePro.git`
3. Install dependencies: `npm ci`
4. Copy environment template: `cp .env.example .env`
5. Configure your `.env` file with appropriate values
6. Run the development server: `npm run dev`

## Development Workflow

### Branch Naming Convention

- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`
- Copilot tasks: `copilot/description`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(trading): add real-time market data streaming`
- `fix(auth): resolve JWT token expiration issue`
- `docs(readme): update installation instructions`

## Code Standards

### TypeScript/JavaScript

- Follow ESLint configuration (`.eslintrc`)
- Use TypeScript strict mode
- Prefer `async/await` over promises
- Avoid `any` types - use proper typing
- Keep functions small and focused
- Write self-documenting code

### Pre-commit Hooks

We use Husky for pre-commit hooks that automatically:
- Run ESLint for code quality
- Run TypeScript type checking
- Check for potential secrets in commits
- Prevent committing `.env` files

### Code Formatting

- Prettier is configured for automatic formatting
- Run `npm run format` to format all files
- Format on save is recommended in your IDE

## Configuration and YAML Files

### YAML Linting

All YAML files must pass `yamllint` validation:

```bash
yamllint .
```

Configuration is in `.yamllint`. Key rules:
- 2-space indentation
- Maximum 120 character line length
- No trailing spaces
- Consistent bracket spacing

### GitHub Workflows

When modifying workflow files in `.github/workflows/`:

1. **Use correct npm scripts**:
   - Type checking: `npm run check` (NOT `typecheck`)
   - Testing: `npm run test:run` (NOT `npm test -- --runInBand`)
   - Linting: `npm run lint`
   - Audit: `npm run audit`

2. **Node version consistency**:
   - Use `lts/*` for Node version (NOT hardcoded `20`)
   - Aligns with project CI matrix testing

3. **Validate syntax**:
   ```bash
   yamllint .github/workflows/
   ```

4. **Test locally** before pushing (if possible with `act` or similar tools)

### Adding New Workflows

1. Create workflow file in `.github/workflows/`
2. Follow existing patterns from `ci.yml`
3. Include proper error handling
4. Add appropriate permissions (principle of least privilege)
5. Document purpose in workflow comments
6. Validate with yamllint

## Security Best Practices

### Environment Variables

**CRITICAL**: Never commit secrets or credentials!

- ✅ **DO**:
  - Use `.env.example` for templates with placeholder values
  - Generate strong secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
  - Keep `.env` in `.gitignore`
  - Document required environment variables
  - Use secret management in production

- ❌ **DON'T**:
  - Commit `.env`, `.env.local`, or `.env.production`
  - Hardcode secrets in code
  - Share secrets in pull requests or issues
  - Log sensitive information

### Dependency Security

Before adding dependencies:

1. Check for known vulnerabilities:
   ```bash
   npm run audit
   ```

2. Verify package authenticity and maintenance status
3. Use exact versions for security-critical packages
4. Document why the dependency is needed

### Secret Detection

Our pre-commit hooks check for:
- Common secret patterns (API keys, tokens, passwords)
- `.env` files in commits

If blocked, review your changes and ensure no secrets are included.

## Testing Requirements

### Running Tests

```bash
# Run all tests
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm test

# Run tests with UI
npm run test:ui
```

### Test Coverage

- Aim for >80% coverage on new code
- Write tests for bug fixes
- Include unit and integration tests where appropriate
- Test error cases and edge conditions

### Writing Tests

- Use Vitest (NOT Jest) - this project uses Vitest
- Follow existing test patterns
- Use descriptive test names
- Keep tests focused and independent

## Pull Request Process

### Before Submitting

1. **Run all checks locally**:
   ```bash
   npm run lint
   npm run check
   npm run test:run
   yamllint .
   ```

2. **Update documentation** if needed
3. **Add/update tests** for your changes
4. **Check git diff** to ensure only intended changes

### PR Requirements

- Clear description of changes
- Reference related issues
- All CI checks passing
- Code review approval
- No merge conflicts
- Security considerations documented (if applicable)

### Review Process

1. Automated checks run (CI/CD)
2. Code review by maintainers
3. Address feedback
4. Final approval and merge

### PR Template

Include:
- **What**: Brief description of changes
- **Why**: Motivation and context
- **How**: Technical implementation details
- **Testing**: How you tested the changes
- **Screenshots**: For UI changes
- **Checklist**:
  - [ ] Tests added/updated
  - [ ] Documentation updated
  - [ ] YAML files validated
  - [ ] No secrets in commits
  - [ ] CI checks passing

## Workflow Maintenance

### Periodic Reviews

Configuration files should be reviewed:
- **Quarterly**: Review workflow files and dependencies
- **After Node updates**: Verify compatibility
- **After major dependency updates**: Test CI pipeline
- **When adding services**: Update workflows accordingly

### Common Issues

#### YAML Validation Failures
```bash
yamllint .github/workflows/yourfile.yml
# Fix reported issues
```

#### Secret Detection False Positives
Add exception in commit with clear comment explaining why it's safe.

#### Flaky Tests
- Use `--single-thread` for serial execution in Vitest (NOT `--runInBand`)
- Check for async cleanup issues
- Verify test isolation

## Getting Help

- Check existing documentation in `/docs`
- Review `SECURITY.md` for security guidelines
- Review `TESTING.md` for testing details
- Open an issue for questions or problems
- Tag with appropriate labels

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

---

Thank you for contributing to AITradePro! 🚀
