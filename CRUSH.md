# CRUSH -- Development Guidelines for Profitmaker v3

## Workspace Structure

Bun workspace monorepo with 4 packages:

```
packages/
├── types/    # @profitmaker/types -- shared TypeScript types (incl. provider contracts)
├── sdk/      # @profitmaker/module-sdk -- module SDK (widget/manifest/runtime)
├── server/   # @profitmaker/server -- Elysia (Bun) + Socket.IO backend (+ provider registry)
└── client/   # @profitmaker/client -- React + Vite frontend
```

## Commands

All commands run from project root via Bun:

### Development
- `bun dev` -- start Vite dev server (client, port 8080)
- `bun server:dev` -- start the API server with watch mode (port 3001; needs `DATABASE_URL` + `API_TOKEN`)

### Build & Production
- `bun run build` -- production build (client)
- `bun server` -- start the API server

### Testing
- `bun test` -- run Vitest (client)
- `bun test packages/server/src/routes/proxy.test.ts` -- run a server test

### Linting
- `bun lint` -- ESLint check (client)

### Package-specific
- `bun --filter '@profitmaker/client' <script>` -- run script in client package
- `bun --filter '@profitmaker/server' <script>` -- run script in server package

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun 1.0+ |
| Frontend | React 18, TypeScript, Vite 5 + SWC |
| Components | shadcn/ui (Radix UI + Tailwind CSS) |
| State | Zustand 5 + Immer (persisted to localStorage) |
| Data | TanStack React Query, CCXT 4.4 (REST + WebSocket) |
| Charts | Night Vision (OHLCV), Recharts (pie/bar) |
| Backend | Elysia (Bun), Socket.IO |
| Encryption | Web Crypto API, AES-256-GCM |
| Testing | Vitest (client), bun:test (server) |

## Code Style

### Imports
- Use `@/*` alias for src directory in client
- Use `@profitmaker/types` and `@profitmaker/module-sdk` for cross-package imports
- Group: built-in, external, workspace packages, internal, type imports

### Naming
- PascalCase: components, types, interfaces (`WidgetSimple`, `OrderBook`)
- camelCase: variables, functions, hooks (`useDashboardStore`, `formatPrice`)
- UPPER_SNAKE_CASE: constants (`CACHE_TTL`, `SNAP_DISTANCE`)
- Files match exports: `UserBalancesWidget.tsx`, `dashboardStore.ts`

### TypeScript
- Prefer interfaces for object shapes, types for unions/intersections
- Use Zod schemas for validated types (stores, API responses)
- Use explicit typing when it improves clarity, inference elsewhere
- Avoid `any` -- use `unknown` and narrow

### Components
- shadcn/ui as base -- don't reinvent buttons, dialogs, inputs
- `cn()` utility for conditional Tailwind classes (clsx + tailwind-merge)
- Push state down: local state in component, shared state in Zustand store
- Use Zustand selectors to avoid unnecessary re-renders: `useStore(s => s.field)` not `useStore()`

### State Management (Zustand)
- Each store in its own file: `dashboardStore.ts`, `userStore.ts`, etc.
- Use Immer middleware for complex nested updates
- Use `persist` middleware for data that survives page reload
- Use `subscribeWithSelector` for reactive subscriptions
- Actions split into separate modules in `store/actions/`

### Performance
- Virtual scroll for lists with >50 items (`@tanstack/react-virtual`)
- Pre-calculate element heights for virtualizer
- `React.memo`, `useMemo`, `useCallback` for expensive computations
- Avoid object creation in render functions
- Subscription deduplication for market data streams

### Error Handling
- try/catch for all async operations
- Graceful fallbacks (WebSocket -> REST)
- User-friendly error states in widgets (retry button)
- Console logging with emoji prefixes for categories

### General Rules
- No fantasy -- don't invent data or sources
- Be honest -- specify what your answer is based on
- Prioritize accuracy and logic over presentation
