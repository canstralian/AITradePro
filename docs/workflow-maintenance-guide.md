# GitHub Workflows Maintenance Guide

This guide provides best practices for maintaining, updating, and troubleshooting GitHub Actions workflows in the AITradePro repository.

## Workflow Inventory

### Current Workflows

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Purpose: Continuous integration with linting, type checking, and testing
   - Triggers: Push and PR to main/develop branches
   - Jobs: lint_typecheck, tests, integration_tests_sqlite, integration_tests_postgres, coverage_upload
   - Node versions: 18.x and lts/*

2. **Validate Docs** (`.github/workflows/validate-docs.yml`)
   - Purpose: Validate documentation structure
   - Triggers: Push to copilot-instructions.md
   - Jobs: validate-docs

3. **Copilot Task** (`.github/workflows/copilot-task.yml`)
   - Purpose: Issue template for Copilot coding tasks
   - Type: Issue template (not a workflow)

## YAML Validation

### Automated Linting

All YAML files are validated using `yaml-lint` (Node package):

```bash
# Validate workflow files and codecov.yml (as configured in package.json)
npm run lint:yaml

# Or run directly with npx
npx yaml-lint .github/workflows/*.yml codecov.yml

# Validate specific workflow
npx yaml-lint .github/workflows/ci.yml
```

**Note**: The `.yamllint` configuration file is maintained for reference and potential future migration to Python's `yamllint` tool.

### Common YAML Issues

#### Bracket Spacing
```yaml
# ❌ Wrong
branches: [ main, develop ]

# ✅ Correct
branches: [main, develop]
```

#### Trailing Spaces
```yaml
# ❌ Wrong
name: My Workflow  

# ✅ Correct
name: My Workflow
```

#### Line Length
Maximum 120 characters per line (enforced by `yaml-lint`)

## npm Script Reference

When writing workflows, use the correct npm scripts from `package.json`:

### Available Scripts

```json
{
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node ...",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc --noEmit",              // ✅ Use this for type checking
  "lint": "eslint . --ext .ts,.tsx ...",
  "lint:fix": "eslint . --ext .ts,.tsx --fix",
  "format": "prettier --write .",
  "db:push": "drizzle-kit push",
  "test": "vitest",                      // Watch mode (dev only)
  "test:run": "vitest run",              // ✅ Use this in CI
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui",
  "audit": "audit-ci --config audit-ci.json"  // ✅ Use this for security audit
}
```

### Workflow Best Practices

```yaml
# Type checking
- run: npm run check --if-present

# Testing in CI (NOT npm test)
- run: npm run test:run

# Security audit (uses project config)
- run: npm run audit

# Linting
- run: npm run lint
```

## Node Version Strategy

### Consistency Across Workflows

Always use `lts/*` for Node version to ensure forward compatibility:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: lts/*  # ✅ Preferred
    cache: npm
```

### Why Not Hardcode Version?

```yaml
# ❌ Avoid hardcoding
node-version: 20

# ✅ Use LTS selector
node-version: lts/*
```

Benefits:
- Automatic updates to latest LTS
- Consistent with CI matrix strategy
- Forward-compatible with future LTS releases

### Testing Matrix

For comprehensive testing, use a matrix:

```yaml
strategy:
  fail-fast: false
  matrix:
    node: [18.x, lts/*]
```

## Testing Framework: Vitest

This project uses **Vitest**, not Jest. Important distinctions:

### Vitest vs Jest Commands

| Purpose          | Jest             | Vitest (Use This)    |
|------------------|------------------|----------------------|
| Run once         | `--runInBand`    | `--single-thread` or just `vitest run` |
| Coverage         | `--coverage`     | `--coverage` ✅      |
| Watch mode       | `--watch`        | No flag needed ✅    |

### Example Workflow Steps

```yaml
# ❌ Wrong (Jest syntax)
- run: npm test -- --runInBand

# ✅ Correct (Vitest)
- run: npm run test:run

# For serial execution if needed
- run: npm run test:run -- --single-thread
```

## Security Scanning

### Dependency Auditing

```yaml
- name: Security Audit
  run: npm run audit
```

This uses `audit-ci` with configuration from `audit-ci.json`:

```json
{
  "moderate": true,
  "high": true,
  "critical": true,
  "allowlist": [],
  "report-type": "important",
  "advisories": []
}
```

### CodeQL Analysis

Complete CodeQL workflow example:

```yaml
codeql:
  runs-on: ubuntu-latest
  permissions:
    actions: read
    contents: read
    security-events: write
  strategy:
    fail-fast: false
    matrix:
      language: ['javascript-typescript']
  steps:
    - name: Checkout repository
      uses: actions/checkout@v4
    
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v3
      with:
        languages: ${{ matrix.language }}
    
    - name: Autobuild
      uses: github/codeql-action/autobuild@v3
    
    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3
      with:
        category: "codeql"
```

## Environment Variables in CI

### Database Configuration

```yaml
env:
  NODE_LTS: 'lts/*'
  POSTGRES_USER: testuser
  POSTGRES_PASSWORD: testpass
  POSTGRES_DB: aitradepro_test
  DATABASE_URL: postgresql://testuser:testpass@localhost:5432/aitradepro_test
```

### PostgreSQL Service

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: ${{ env.POSTGRES_USER }}
      POSTGRES_PASSWORD: ${{ env.POSTGRES_PASSWORD }}
      POSTGRES_DB: ${{ env.POSTGRES_DB }}
    ports:
      - 5432:5432
    options: >-
      --health-cmd="pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"
      --health-interval=5s
      --health-timeout=5s
      --health-retries=12
```

## Adding New Workflows

### Checklist

- [ ] Create workflow file in `.github/workflows/`
- [ ] Follow naming convention: `kebab-case.yml`
- [ ] Add descriptive name and comments
- [ ] Use `lts/*` for Node version
- [ ] Use correct npm scripts
- [ ] Include appropriate permissions (least privilege)
- [ ] Test with `act` or similar tool if possible
- [ ] Validate with yaml-lint: `npm run lint:yaml`
- [ ] Document purpose in this guide
- [ ] Test in a draft PR before merging

### Template

```yaml
name: Descriptive Workflow Name

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

env:
  NODE_LTS: 'lts/*'

jobs:
  job-name:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_LTS }}
          cache: npm
      
      - name: Install dependencies
        run: npm ci
      
      - name: Your step here
        run: npm run your-script
```

## Troubleshooting

### Workflow Not Triggering

Check:
- Branch names in `on.push.branches` and `on.pull_request.branches`
- Path filters (`paths` or `paths-ignore`)
- Workflow file syntax (npm run lint:yaml)

### Dependency Installation Failures

```yaml
# Clear cache and reinstall
- run: npm ci --cache .npm --prefer-offline
```

### Database Connection Issues

```yaml
# Wait for PostgreSQL to be ready
- run: |
    for i in {1..30}; do
      pg_isready -h localhost -p 5432 -U $POSTGRES_USER && break
      sleep 2
    done
```

### Test Failures

```yaml
# Run with verbose output
- run: npm run test:run -- --reporter=verbose

# Generate coverage report
- run: npm run test:coverage
```

### YAML Syntax Errors

```bash
# Validate before committing
npm run lint:yaml

# Check specific file
npx yaml-lint .github/workflows/ci.yml
```

## Maintenance Schedule

### Weekly
- Monitor workflow runs for failures
- Check for deprecated actions
- Review security alerts

### Monthly
- Update actions to latest versions
- Review workflow performance
- Optimize caching strategies

### Quarterly
- Review all workflows for relevance
- Update Node versions if needed
- Update documentation
- Audit permissions and secrets

### After Major Updates
- Test workflows after Node LTS updates
- Verify after major dependency updates
- Update workflows when adding new services

## Performance Optimization

### Caching

```yaml
# Cache npm dependencies
- uses: actions/setup-node@v4
  with:
    node-version: lts/*
    cache: npm

# Custom cache
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### Conditional Execution

```yaml
# Run only on specific Node version
- name: Upload Coverage
  if: matrix.node == env.NODE_LTS
  run: npm run test:coverage

# Skip on documentation changes
on:
  push:
    paths-ignore: ["**/*.md", "docs/**"]
```

## Security Best Practices

### Permissions

Always use minimal required permissions:

```yaml
permissions:
  contents: read        # Read repository contents
  security-events: write  # For CodeQL
  pull-requests: write    # For PR comments
```

### Secrets Management

```yaml
# Use GitHub secrets
- run: npm run deploy
  env:
    API_KEY: ${{ secrets.API_KEY }}

# Never log secrets
- run: |
    echo "Deploying to production..."
    # Don't echo $API_KEY
```

### Dependency Pinning

```yaml
# Pin action versions
- uses: actions/checkout@v4  # ✅ Major version

# Or use full SHA for maximum security
- uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab
```

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [yaml-lint Package](https://www.npmjs.com/package/yaml-lint)
- [Vitest Documentation](https://vitest.dev/)
- [CodeQL Documentation](https://codeql.github.com/docs/)

## Support

For questions or issues with workflows:
1. Check this guide
2. Review existing workflow files
3. Check workflow run logs in GitHub Actions tab
4. Open an issue with `workflow` label
