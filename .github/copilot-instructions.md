# AI Coding Agent Instructions for AITradePro

## Project Overview

**AITradePro** is a comprehensive real-time AI-enhanced trading platform built with modern React/TypeScript frontend and Node.js/Express backend. The platform provides AI-powered market analysis, real-time data streaming via WebSockets, and a professional trading interface inspired by Bloomberg Terminal.

## High-Level Repository Information

- **Repository Type**: Full-stack TypeScript web application
- **Size**: Large (~800+ dependencies, multi-service architecture)
- **Languages**: TypeScript (primary), JavaScript, CSS
- **Frontend**: React 18 + Vite + TailwindCSS + Shadcn/ui
- **Backend**: Node.js + Express + WebSocket server
- **Database**: PostgreSQL (primary) with SQLite fallback via Drizzle ORM
- **Testing**: Vitest + React Testing Library
- **Runtime**: Node.js LTS (18.x+)

## Architecture Overview

AITradePro uses a **service-oriented backend** with **React frontend**. Key architectural patterns:

### Backend Services (`server/services/`)
- **MarketDataService**: Generates realistic price movements every 3 seconds, broadcasts via WebSocket
- **AIAnalysisService**: Creates AI insights (sentiment, patterns, news) every 30 seconds
- **VectorStoreService**: Implements RAG (Retrieval-Augmented Generation) for contextual analysis
- **AsyncWorkerService**: Priority-based task queuing for heavy AI computations

### Real-time Communication
- **WebSocket** at `/ws` handles all real-time updates
- **Message types**: `price_update`, `ai_insight`, `ai_query`, `enqueue_analysis`, `task_queued`
- Services automatically register WebSocket clients and clean up on disconnect

### Data Flow
```
Market Data Service → PostgreSQL → WebSocket → React Components
AI Analysis Service → Vector Store → RAG Analysis → WebSocket
Async Workers → Priority Queue → Background Processing → Results
```

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

3. **Database Setup**:
   ```bash
   npm run db:push  # Applies Drizzle schema changes to PostgreSQL
   ```

4. **Development Server**:
   ```bash
   npm run dev  # Uses tsx for hot reload, serves on PORT env var (default 5000)
   ```

5. **Build** (tests production readiness):
   ```bash
   npm run build  # esbuild bundles server + Vite builds client
   # Time: ~30-60 seconds
   ```

6. **Testing**:
   ```bash
   npm run test:ui  # Visual test runner with Vitest UI
   npm run test:coverage  # Coverage reports in coverage/ directory
   JWT_SECRET=test-secret npm run test:run  # Run all tests
   ```

7. **Production Start**:
   ```bash
   npm run start  # NODE_ENV=production node dist/index.js
   ```

## Critical Known Issues & Workarounds

### Build Issues
1. **Vite Dependency Conflicts**:
   - Use `--legacy-peer-deps` for all npm operations
   - @types/node version mismatch with Vite 7.x

### Test Issues
1. **Missing Environment Variables**:
   - Tests require `JWT_SECRET` environment variable
   - Set before running tests: `JWT_SECRET=test-secret npm test`

### Database Issues
1. **Dual Schema System**:
   - Uses `shared/schema.ts` for PostgreSQL
   - Uses `shared/schema-sqlite.ts` for SQLite
   - Database detection based on DATABASE_URL format

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
- `eslint.config.js` - Linting rules (ESLint 9.x format)
- `.prettierrc.json` - Code formatting rules

### Key Source Files
- `client/src/App.tsx` - Main React application
- `client/src/main.tsx` - React DOM entry point
- `server/index.ts` - Express server entry point
- `server/routes.ts` - API routes and WebSocket setup
- `server/db.ts` - Database connection setup
- `shared/schema.ts` - Database schema definitions

## Project-Specific Patterns

### WebSocket Integration
**Client-side**: Use `useWebSocket` hook with subscription pattern:
```tsx
const { subscribe, sendMessage } = useWebSocket();
const unsubscribe = subscribe('price_update', (data) => {
  // Handle price updates
});
```

**Server-side**: Services extend WebSocket clients automatically:
```typescript
addClient(ws: WebSocket) {
  this.connectedClients.add(ws);
  ws.on('close', () => this.connectedClients.delete(ws));
}
```

### Service Registration
All services register with WebSocket server in `server/routes.ts`:
```typescript
marketDataService.addClient(ws);
aiAnalysisService.addClient(ws);
asyncWorkerService.addClient(ws);
```

### Database Schema
Shared schemas in `shared/schema.ts` using Drizzle ORM with Zod validation:
```typescript
export const assets = pgTable('assets', {
  currentPrice: decimal('current_price', { precision: 15, scale: 8 }),
  // ...
});
```

### Error Handling
**Backend**: Express error middleware logs and responds with structured errors
**Frontend**: `ErrorBoundary` component wraps the entire app

### API Patterns
- REST endpoints under `/api/` with rate limiting
- Combined dashboard endpoint `/api/dashboard` for initial data load
- WebSocket for real-time updates, REST for historical/queries

### Component Structure
Trading components in `client/src/components/trading/` follow dashboard layout:
- `main-dashboard.tsx` - Central trading interface
- `sidebar.tsx` - Navigation and quick actions
- `header.tsx` - Top navigation with system status

### State Management
- **TanStack Query** for server state (`useQuery`, `useMutation`)
- **React state** for WebSocket real-time data
- **Custom hooks** for reusable logic (`use-mobile.tsx`, `use-websocket.tsx`)

## Key Files to Reference

- `server/routes.ts` - WebSocket + REST API setup, service initialization
- `server/services/market-data.ts` - Real-time price generation pattern
- `client/src/hooks/use-websocket.tsx` - WebSocket subscription pattern
- `shared/schema.ts` - Database schema and Zod validation
- `server/services/async-workers.ts` - Priority queue implementation
- `client/src/types/trading.ts` - TypeScript interfaces for all data structures

## Common Gotchas

- **WebSocket cleanup**: Always check `ws.readyState === WebSocket.OPEN` before sending
- **Database precision**: Use appropriate decimal precision (price: 15,8; volume: 20,2)
- **Service lifecycle**: Call `service.start()` after database initialization
- **Environment variables**: `NODE_ENV`, `PORT`, `DATABASE_URL` are critical
- **Mock data**: Services generate realistic mock data for development/demo

## Continuous Integration

### GitHub Actions Pipeline
The CI workflow in `.github/workflows/ci.yml` includes:
- Type checking and linting
- Test suite with PostgreSQL integration
- Matrix testing across Node versions

### Pre-commit Hooks
- Husky pre-commit hook runs `npm run lint` and `npm run check`
- Lint-staged for formatting staged files

## Testing Patterns

- **Vitest** with jsdom for React components
- **Supertest** for API endpoint testing
- Coverage excludes config files and test directories
- Integration tests use PostgreSQL service in CI

## Deployment Notes

- Single port serves both API and client (Vite dev server proxies API in development)
- PostgreSQL required for production (SQLite fallback in dev)
- Environment variables control service behavior
- CI runs matrix testing across Node versions with PostgreSQL integration

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

## Agent Instructions

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
