# GitHub Copilot & Codex Configuration Guide for Trading Bot Swarm

## Purpose and Scope
This guide defines how to configure GitHub Copilot and Codex so they act as disciplined pair-programming agents within the Trading Bot Swarm ecosystem. It standardizes behavior around code quality, security, automation, and reliability, ensuring AI assistance strengthens—rather than weakens—the trading platform. The guide applies to all code contributions and automation that involve Copilot or Codex.

## Configuration Overview
Use the following expectations as defaults for any Copilot/Codex-driven change or suggestion:

- **Testing & Linting**: Always run unit tests, integration tests, and linters for code changes. Documentation-only edits are exempt from mandatory test runs, but CI will still run automated checks on pushes and pull requests.
- **Code Style**: Follow the repository's ESLint/TypeScript/Tailwind settings. Prefer small, pure functions; avoid implicit `any`; keep modules cohesive; respect DRY and SOLID.
- **Async Patterns**: Favor async/await with proper error surfaces; avoid floating promises; propagate cancellations where supported; wrap network and I/O with timeouts.
- **Security Defaults**: Never commit secrets. Validate inputs at trust boundaries, apply the principle of least privilege, enforce HTTPS, and sanitize logs. Prefer `POST` for mutations and parameterized queries for data access.
- **Logging & Observability**: Emit structured logs with contextual metadata (correlation IDs, actor, request IDs). Keep log levels consistent (`debug` for noisy, `info` for lifecycle, `warn` for recoverable issues, `error` for failures). Expose metrics for critical paths where possible.
- **CI/CD Integration**: All PRs must pass lint, type-check, unit tests, and relevant integration checks. Use preview environments for risky changes. Block merges on failing quality gates.
- **Version Control**: Prefer small, reviewable commits. Reference issue IDs. Keep branches up to date with main and avoid force-pushes after review unless necessary.

## Custom Instruction Behavior
Define explicit boundaries for AI assistance so Copilot/Codex adhere to project standards.

### Behavior Rules (examples)
- Respond with concise, implementation-ready suggestions; no speculative APIs.
- Refuse to generate code that bypasses tests, logging, or security checks.
- Default to existing project utilities and patterns before introducing new dependencies.
- Highlight required tests/linters for any proposed change and skip when only docs change.
- Avoid performing network calls or installing global packages in automation by default.

### Conceptual YAML for Custom Instructions
```yaml
authors: Trading Bot Swarm
purpose: >-
  Enforce disciplined AI pair-programming that preserves reliability, security,
  and code quality in trading automation.
behavior:
  defaults:
    - Use repository linting/formatting rules; avoid disabling ESLint without approval.
    - Prefer async/await with explicit error handling and timeouts.
    - Include structured logging for significant operations.
    - Describe tests and linters to run for each code change.
    - Skip test requirements only for documentation-only changes.
  prohibitions:
    - No secrets, tokens, or credentials in code or logs.
    - No code that reduces validation, authorization, or auditability.
    - No unpinned, unreviewed dependencies or shelling out when an SDK exists.
  responses:
    - Provide minimal, actionable diffs or steps.
    - Cite relevant files or patterns in the repository when giving guidance.
  review:
    - Always prompt to run lint, type-check, and tests for code edits.
    - Require security impact notes for features touching authentication, trading, or funds flow.
```

## GitHub Workflow: Lint & Test Automation
Trigger on pushes and pull requests to `main` and release branches. Skip when only docs change via path filters. Example:

```yaml
name: quality-gate
on:
  push:
    branches: ["main", "release/**"]
    paths-ignore: ["**/*.md", "docs/**"]
  pull_request:
    branches: ["main", "release/**"]
    paths-ignore: ["**/*.md", "docs/**"]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run check --if-present
      - run: npm run test:run
```

## Semantic Release & Version Tagging
Use semantic-release to automate versioning and changelog generation based on Conventional Commits.

```yaml
name: release
on:
  push:
    branches: ["main"]

jobs:
  semantic-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run build --if-present
      - run: npx semantic-release
```

## Security & Dependency Scanning
Integrate automated scanning into CI to catch vulnerable dependencies and misconfigurations.

```yaml
name: security-scan
on:
  pull_request:
  schedule:
    - cron: "0 6 * * 1"  # weekly

jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run audit

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

## Contributor Guidelines
- Open an issue describing the change; align with the trading roadmap and security posture.
- Keep PRs small and focused. Include risk assessment, test evidence, and relevant logs/metrics.
- Review criteria: correctness, test coverage, adherence to lint/type rules, security implications, observability, and release notes impact.
- Validation process: run lint, type-check, unit/integration tests; verify migrations; confirm dashboards/alerts if telemetry changes.

## Troubleshooting & Optimization Tips
- **Flaky tests**: rerun with isolated seed or `--single-thread`; inspect async cleanup and timeouts.
- **Lint noise**: prefer targeted suppressions with comments and tracking issues; do not disable rules globally.
- **Performance regressions**: profile hot paths; cache pure computations; avoid blocking the event loop; prefer streaming for large payloads.
- **CI failures**: verify Node version, lockfile freshness, and cache keys. Reinstall dependencies on checksum changes.
- **Secret leaks**: rotate credentials immediately, purge cache artifacts, and add detectors to CI.

## Maintenance Schedule
- Review this guide quarterly or when adding major services/runtimes.
- Update workflow snippets after dependency or Node version changes.
- Keep semantic-release and audit tooling versions current.

## Closing Note
Standardizing Copilot and Codex behavior is critical to sustaining excellence across the Trading Bot Swarm. These practices reinforce reliability, performance, and safety for the trading ecosystem.
