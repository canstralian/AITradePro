# AI Coding Agent Instructions for AITradePro

## Architecture Overview

AITradePro is a real-time AI-enhanced trading platform with a **service-oriented backend** and **React frontend**. Key architectural patterns:

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

## Critical Developer Workflows

### Development Server
```bash
npm run dev  # Uses tsx for hot reload, serves on PORT env var (default 5000)
```

### Database Setup
```bash
npm run db:push  # Applies Drizzle schema changes to PostgreSQL
```

### Testing
```bash
npm run test:ui  # Visual test runner with Vitest UI
npm run test:coverage  # Coverage reports in coverage/ directory
```

### Production Build
```bash
npm run build  # esbuild bundles server + Vite builds client
npm run start  # NODE_ENV=production node dist/index.js
```

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