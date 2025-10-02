# GitHub Copilot Coding Agent Instructions

## Project Overview

**AI Trading Platform** is a comprehensive real-time trading platform built with modern React/TypeScript frontend and Node.js/Express backend. The platform provides AI-powered market analysis, real-time data streaming via WebSockets, and a professional trading interface inspired by Bloomberg Terminal.

## High-Level Repository Information

- **Repository Type**: Full-stack TypeScript web application
- **Size**: Large (~800+ dependencies, multi-service architecture)
- **Languages**: TypeScript (primary), JavaScript, CSS
- **Frontend**: React 18 + Vite + TailwindCSS + Shadcn/ui
- **Backend**: Node.js + Express + WebSocket server
- **Database**: PostgreSQL (primary) with SQLite fallback via Drizzle ORM
- **Testing**: Vitest + React Testing Library
- **Runtime**: Node.js LTS (18.x+)

## Essential Build & Validation Steps

### Prerequisites & Environment Setup

**ALWAYS** copy `.env.example` to `.env` before running any commands:
```bash
cp .env.example .env
```

**ALWAYS** install dependencies with legacy peer deps flag to avoid conflicts:
```bash
npm install --legacy-peer-deps
```

### Core Commands (in order)

1. **Install Dependencies** (required before any other command):
   ```bash
   npm install --legacy-peer-deps
   # Time: ~30-60 seconds
   # May show peer dependency warnings - these are expected
   ```

2. **Type Check** (catches TypeScript errors early):
   ```bash
   npm run check
   # Time: ~5-10 seconds
   # CRITICAL: Fix TypeScript errors before proceeding
   ```

3. **Linting** (currently broken - needs migration):
   ```bash
   # BROKEN: ESLint 9.x config format issue
   # Error: "ESLint couldn't find an eslint.config.(js|mjs|cjs) file"
   # Current .eslintrc.json uses old format
   # Workaround: Skip linting or manually migrate config
   ```

4. **Build** (tests production readiness):
   ```bash
   npm run build
   # Time: ~30-60 seconds
   # CRITICAL: Currently fails due to variable redeclaration in server/db.ts
   # Client build succeeds, server build fails on 'db' variable conflict
   ```

5. **Testing** (with environment variables):
   ```bash
   # Set JWT_SECRET to avoid test failures
   JWT_SECRET=test-secret npm run test:run
   # Time: ~10-30 seconds
   # Currently fails due to missing dependencies and config issues
   ```

6. **Database Operations**:
   ```bash
   npm run db:push  # Apply schema changes
   # Requires valid DATABASE_URL in .env
   ```

## Critical Known Issues & Workarounds

### Build Issues
1. **CRITICAL: Database Variable Redeclaration** ⚠️:
   - File: `server/db.ts` lines 12 and 73
   - Problem: Variable `db` declared twice causing build/dev server failure
   - Impact: Prevents `npm run dev`, `npm run build`, and all tests from working
   - Must fix this before any server-side development

2. **App.tsx Missing Default Export** (FIXED):
   - File: `client/src/App.tsx` 
   - Problem: Function component `App` not exported as default
   - Fix: Add `export default App;` at end of file

3. **Vite Dependency Conflicts**:
   - Use `--legacy-peer-deps` for all npm operations
   - @types/node version mismatch with Vite 7.x

### Test Issues
1. **Missing Environment Variables**:
   - Tests require `JWT_SECRET` environment variable
   - Set before running tests: `JWT_SECRET=test-secret npm test`

2. **Missing Testing Dependencies**:
   - `@testing-library/dom` missing from package.json
   - `screen` import failing in test files

### Database Issues
1. **Dual Schema System**:
   - Uses `shared/schema.ts` for PostgreSQL
   - Uses `shared/schema-sqlite.ts` for SQLite
   - Database detection based on DATABASE_URL format

2. **Type Conflicts**:
   - `server/db.ts` has variable redeclaration issues
   - Union type problems between PostgreSQL and SQLite schemas

## Project Architecture & Layout

### Directory Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── trading/   # Trading-specific components
│   │   │   └── ui/        # Shadcn/ui components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   ├── types/         # TypeScript type definitions
│   │   └── test/          # Frontend tests
│   └── index.html         # Vite entry point
├── server/                # Backend Node.js application
│   ├── middleware/        # Express middleware (auth, cors, validation)
│   ├── services/          # Business logic services
│   ├── utils/             # Server utility functions
│   ├── types/             # Server type definitions
│   └── test/              # Backend tests
├── shared/                # Shared code between client/server
│   ├── schema.ts          # PostgreSQL database schema
│   └── schema-sqlite.ts   # SQLite database schema
└── attached_assets/       # Documentation and assets
```

### Configuration Files
- `vite.config.ts` - Frontend build configuration
- `vitest.config.ts` - Test configuration 
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - TailwindCSS styling
- `drizzle.config.ts` - Database ORM configuration
- `.eslintrc.json` - Linting rules (needs migration to ESLint 9.x format)
- `.prettierrc.json` - Code formatting rules

### Key Source Files
- `client/src/App.tsx` - Main React application (**FIXED: DEFAULT EXPORT ADDED**)
- `client/src/main.tsx` - React DOM entry point
- `server/index.ts` - Express server entry point
- `server/routes.ts` - API routes and WebSocket setup
- `server/db.ts` - Database connection setup (**CRITICAL: HAS VARIABLE REDECLARATION BUG**)
- `shared/schema.ts` - Database schema definitions

## Continuous Integration

### GitHub Actions Pipeline (Incomplete)
The current CI workflow in `.github/workflows/ci.yml` is incomplete and references missing jobs:

- Missing `lint_typecheck` job that other jobs depend on
- References Jest configuration files that don't exist
- Uses outdated testing setup

### Pre-commit Hooks
- Husky pre-commit hook runs `npm run lint` and `npm run check`
- Currently broken due to ESLint configuration issues

## Validation Steps for Code Changes

1. **Always run type checking first**: `npm run check`
2. **Fix TypeScript errors before proceeding**
3. **Test build process**: `npm run build` 
4. **Run tests with environment**: `JWT_SECRET=test-secret npm run test:run`
5. **Manual smoke test**: Start dev server with `npm run dev`

## Dependencies Not Obvious from Structure

- **Real-time Communication**: WebSocket server integrated with Express
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **State Management**: TanStack Query for server state, React hooks for local state
- **Styling**: TailwindCSS with custom CSS variables for theming
- **Database**: Drizzle ORM with dual PostgreSQL/SQLite support
- **Authentication**: JWT-based auth with session middleware
- **Security**: Helmet, CORS, rate limiting middleware

## File Listings

### Repository Root Files
```
.env.example              # Environment variables template
.eslintrc.json           # ESLint configuration (needs migration)
.gitignore               # Git ignore rules
.husky/                  # Git hooks
.lintstagedrc.json       # Lint-staged configuration
.prettierrc.json         # Prettier formatting rules
DEPLOYMENT.md            # Deployment documentation
LICENSE                  # MIT license
README.md                # Project documentation
SECURITY.md              # Security policies
TESTING.md               # Testing documentation
audit-ci.json           # Security audit configuration
components.json         # Shadcn/ui component configuration
drizzle.config.ts       # Database configuration
package.json            # Dependencies and scripts
postcss.config.js       # PostCSS configuration
replit.md               # Replit-specific documentation
tailwind.config.ts      # TailwindCSS configuration
tsconfig.json           # TypeScript configuration
vite.config.ts          # Vite build configuration
vitest.config.ts        # Test configuration
```

### Critical Implementation Notes

- **Database Connection**: Uses connection pooling with Neon PostgreSQL in production
- **WebSocket Integration**: Real-time market data and AI insights via `/ws` endpoint
- **Build Output**: Client builds to `dist/public/`, server builds to `dist/`
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Environment Detection**: Automatically switches between PostgreSQL and SQLite based on DATABASE_URL

## Agent Instructions

**CRITICAL PROJECT STATE**: The repository currently has a blocking bug in `server/db.ts` (variable redeclaration) that prevents the dev server, build process, and tests from working properly. This must be fixed before any meaningful development can occur.

**TRUST THESE INSTRUCTIONS** - Only search for additional information if:
1. The instructions are incomplete for your specific task
2. You encounter errors not documented here
3. The documented workarounds don't resolve the issue

**Before making any changes**:
1. Copy `.env.example` to `.env`
2. Run `npm install --legacy-peer-deps`
3. Run `npm run check` to understand current TypeScript errors
4. Review the known issues section for your area of work

**For any React/frontend changes**: Test with `npm run dev` after changes
**For any server/API changes**: Ensure WebSocket functionality isn't broken
**For any database changes**: Test with both PostgreSQL and SQLite configurations