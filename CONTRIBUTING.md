# Contributing to Profitmaker

Thanks for your interest in contributing! Profitmaker is an open source crypto trading terminal.

## Getting Started

```bash
# Fork and clone
git clone https://github.com/<your-username>/profitmaker.git
cd profitmaker

# Install dependencies (Bun required)
bun install

# Start development
bun dev          # Client on port 8080
bun server:dev   # Server on port 3001 (optional)
```

## Project Structure

```
packages/
├── types/    # @profitmaker/types -- shared TypeScript types
├── core/     # @profitmaker/core -- CCXT wrappers, encryption, formatters
├── server/   # @profitmaker/server -- Express + Socket.IO backend
└── client/   # @profitmaker/client -- React + Vite frontend (widgets, stores, UI)
```

## Pull Request Process

1. Create a feature branch from `master`
2. Make your changes
3. Run tests: `bun test`
4. Run lint: `bun lint`
5. Ensure production build works: `bun run build`
6. Open a PR with a clear description of what changed and why

## Code Style

See [CRUSH.md](./CRUSH.md) for detailed coding guidelines. Key points:

- TypeScript for all files
- shadcn/ui for UI components
- Zustand for state management
- Use selectors: `useStore(s => s.field)` not `useStore()`
- Virtual scroll for lists >50 items

## Adding a Widget

Widgets are resolved through a dynamic **WidgetRegistry**
(`packages/client/src/modules/registry.ts`) keyed by a `type` string. You have
two paths:

### Built-in widget (ships with the terminal)

1. Create the component in `packages/client/src/components/widgets/YourWidget.tsx`.
2. Register it in `packages/client/src/modules/builtinWidgets.tsx` — add a
   `WidgetDefinition` (`type`, `title`, `icon`, `category`, `defaultSize`,
   `Component`, optional `Settings`/`HeaderActions`) to `BUILTIN_DEFINITIONS`.
   `category` (`public` | `private` | `diagnostics`) controls its menu section;
   `system` widgets are registered but not shown in the add-widget menu.

That's it — `TradingTerminal`, `WidgetMenu`, `WidgetSettingsManager` and
`WidgetSimple` all read the registry, so no other wiring is needed. The widget
`type` is a free-form string (`WidgetSchema.type` is `z.string().min(1)`); the
prior built-in list lives as `BUILTIN_WIDGET_TYPES` in
`packages/{client,types}/src/dashboard.ts` for reference.

### As a module (no core changes)

For anything community-facing or full-stack (a widget + a backend service),
build a **module** instead of touching the core. Copy `templates/module-template/`
and follow `docs/modules.md` (and the template's `AGENTS.md`). Modules register
widgets at runtime via the host Terminal API and appear in the add-widget menu's
**Modules** section — no PR to this repo required.

## Reporting Issues

- **Bugs**: open a GitHub issue with steps to reproduce
- **Security vulnerabilities**: email [suenot@gmail.com](mailto:suenot@gmail.com) directly

## License

By contributing, you agree that your contributions will be licensed under the MIT License with Commons Clause.
