# Theming

The terminal keeps its original look by default: the Graphite dark palette,
the system font, 8px widget corners and no texture. Everything below is opt-in.

## What the user controls

The **Appearance** button in the top bar switches between Light, Dark and Auto.
Auto follows the operating system and changes live when the OS switches.

**Customize…** in the same menu opens the Appearance panel. It is non-modal, so
every change previews on the terminal behind it.

| Setting | Options | Attribute on `<html>` |
|---|---|---|
| Dark theme | Graphite, Onyx, Gold, Dusk, Ladder night | `data-theme` |
| Light theme | Light, Daylight, Ladder | `data-theme` |
| Accent | Theme, lime, blue, violet, orange, pink, custom colour | `data-accent`, or inline vars for custom |
| Price colours | Green up, Red up, Blue / orange (colour-blind safe) | `data-price` |
| Corners | Theme, Square, Small, Medium, Round | `data-radius` |
| Font | Default, Geist, Mono | `data-font` |
| Interface size | Compact (14px), Default (16px), Large (18px) | `data-scale` |
| Texture | Film grain on or off | `data-grain="on"` |

Attributes are left off for the default value, such as `accent: 'palette'`.

Graphite and Light are the original look. The other palettes are presets: each
brings its own colours, window chrome (header height and colour, borders,
shadows, fonts) and a layout for the order book and the trades tape. Ids of
removed palettes (`midnight`, `oled`, `amber`, `paper`) fall back to Graphite
or Light.

Settings are saved per device in `localStorage` under `appearance.v2` as JSON.
The older keys `themeId` and `theme` are migrated on load; they and the old
`appearance` key are removed on the next save.

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
| `--terminal-brand-text` | `--terminal-muted` | Brand colour as text: focus ring |
| `--palette-radius` | `0.5rem` | Control corner radius (`--radius`) |
| `--palette-widget-radius` | `8px` | Widget corner radius (`--widget-radius`) |

| `--palette-header-h` | `2.5rem` | Widget header height |
| `--palette-header-bg` | accent at 60% | Widget header background |
| `--palette-header-text` / `--palette-header-muted` | text / muted | Header title and icon colours |
| `--palette-widget-border` | `--terminal-border` | Widget border colour |
| `--palette-shadow` | the original shadow | Widget shadow (`none` for flat presets) |
| `--palette-widget-pad` | `0.75rem` | Padding inside widgets that have padding |
| `--palette-font` / `--palette-num-font` | inherit / monospace | Interface font and the font for numbers |
| `--palette-row-font` | `0.75rem` | Font size in order book and tape rows |
| `--palette-book-ask-text` / `-bid-text` | negative / positive | Price text in the book |
| `--palette-book-ask-bar` / `-bid-bar` | negative / positive at 18% | Depth bars |
| `--palette-book-ask-zone` / `-bid-zone` | negative / positive at 12% | Ladder row backgrounds, tinted tape |
| `--palette-book-volume-bar` | muted at 35% | Ladder volume bars |

Components read the aliases without the `palette-` prefix (`--widget-header-h`,
`--book-ask-bar` and so on), defined once in the `[data-theme]` block. The
accent and corner settings override the radius and brand values.

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

const { theme, themeId, appearance, setMode, updateAppearance } = useTheme();
// theme:   'dark' | 'light'  (Auto already resolved)
// themeId: palette in use, e.g. 'dark'
setMode('system');
updateAppearance({ accent: 'blue', priceColors: 'colorblind' });
```

The chart widget keeps its own canvas colours for light and dark (see
`getChartColors` in `widgets/Chart.tsx`).

## Widget look

A preset also sets `widgets` in `THEMES`:

| Field | Values | Meaning |
|---|---|---|
| `book` | `classic`, `bars`, `ladder` | Order book rows: the original rows, depth bars, or a ladder with zone backgrounds and volume bars |
| `tape` | `classic`, `plain`, `tinted` | Trades rows: the original soft tint, coloured text only, or zone backgrounds |
| `rowHeight` | 16, 18, 20, 24 | Row height in px |

`useWidgetLook(override)` returns the look for one widget. Each order book and
trades widget has a Style section in its settings; "Preset" follows the theme,
any other choice is stored in that widget's `look`.

## Adding a palette

1. Add a `[data-theme="<id>"]` block to `packages/client/src/index.css` with
   all nine variables from the first table, and any optional ones.
2. Add `{ id, label, mode, widgets }` to `THEMES` in
   `packages/client/src/lib/themes.ts`.
3. Add the id to `known` (and, for a light palette, to `light`) in the
   pre-paint script in `packages/client/index.html`.

The Appearance panel shows the new palette with a preview card. No other code
changes.

Check text contrast on `--terminal-bg` and `--terminal-widget` (WCAG AA: 4.5:1
for `--terminal-text`), and check that positive and negative stay
distinguishable on both surfaces.
