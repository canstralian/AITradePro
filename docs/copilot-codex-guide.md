# Copilot and Codex Configuration Guide for the Trading Bot Swarm

## Purpose and Scope
- **Objective:** Standardize how GitHub Copilot and Codex operate as disciplined pair-programming agents within the Trading Bot Swarm.
- **Focus:** Enforce consistent code quality, secure automation, and reliable delivery for trading services across backtesting, client apps, shared libraries, and server components.
- **Behavioral Principle:** Copilot and Codex act as assistants, not decision-makers. They propose changes that are testable, observable, and revert-safe, while respecting project guardrails and reviewer authority.

## Configuration Overview
- **Testing First:** Prefer test-driven changes. Every code change must accompany or update relevant unit/integration tests. Documentation-only changes are exempt from test runs but should note the exemption in commits/PRs.
- **Linting:** Run ESLint/TS checks for JavaScript/TypeScript and formatting where applicable. Treat warnings as debt to be resolved.
- **Code Style:** Follow repository ESLint/Prettier configs, TypeScript strictness, and DRY/SOLID principles. Avoid try/catch around imports.
- **Async Patterns:** Use `async/await` with proper error propagation; avoid unhandled promise rejections. Prefer timeouts/cancellation for external calls.
- **Security Defaults:** Least privilege for credentials, signed commits/tags, pinned dependencies, and avoidance of plaintext secrets. Use parameterized queries and input validation for any data access.
- **Logging & Observability:** Prefer structured logging with redaction of sensitive data. Emit metrics for critical paths (orders, risk checks, latency). Ensure traces span async boundaries.
- **CI/CD Integration:** Require passing lint + test pipelines before merge. Block deployments on failing quality gates. Automate versioning and changelogs via semantic release when applicable.
- **Version Control:** Use small, reviewable commits. Reference issues/labels consistently. Avoid force pushes to shared branches.

## Custom Instruction Behavior
- **Copilot as Pair Programmer:** Suggest minimal diffs, cite files/functions, and align with project patterns. Avoid introducing new tech stacks without approval.
- **Codex as Automation Orchestrator:** Enforce pre-flight checks, ensure commands are reproducible, and favor scripts over ad-hoc steps.
- **Example Rules:**
  - Run tests/linters for code changes; skip for docs-only with note.
  - Prefer existing utilities over new abstractions unless justified.
  - Default to secure settings (TLS, authentication, least privilege env vars).
  - Add comments where risk or non-obvious logic exists.

### Conceptual YAML for Custom Instructions
```yaml
copilot:
  role: pair_programmer
  principles:
    - propose_minimal_diffs
    - follow_repo_standards
    - prioritize_tests_and_lints
    - avoid_unapproved_dependencies
  behaviors:
    - cite_touched_files_and_functions
    - maintain_async_safety
    - prefer_existing_patterns
    - redaction_in_logs
    - no_try_catch_around_imports
codex:
  role: automation_guardian
  principles:
    - reproducible_commands
    - security_first
    - small_commits
    - fail_fast_on_quality_gates
  behaviors:
    - run_lints_and_tests_for_code_changes
    - skip_tests_for_docs_only_with_note
    - use_scripts_over_manual_commands
    - enforce_semantic_release_flow
```

## GitHub Workflow Example: Lint and Test Automation
Trigger on feature branches and pull requests to `main` to enforce a quality gate.

```yaml
name: lint-and-test

on:
  push:
    branches: ["main", "feature/**"]
  pull_request:
    branches: ["main"]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Test
        run: npm test -- --runInBand
      - name: Upload coverage
        if: success()
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

## CodeQL Workflow (Direct Actions)
Use direct CodeQL actions instead of a reusable workflow.

```yaml
name: CodeQL Analysis

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

jobs:
  codeql:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Set up CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: "javascript, python"
      - name: Autobuild code
        uses: github/codeql-action/autobuild@v3
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:security-and-quality"
```

## Semantic Release and Version Tagging
- **Branching:** Release from `main`; protect branch with status checks.
- **Tags:** Use auto-generated version tags (`vX.Y.Z`) via semantic release.
- **Changelog:** Generated automatically from conventional commits.

```yaml
name: semantic-release

on:
  push:
    branches: ["main"]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

## Security and Dependency Scanning
- **Dependency Audit:** Run `npm audit --production` or `audit-ci` with severity thresholds.
- **SAST/Secrets:** Combine CodeQL with secret scanning and path-based allowlists.
- **Container/Infra:** Scan container images and IaC templates for misconfigurations when present.

```yaml
name: security-scan

on:
  schedule:
    - cron: "0 6 * * 1"  # weekly
  workflow_dispatch:

jobs:
  dependencies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - name: Audit dependencies
        run: npx audit-ci --critical --high

  secrets_and_sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: CodeQL init
        uses: github/codeql-action/init@v3
        with:
          languages: "javascript"
      - name: CodeQL analyze
        uses: github/codeql-action/analyze@v3
```

## Contributor Guidelines
- **Proposals:** Open an issue with context, risks, and rollout plan. Link to design docs if applicable.
- **Review Criteria:**
  - Tests and linters pass; coverage impact is explained.
  - Security posture unchanged or improved; secrets not exposed.
  - Observability updated for new behaviors.
  - Small, well-described commits and PR summaries with change scope + validation steps.
- **Validation Process:**
  - Local lint/test before PR.
  - CI must pass quality gates (lint, test, CodeQL, scans).
  - Reviewer sign-off with checklist: correctness, resilience, performance, logging/metrics, docs updated.

## Troubleshooting and Optimization
- **Slow CI:** Cache dependencies, run targeted tests, and parallelize jobs where safe.
- **Flaky Tests:** Add deterministic seeds/timeouts; quarantine and fix promptly.
- **Autobuild Failures (CodeQL):** Add explicit build steps (e.g., `npm ci && npm run build`).
- **High Noise in Alerts:** Tune CodeQL queries/configs; adjust audit severity thresholds cautiously.
- **Credential Issues:** Rotate secrets, verify permissions, and ensure least privilege in tokens.

## Maintenance Schedule
- **Quarterly:** Review instructions, update Node/CodeQL versions, rotate tokens, and refresh semantic-release config.
- **Post-Incident:** Amend guide with lessons learned and new checks.
- **Versioning:** Tag guide updates with docs labels; track changes in changelog when bundled with releases.

## Closing Note
Standardizing Copilot and Codex behavior strengthens reliability, performance, and safety across the Trading Bot Swarm, ensuring every change upholds the ecosystem’s excellence.
