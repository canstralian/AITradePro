# AI Trading Platform - Copilot Coding Agent Instructions

## Project Overview

This is a sophisticated full-stack AI-Enhanced trading analysis platform built with modern TypeScript architecture. The application features real-time market data processing, AI-powered analysis with RAG technology, and a Bloomberg Terminal-inspired interface.

**Key Technologies:**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI components
- **Backend**: Node.js + Express + TypeScript + WebSockets
- **Database**: PostgreSQL (primary) with SQLite fallback via Drizzle ORM
- **Testing**: Vitest + React Testing Library
- **Build Tools**: Vite (frontend) + esbuild (backend)
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks

## 🚨 Critical Build Requirements & Current Issues

### ALWAYS run these commands in this exact sequence:

1. **Install dependencies** (required every time):
   ```bash
   npm install --legacy-peer-deps
   ```
   ⚠️ **CRITICAL**: Always use `--legacy-peer-deps` due to Vite v7 dependency conflicts

2. **Set up environment** (required for all operations):
   ```bash
   cp .env.example .env
   ```
   The application will exit with error if JWT_SECRET is not set.

3. **Known TypeScript compilation errors** (19 errors as of current state):
   - `server/db.ts`: Variable `db` declared twice (lines 12 & 73)
   - `client/src/App.tsx`: Missing default export
   - `server/services/db-init.ts`: Database typing issues (10+ errors)
   - `client/src/test/`: Missing `@testing-library/dom` dependency

### Working Commands (Validated):

```bash
# Dependencies - ALWAYS use legacy peer deps
npm install --legacy-peer-deps

# Environment setup - REQUIRED
cp .env.example .env

# Type checking - Currently fails with 19 errors
npm run check

# Build - Currently fails due to missing default export
npm run build

# Development server - Currently fails due to db.ts variable redeclaration
npm run dev

# Tests - Require environment variables, currently fail
npm run test:run

# Working commands:
npm run format     # Prettier formatting
npm run db:push    # Database schema push (requires DATABASE_URL)
```

### ESLint Configuration Issue

⚠️ **CRITICAL**: The project uses ESLint v9 but has old `.eslintrc.json` format. ESLint commands will fail until migrated to `eslint.config.js` format.

## 🏗️ Project Architecture

### Directory Structure
```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components (using Radix UI)
│   │   ├── pages/         # Page components (wouter router)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and configurations
│   │   └── test/          # Frontend tests
├── server/                # Node.js backend application  
│   ├── middleware/        # Express middleware
│   ├── services/         # Business logic services
│   ├── test/            # Backend tests
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Server utilities
│   ├── index.ts         # Main server entry point
│   ├── routes.ts        # API route definitions
│   ├── db.ts           # Database connection (has issues)
│   └── storage.ts      # Data access layer
├── shared/              # Shared TypeScript types and schemas
│   ├── schema.ts        # PostgreSQL Drizzle schema
│   └── schema-sqlite.ts # SQLite Drizzle schema
└── migrations/         # Database migrations (auto-generated)
```

### Key Configuration Files
- `package.json`: npm scripts and dependencies
- `tsconfig.json`: TypeScript configuration with path aliases
- `vite.config.ts`: Frontend build configuration
- `vitest.config.ts`: Test configuration
- `drizzle.config.ts`: Database ORM configuration
- `.eslintrc.json`: ESLint rules (needs migration to v9 format)
- `.prettierrc.json`: Code formatting rules
- `.husky/pre-commit`: Git hooks (runs lint + type check)

### Database Architecture
The application uses a dual-database setup:
- **Production**: PostgreSQL via Neon with connection pooling
- **Development**: SQLite fallback for local development
- **ORM**: Drizzle with separate schemas for each database type
- **Migrations**: Auto-generated in `migrations/` directory

⚠️ **Database Issues**: The `server/db.ts` file has variable redeclaration causing build failures.

## 🧪 Testing Strategy

### Test Framework Setup
- **Framework**: Vitest with jsdom environment
- **React Testing**: @testing-library/react (missing @testing-library/dom dependency)
- **Coverage**: v8 provider with HTML reports in `coverage/`
- **Test Files**: `*.test.ts` and `*.test.tsx`

### Test Structure
```
├── client/src/test/
│   ├── setup.ts                    # Test configuration
│   └── components/                # React component tests
│       ├── AIInsights.test.tsx   # (has import errors)
│       └── Dashboard.test.tsx    # (has import errors) 
└── server/test/                  # Backend service tests
    ├── middleware.test.ts        # (fails - requires JWT_SECRET)
    ├── routes.test.ts           # (fails - compilation errors)
    └── storage.test.ts          # (fails - compilation errors)
```

### Coverage Requirements (from TESTING.md)
- **Minimum Overall**: 70%
- **Critical Components**: 90%+ (Storage Layer, AI Services)
- **Medium Priority**: 80-85% (React Components, API Routes)

## 🔧 Common Issues & Troubleshooting

### 1. Dependency Installation Failures
**Issue**: npm install fails with ERESOLVE errors
**Solution**: Always use `npm install --legacy-peer-deps`

### 2. Environment Variable Errors
**Issue**: "JWT_SECRET environment variable is required" 
**Solution**: `cp .env.example .env` before running any server/test commands

### 3. TypeScript Compilation Errors
**Issue**: 19 TypeScript errors preventing builds
**Critical Files to Fix**:
- `server/db.ts`: Remove duplicate `db` variable declarations
- `client/src/App.tsx`: Add `export default App`
- `server/services/db-init.ts`: Fix database typing issues

### 4. ESLint Configuration
**Issue**: "ESLint couldn't find an eslint.config.(js|mjs|cjs) file"
**Solution**: Migrate `.eslintrc.json` to ESLint v9 flat config format

### 5. Missing Test Dependencies
**Issue**: "@testing-library/dom" module not found
**Solution**: Add missing test dependency to package.json

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/ci.yml`)
The CI pipeline expects a different test setup than currently implemented:
- **Expected**: Jest with separate unit and integration configs
- **Actual**: Vitest configuration
- **Database**: PostgreSQL service for integration tests
- **Coverage**: Codecov integration

### Pre-commit Hooks (`.husky/pre-commit`)
```bash
npm run lint    # Currently fails (ESLint v9 issue)
npm run check   # Currently fails (19 TypeScript errors)
```

## 📝 Development Workflow

### To Start Development:
1. `npm install --legacy-peer-deps`
2. `cp .env.example .env`  
3. Fix the TypeScript compilation errors first
4. `npm run dev` (after fixing db.ts issues)

### Before Committing:
1. `npm run format` (works)
2. Fix TypeScript errors: `npm run check`
3. Fix ESLint configuration for linting
4. `npm run test:run` (after fixing dependencies)

### For Database Changes:
1. Modify schemas in `shared/schema.ts` or `shared/schema-sqlite.ts`
2. `npm run db:push` (requires valid DATABASE_URL)
3. Migrations generated automatically in `migrations/`

## ⚠️ Agent Instructions

### CRITICAL: Do NOT attempt these until base issues are resolved:
- Running the development server (`npm run dev`)
- Building the application (`npm run build`) 
- Running linting (`npm run lint`)
- Running tests (`npm run test`)

### ALWAYS do this first:
1. Fix the TypeScript compilation errors (especially `server/db.ts`)
2. Add the missing default export to `client/src/App.tsx`
3. Install missing test dependencies
4. Migrate ESLint configuration to v9 format

### Trust these instructions:
- Use `--legacy-peer-deps` for all npm install operations
- Copy `.env.example` to `.env` before any server operations
- The codebase has significant technical debt that must be addressed before development

This platform represents a sophisticated trading application with real-time features, but currently requires significant fixes to basic build/test infrastructure before productive development can begin.