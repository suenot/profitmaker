# Theming

The terminal ships with six themes: Graphite (default), Midnight, OLED black,
Amber terminal, Light and Paper. The user picks one from the palette button in
the top bar. The choice is stored in `localStorage` under `themeId`.

## How it works

Colours are CSS custom properties holding HSL channels (`220 13% 11%`), so
Tailwind can add opacity: `bg-terminal-accent/50`.

| Piece | File | Role |
|---|---|---|
| Palettes | `packages/client/src/index.css` | One `[data-theme="<id>"]` block per theme. The only place with colour values. |
| Registry | `packages/client/src/lib/themes.ts` | Lists theme ids, labels and mode (`dark` or `light`). Applies a theme. |
| React API | `packages/client/src/hooks/useTheme.tsx` | `ThemeProvider` and `useTheme()`. |
| Pre-paint script | `packages/client/index.html` | Sets the theme before the first paint, so there is no flash. |

`applyTheme(id)` sets `data-theme="<id>"` on `<html>`, plus the class `dark` or
`light`. The class keeps Tailwind `dark:` variants working.

## Tokens

Every theme defines these variables:

| Variable | Tailwind class | Use |
|---|---|---|
| `--terminal-bg` | `bg-terminal-bg` | Page background |
| `--terminal-widget` | `bg-terminal-widget` | Widget and panel background |
| `--terminal-accent` | `bg-terminal-accent` | Hover, selected and secondary surfaces |
| `--terminal-text` | `text-terminal-text` | Main text |
| `--terminal-muted` | `text-terminal-muted` | Secondary text and icons |
| `--terminal-border` | `border-terminal-border` | Borders and dividers |
| `--terminal-positive` | `text-terminal-positive` | Buy, profit, rising price |
| `--terminal-negative` | `text-terminal-negative` | Sell, loss, falling price |
| `--chart-grid` | none | Chart grid lines |

The shadcn/ui tokens (`--background`, `--card`, `--popover`, `--border`,
`--muted`, `--sidebar-*` and the rest) are aliases of the terminal tokens. They
are declared once, in the `:root, [data-theme]` block of `index.css`. A new
theme does not have to set them.

## Using the theme in a component

Use the Tailwind classes. Do not write hex colours or palette classes such as
`bg-gray-800` or `text-green-500`: they ignore the active theme.

```tsx
<div className="bg-terminal-widget border border-terminal-border text-terminal-text">
  <span className="text-terminal-positive">+2.4%</span>
</div>
```

In React:

```tsx
import { useTheme } from '@/hooks/useTheme';

const { theme, themeId, themes, setTheme } = useTheme();
// theme:   'dark' | 'light'  (mode of the active theme)
// themeId: 'dark' | 'midnight' | 'oled' | 'amber' | 'light' | 'paper'
setTheme('midnight');
```

Canvas libraries cannot read CSS variables. For them, `readChartColors()` from
`@/lib/themes` returns the active palette as hex. The chart widget uses it.

## Adding a theme

1. Add a `[data-theme="<id>"]` block to `packages/client/src/index.css` with
   all nine variables from the table above.
2. Add `{ id, label, mode }` to `THEMES` in `packages/client/src/lib/themes.ts`.
3. If the mode is `light`, add the id to the light list in the pre-paint script
   in `packages/client/index.html`.

The picker shows the new theme with a preview swatch. No other code changes.

Check text contrast on `--terminal-bg` and `--terminal-widget` (WCAG AA: 4.5:1
for `--terminal-text`), and check that positive and negative stay
distinguishable on both surfaces.

## Modules

Module widgets render inside the terminal document, so the same classes and
variables apply to them. See `docs/modules.md`.
