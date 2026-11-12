# Theming

The terminal looks like marketmaker.cc by default: near-black graphite, lime
accent, Geist and Geist Mono, rounded panels and a fine film grain.

## What the user controls

The **Appearance** button in the top bar switches between Light, Dark and Auto.
Auto follows the operating system and changes live when the OS switches.

**Customize…** in the same menu opens the Appearance panel. It is non-modal, so
every change previews on the terminal behind it.

| Setting | Options | Attribute on `<html>` |
|---|---|---|
| Dark theme | Marketmaker, Graphite, Midnight, OLED black, Amber terminal | `data-theme` |
| Light theme | Marketmaker, Light, Paper | `data-theme` |
| Accent | Theme, lime, blue, violet, orange, pink, custom colour | `data-accent`, or inline vars for custom |
| Price colours | Green up, Red up, Blue / orange (colour-blind safe) | `data-price` |
| Corners | Theme, Square, Small, Medium, Round | `data-radius` |
| Font | Geist, System, Mono | `data-font` |
| Interface size | Compact (14px), Default (16px), Large (18px) | `data-scale` |
| Texture | Film grain on or off | `data-grain="on"` |

Attributes are left off for the default value, such as `accent: 'palette'`.

Settings are saved per device in `localStorage` under `appearance` as JSON. The
older keys `themeId` and `theme` are migrated on load and removed on the next
save.

## How it works

Colours are CSS custom properties holding HSL channels (`220 13% 11%`), so
Tailwind can add opacity: `bg-terminal-accent/50`.

| Piece | File | Role |
|---|---|---|
| Palettes and options | `packages/client/src/index.css` | One `[data-theme="<id>"]` block per palette, plus one rule per option attribute. The only place with colour values. |
| Registry | `packages/client/src/lib/themes.ts` | Palettes, option lists, `Appearance` type, load/save, `applyAppearance()`. |
| React API | `packages/client/src/hooks/useTheme.tsx` | `ThemeProvider` and `useTheme()`. |
| Settings UI | `packages/client/src/components/AppearanceSettings.tsx` | The Appearance panel. |
| Pre-paint script | `packages/client/index.html` | Applies the saved appearance before the first paint, so there is no flash. Keep it in sync with `applyAppearance()`. |

`applyAppearance(appearance)` resolves Auto, sets `data-theme` and the class
`dark` or `light` (for Tailwind `dark:` variants), sets the option attributes
and returns the palette in use.

## Tokens

Every palette defines these variables:

| Variable | Tailwind class | Use |
|---|---|---|
| `--terminal-bg` | `bg-terminal-bg` | Page background |
| `--terminal-widget` | `bg-terminal-widget` | Widget and panel background |
| `--terminal-accent` | `bg-terminal-accent` | Hover, selected and secondary surfaces |
| `--terminal-text` | `text-terminal-text` | Main text |
| `--terminal-muted` | `text-terminal-muted` | Secondary text and icons |
| `--terminal-border` | `border-terminal-border` | Borders and dividers |
| `--palette-positive` | none | Buy, profit, rising price |
| `--palette-negative` | none | Sell, loss, falling price |
| `--chart-grid` | none | Chart grid lines |

Components use `text-terminal-positive` and `text-terminal-negative`. Those are
derived from the palette pair, so the price colour setting can swap or replace
them.

A palette may also set:

| Variable | Default when missing | Use |
|---|---|---|
| `--terminal-brand` | `--terminal-text` | Primary buttons (`--primary`) |
| `--terminal-brand-ink` | `--terminal-bg` | Text on primary buttons |
| `--terminal-brand-text` | `--terminal-muted` | Brand colour as text: active tab, focus ring |
| `--palette-radius` | `0.5rem` | Control corner radius (`--radius`) |
| `--palette-widget-radius` | `8px` | Widget corner radius (`--widget-radius`) |

The accent and corner settings override these.

The shadcn/ui tokens (`--background`, `--card`, `--primary`, `--ring` and the
rest) are aliases of the terminal tokens, declared once in `index.css`. A new
palette does not set them.

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

const { theme, themeId, appearance, setMode, updateAppearance, colorKey } = useTheme();
// theme:   'dark' | 'light'  (Auto already resolved)
// themeId: palette in use, e.g. 'marketmaker'
setMode('system');
updateAppearance({ accent: 'blue', priceColors: 'colorblind' });
```

Canvas libraries cannot read CSS variables. For them, `readChartColors()` from
`@/lib/themes` returns the active colours as hex. Re-read them when `colorKey`
changes; the chart widget does this.

## Adding a palette

1. Add a `[data-theme="<id>"]` block to `packages/client/src/index.css` with
   all nine variables from the first table, and any optional ones.
2. Add `{ id, label, mode }` to `THEMES` in `packages/client/src/lib/themes.ts`.
3. If the mode is `light`, add the id to the light list in the pre-paint script
   in `packages/client/index.html`.

The Appearance panel shows the new palette with a preview card. No other code
changes.

Check text contrast on `--terminal-bg` and `--terminal-widget` (WCAG AA: 4.5:1
for `--terminal-text`), and check that positive and negative stay
distinguishable on both surfaces.
