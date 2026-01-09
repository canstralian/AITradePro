# CI/CD Workflows Documentation

This document provides detailed information about the Continuous Integration and Continuous Deployment workflows configured for AITradePro.

## Table of Contents

- [Overview](#overview)
- [Workflows](#workflows)
- [YAML Configuration Guidelines](#yaml-configuration-guidelines)
- [Security Scanning](#security-scanning)
- [Troubleshooting](#troubleshooting)

## Overview

AITradePro uses GitHub Actions for automated testing, linting, security scanning, and deployment. All workflows are defined in `.github/workflows/` directory.

## Workflows

### CI Workflow (`ci.yml`)

The main continuous integration workflow that runs on every push and pull request to `main` and `develop` branches.

#### Jobs

1. **lint_typecheck** (First job, runs in parallel)
   - YAML linting validation
   - ESLint code style checks
   - TypeScript type checking
   - Security audit (npm audit)
   
   **Purpose**: Catch syntax errors, style violations, and security issues early
   
   **Commands executed**:
   ```bash
   npm run lint:yaml  # Validate YAML files
   npm run lint       # ESLint validation
   npm run check      # TypeScript compilation check
   npm audit --audit-level=moderate || true  # Security scan
   ```

2. **tests** (Depends on lint_typecheck)
   - Unit tests on Node.js matrix (18.x and LTS)
   - Code coverage generation
   - Test results reporting
   
   **Test framework**: Jest with jest-junit reporter
   
   **Coverage**: Uploaded to Codecov for tracking
   
   **Matrix testing**: Ensures compatibility across Node versions

3. **integration_tests_sqlite** (Depends on tests)
   - Integration tests with SQLite database
   - Database migration testing
   - Coverage for integration scenarios
   
   **Database**: In-memory SQLite
   
   **Use case**: Fast integration testing without external dependencies

4. **integration_tests_postgres** (Depends on tests)
   - Integration tests with PostgreSQL
   - Full database functionality testing
   - Production-like environment testing
   
   **Database**: PostgreSQL 16 (containerized service)
   
   **Health checks**: Ensures database is ready before tests

5. **coverage_upload** (Depends on all test jobs)
   - Collects coverage from all test runs
   - Uploads to Codecov with different flags
   - Enforces coverage requirements
   
   **Flags**:
   - `unit-tests` - Unit test coverage
   - `integration-tests-sqlite` - SQLite integration coverage
   - `integration-tests-postgres` - PostgreSQL integration coverage

#### Workflow Trigger

```yaml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
```

#### Environment Variables

- `NODE_LTS`: Node.js LTS version
- `POSTGRES_USER`: PostgreSQL username for tests
- `POSTGRES_PASSWORD`: PostgreSQL password for tests
- `POSTGRES_DB`: Test database name
- `DATABASE_URL`: Database connection string

### Validate Docs Workflow (`validate-docs.yml`)

Validates frontend/backend structure alignment when copilot instructions are modified.

**Trigger**: Push to `.github/copilot-instructions.md`

**Purpose**: Ensure documentation stays in sync with code structure

### Copilot Task Workflow (`copilot-task.yml`)

Automated workflow for GitHub Copilot-assisted development tasks.

**Trigger**: Manually triggered or via GitHub Copilot

**Purpose**: Automates common development tasks

## YAML Configuration Guidelines

### File Locations

- Workflows: `.github/workflows/*.yml`
- CI Configuration: `codecov.yml`, `audit-ci.json`
- Linting: `.yamllint`

### Linting YAML Files

All YAML files must pass linting before merge:

```bash
# Lint all workflow files
npm run lint:yaml

# The linter checks:
# - Syntax errors
# - Indentation (2 spaces)
# - Line length (max 120 chars)
# - Trailing spaces
# - Key duplicates
# - Proper quoting
```

### YAML Best Practices

1. **Indentation**: Always use 2 spaces
   ```yaml
   # Good
   jobs:
     build:
       runs-on: ubuntu-latest
   
   # Bad
   jobs:
       build:
           runs-on: ubuntu-latest
   ```

2. **Line Length**: Keep under 120 characters
   ```yaml
   # Good
   - name: Install dependencies
     run: npm ci
   
   # Avoid
   - name: Install dependencies and build the application and run tests and deploy
     run: npm ci && npm run build && npm test && npm run deploy
   ```

3. **Quoting**: Quote strings with special characters
   ```yaml
   # Good
   run: echo "Hello, World!"
   
   # Bad (may cause issues)
   run: echo Hello, World!
   ```

4. **Comments**: Use comments to explain complex logic
   ```yaml
   # Install dependencies with frozen lockfile for reproducibility
   - run: npm ci
   ```

5. **Job Dependencies**: Use `needs` to define dependencies
   ```yaml
   jobs:
     lint:
       runs-on: ubuntu-latest
     
     test:
       needs: lint  # Only run after lint succeeds
       runs-on: ubuntu-latest
   ```

### Modifying Workflows

When making changes to workflow files:

1. **Test locally** (if possible with `act` or similar)
2. **Validate YAML syntax**:
   ```bash
   npm run lint:yaml
   ```
3. **Create a draft PR** to test changes
4. **Review workflow runs** in GitHub Actions tab
5. **Document changes** in PR description

### Common YAML Mistakes

| Issue | Example | Fix |
|-------|---------|-----|
| Indentation | `  - name: Test` (4 spaces) | `- name: Test` (2 spaces) |
| Missing quotes | `run: echo $VAR` | `run: echo "$VAR"` |
| Duplicate keys | Two `run:` in same step | Use multiline or separate steps |
| Wrong anchors | `*anchor` before `&anchor` | Define anchor before using |

## Security Scanning

### npm audit

Automated security scanning for npm dependencies.

#### Configuration

Located in `audit-ci.json`:

```json
{
  "moderate": true,
  "high": true,
  "critical": true,
  "allowlist": []
}
```

**Severity levels**:
- `critical`: Must be fixed immediately
- `high`: Should be fixed ASAP
- `moderate`: Fix within a week
- `low`: Fix when convenient

#### Running Locally

```bash
# Standard audit
npm audit

# Production dependencies only
npm audit --production

# With CI configuration
npm run audit

# Attempt automatic fix
npm audit fix
```

#### Handling Vulnerabilities

1. **Review the advisory**:
   ```bash
   npm audit
   ```

2. **Attempt automatic fix**:
   ```bash
   npm audit fix
   ```

3. **Manual update if needed**:
   ```bash
   npm update package-name
   # or
   npm install package-name@latest
   ```

4. **Test after fixing**:
   ```bash
   npm run test:run
   npm run build
   ```

5. **Document exceptions**:
   - Add to `allowlist` in `audit-ci.json` if can't be fixed
   - Create an issue to track
   - Document reasoning in commit/PR

#### CI Integration

The `lint_typecheck` job runs security audit:

```yaml
- name: Security Audit
  run: npm audit --audit-level=moderate || true
```

**Note**: Currently non-blocking (`|| true`) but should address vulnerabilities promptly.

### GitHub Dependabot

Automated dependency updates and security alerts.

**Configuration**: `.github/dependabot.yml` (if configured)

**Benefits**:
- Daily security scans
- Automatic update PRs
- Detailed security advisories
- Version compatibility checks

**Workflow**:
1. Dependabot creates PR for vulnerability
2. Review changelog and breaking changes
3. Test locally if significant changes
4. Approve and merge if safe

## Troubleshooting

### Common CI Failures

#### YAML Lint Failures

**Error**: "YAML validation failed"

**Solution**:
```bash
npm run lint:yaml
# Fix reported issues
```

**Common issues**:
- Wrong indentation (use 2 spaces)
- Trailing whitespace
- Missing quotes around special characters

#### ESLint Failures

**Error**: "ESLint validation failed"

**Solution**:
```bash
npm run lint
# Review errors
npm run lint:fix  # Auto-fix when possible
```

#### TypeScript Errors

**Error**: "TypeScript check failed"

**Solution**:
```bash
npm run check
# Fix reported type errors in the code
```

#### Security Audit Failures

**Error**: "npm audit failed with vulnerabilities"

**Solution**:
```bash
npm audit
npm audit fix
# If fix doesn't work, update manually or add to allowlist
```

#### Test Failures

**Error**: "Tests failed"

**Solution**:
```bash
npm test
# Fix failing tests
npm run test:coverage  # Check coverage
```

#### Database Migration Failures

**Error**: "Database migration failed"

**Solution**:
```bash
# Check if drizzle.config.ts is correct
npm run db:push  # Test locally
# Fix migration issues
```

### Debugging Workflows

#### View Workflow Logs

1. Go to GitHub Actions tab
2. Click on failed workflow run
3. Click on failed job
4. Expand failed step
5. Review error messages

#### Reproduce Locally

```bash
# Simulate CI environment
npm ci  # Clean install
npm run lint:yaml
npm run lint
npm run check
npm run test:run
npm run build
```

#### Test with Act (Local GitHub Actions)

```bash
# Install act (https://github.com/nektos/act)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act -j lint_typecheck
act -j tests
```

### Performance Issues

#### Slow CI Runs

**Symptoms**: CI takes too long

**Solutions**:
- Use `npm ci` instead of `npm install` (already done)
- Enable caching for `node_modules` (already configured)
- Run tests in parallel (matrix testing in place)
- Skip unnecessary steps with conditions

#### Flaky Tests

**Symptoms**: Tests pass/fail intermittently

**Solutions**:
- Add proper waits for async operations
- Mock external dependencies
- Use deterministic test data
- Review WebSocket connection handling

### Getting Help

#### CI/CD Issues

1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Search existing issues
4. Create issue with:
   - Workflow name
   - Error message
   - Steps to reproduce
   - Logs/screenshots

#### YAML Issues

1. Run `npm run lint:yaml`
2. Check `.yamllint` configuration
3. Validate syntax online: [yamllint.com](https://www.yamllint.com/)
4. Review GitHub Actions documentation

#### Security Issues

1. Run `npm audit` locally
2. Review security advisories
3. Check Dependabot PRs
4. Consult SECURITY.md

## Best Practices

### Pre-commit Checklist

Before pushing code:

- [ ] Run `npm run lint:yaml`
- [ ] Run `npm run lint`
- [ ] Run `npm run check`
- [ ] Run `npm run test:run`
- [ ] Run `npm audit`
- [ ] Review your changes with `git diff`

### CI-Friendly Development

1. **Run checks locally** before pushing
2. **Fix issues incrementally** rather than all at once
3. **Keep commits focused** on single concerns
4. **Write clear commit messages** for easier debugging
5. **Monitor CI runs** and fix failures promptly

### Workflow Maintenance

1. **Review workflows quarterly** for updates
2. **Update actions** to latest versions
3. **Remove deprecated features**
4. **Optimize for speed** without compromising quality
5. **Document changes** in PR descriptions

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [YAML Specification](https://yaml.org/spec/)
- [npm audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Codecov Documentation](https://docs.codecov.com/)
- [Jest Documentation](https://jestjs.io/)

---

For questions or suggestions about CI/CD workflows, please create an issue or discussion.
