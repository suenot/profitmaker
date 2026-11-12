/**
 * Theme registry.
 *
 * The palette of every theme lives in `src/index.css` under
 * `[data-theme="<id>"]`. This file only lists which themes exist and applies
 * one of them, so colour values are never duplicated in TypeScript.
 */

export type ThemeMode = 'dark' | 'light';

export interface ThemePreset {
  id: string;
  label: string;
  mode: ThemeMode;
}

export const THEMES: readonly ThemePreset[] = [
  { id: 'dark', label: 'Graphite', mode: 'dark' },
  { id: 'midnight', label: 'Midnight', mode: 'dark' },
  { id: 'oled', label: 'OLED black', mode: 'dark' },
  { id: 'amber', label: 'Amber terminal', mode: 'dark' },
  { id: 'light', label: 'Light', mode: 'light' },
  { id: 'paper', label: 'Paper', mode: 'light' },
];

export const DEFAULT_THEME_ID = 'dark';

const STORAGE_KEY = 'themeId';
/** Written by versions that only knew `dark` and `light`; kept in sync as the mode. */
const LEGACY_STORAGE_KEY = 'theme';

const TERMINAL_TOKENS = ['bg', 'widget', 'accent', 'text', 'muted', 'positive', 'negative', 'border'];

export function getTheme(id: string | null | undefined): ThemePreset {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

export function getStoredThemeId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return getTheme(stored).id;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

/** Applies a theme to the document and remembers it. Returns the applied preset. */
export function applyTheme(id: string): ThemePreset {
  const theme = getTheme(id);
  const root = document.documentElement;

  root.dataset.theme = theme.id;
  root.classList.remove('dark', 'light');
  root.classList.add(theme.mode);
  root.style.colorScheme = theme.mode;

  // Older versions wrote the palette as inline styles, which would override the stylesheet.
  for (const token of TERMINAL_TOKENS) root.style.removeProperty(`--terminal-${token}`);

  try {
    localStorage.setItem(STORAGE_KEY, theme.id);
    localStorage.setItem(LEGACY_STORAGE_KEY, theme.mode);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this page.
  }
  return theme;
}

/** Converts a CSS variable value such as `220 13% 11%` to `#191c20`. */
export function hslToHex(value: string, fallback = '#000000'): string {
  const parts = value.trim().split(/[\s,/]+/).map((p) => parseFloat(p));
  if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) return fallback;

  const h = ((parts[0] % 360) + 360) % 360;
  const s = Math.min(Math.max(parts[1], 0), 100) / 100;
  const l = Math.min(Math.max(parts[2], 0), 100) / 100;

  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

export interface ChartColors {
  back: string;
  grid: string;
  text: string;
  /** Highlighted text: axis labels under the crosshair. */
  textHL: string;
  /** Legend title. */
  textLG: string;
  /** Legend values. */
  llValue: string;
  /** Legend bar background, translucent. */
  llBack: string;
  scale: string;
  cross: string;
  candleUp: string;
  candleDw: string;
  wickUp: string;
  wickDw: string;
  volUp: string;
  volDw: string;
}

/** Chart colours of the active theme, as hex (canvas libraries cannot read CSS variables). */
export function readChartColors(): ChartColors {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => hslToHex(style.getPropertyValue(name), fallback);

  const up = token('--terminal-positive', '#16c784');
  const down = token('--terminal-negative', '#ea3943');
  const back = token('--terminal-widget', '#22262f');
  const text = token('--terminal-text', '#f8fafc');
  const muted = token('--terminal-muted', '#b6bfc9');
  return {
    back,
    grid: token('--chart-grid', '#2b303b'),
    text: muted,
    textHL: text,
    textLG: text,
    llValue: muted,
    llBack: `${back}77`,
    scale: token('--terminal-border', '#323a4d'),
    cross: muted,
    candleUp: up,
    candleDw: down,
    wickUp: up,
    wickDw: down,
    volUp: up,
    volDw: down,
  };
}
