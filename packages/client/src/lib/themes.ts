/**
 * Appearance: colour mode, palettes and the other look settings.
 *
 * The palette of every theme lives in `src/index.css` under
 * `[data-theme="<id>"]`, and every other setting is a data attribute on
 * `<html>` styled there too. This file only lists the options, stores the
 * user's choice and applies it, so colour values are never duplicated in
 * TypeScript. The pre-paint script in `index.html` repeats `applyAppearance`
 * in a few lines; keep the two in sync.
 */

export type ThemeMode = 'dark' | 'light';
/** What the user picks in the menu. `system` follows the OS. */
export type ColorMode = ThemeMode | 'system';

/** How the order book draws its rows. */
export type BookStyle = 'classic' | 'bars' | 'ladder';
/** How the trades tape draws its rows. */
export type TapeStyle = 'classic' | 'plain' | 'tinted';

/**
 * Widget layout a preset brings with it. A widget may override each value in
 * its own settings; see `useWidgetLook`.
 */
export interface WidgetLook {
  book: BookStyle;
  tape: TapeStyle;
  /** Row height in px for the order book and the tape. */
  rowHeight: number;
}

/**
 * A preset is a whole look: the palette and window chrome in `index.css`
 * under `[data-theme="<id>"]`, plus the widget layout here.
 */
export interface ThemePreset {
  id: string;
  label: string;
  mode: ThemeMode;
  widgets: WidgetLook;
}

const ORIGINAL_WIDGETS: WidgetLook = { book: 'classic', tape: 'classic', rowHeight: 24 };

export const THEMES: readonly ThemePreset[] = [
  { id: 'dark', label: 'Graphite', mode: 'dark', widgets: ORIGINAL_WIDGETS },
  { id: 'onyx', label: 'Onyx', mode: 'dark', widgets: { book: 'bars', tape: 'plain', rowHeight: 20 } },
  { id: 'gold', label: 'Gold', mode: 'dark', widgets: { book: 'bars', tape: 'plain', rowHeight: 20 } },
  { id: 'dusk', label: 'Dusk', mode: 'dark', widgets: { book: 'bars', tape: 'plain', rowHeight: 18 } },
  { id: 'ladder-night', label: 'Ladder night', mode: 'dark', widgets: { book: 'ladder', tape: 'tinted', rowHeight: 16 } },
  { id: 'light', label: 'Light', mode: 'light', widgets: ORIGINAL_WIDGETS },
  { id: 'daylight', label: 'Daylight', mode: 'light', widgets: { book: 'bars', tape: 'plain', rowHeight: 20 } },
  { id: 'ladder', label: 'Ladder', mode: 'light', widgets: { book: 'ladder', tape: 'tinted', rowHeight: 16 } },
];

export const BOOK_STYLES: readonly { id: BookStyle; label: string }[] = [
  { id: 'classic', label: 'Rows' },
  { id: 'bars', label: 'Depth bars' },
  { id: 'ladder', label: 'Ladder' },
];

export const TAPE_STYLES: readonly { id: TapeStyle; label: string }[] = [
  { id: 'classic', label: 'Soft tint' },
  { id: 'plain', label: 'Coloured text' },
  { id: 'tinted', label: 'Tinted rows' },
];

/** Row heights a widget can pick instead of the preset's. */
export const ROW_HEIGHTS = [16, 18, 20, 24] as const;

export const DEFAULT_THEME_ID = 'dark';
export const DEFAULT_LIGHT_THEME_ID = 'light';

export const ACCENTS = [
  { id: 'palette', label: 'Palette', swatch: null },
  { id: 'lime', label: 'Lime', swatch: '#b9f34c' },
  { id: 'blue', label: 'Blue', swatch: '#3b82f6' },
  { id: 'violet', label: 'Violet', swatch: '#8b5cf6' },
  { id: 'orange', label: 'Orange', swatch: '#f97316' },
  { id: 'pink', label: 'Pink', swatch: '#f9a8b8' },
  { id: 'custom', label: 'Custom', swatch: null },
] as const;
export type AccentId = (typeof ACCENTS)[number]['id'];

export const PRICE_COLORS = [
  { id: 'classic', label: 'Green up', hint: 'Green for growth, red for decline' },
  { id: 'inverted', label: 'Red up', hint: 'As on Chinese, Japanese and Korean markets' },
  { id: 'colorblind', label: 'Blue / orange', hint: 'Readable with red-green colour blindness' },
] as const;
export type PriceColorsId = (typeof PRICE_COLORS)[number]['id'];

export const RADII = [
  { id: 'palette', label: 'Theme' },
  { id: 'none', label: 'Square' },
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'round', label: 'Round' },
] as const;
export type RadiusId = (typeof RADII)[number]['id'];

export const FONTS = [
  { id: 'default', label: 'Default' },
  { id: 'geist', label: 'Geist' },
  { id: 'mono', label: 'Mono' },
] as const;
export type FontId = (typeof FONTS)[number]['id'];

export const SCALES = [
  { id: 'compact', label: 'Compact' },
  { id: 'default', label: 'Default' },
  { id: 'large', label: 'Large' },
] as const;
export type ScaleId = (typeof SCALES)[number]['id'];

export interface Appearance {
  mode: ColorMode;
  /** Palette used when the mode resolves to dark. */
  darkTheme: string;
  /** Palette used when the mode resolves to light. */
  lightTheme: string;
  accent: AccentId;
  /** `#rrggbb`, used when `accent` is `custom`. */
  customAccent: string;
  priceColors: PriceColorsId;
  radius: RadiusId;
  font: FontId;
  scale: ScaleId;
  /** Fine film grain over the whole page. Off by default. */
  grain: boolean;
}

export const DEFAULT_APPEARANCE: Appearance = {
  mode: 'dark',
  darkTheme: DEFAULT_THEME_ID,
  lightTheme: DEFAULT_LIGHT_THEME_ID,
  accent: 'palette',
  customAccent: '#b9f34c',
  priceColors: 'classic',
  radius: 'palette',
  font: 'default',
  scale: 'default',
  grain: false,
};

/**
 * v2: the first version defaulted to a recoloured look; its records are
 * dropped so everyone starts again from the original palettes.
 */
const STORAGE_KEY = 'appearance.v2';
const DROPPED_KEYS = ['appearance'];
/** Written by earlier versions: a theme id, and before that only `dark` / `light`. */
const LEGACY_THEME_ID_KEY = 'themeId';
const LEGACY_MODE_KEY = 'theme';
/** Palettes that were removed, and the mode each one stood for. */
const RETIRED_THEMES: Record<string, ThemeMode> = { midnight: 'dark', oled: 'dark', amber: 'dark', paper: 'light' };

const TERMINAL_TOKENS = ['bg', 'widget', 'accent', 'text', 'muted', 'positive', 'negative', 'border'];
const CUSTOM_ACCENT_PROPS = ['--terminal-brand', '--terminal-brand-ink', '--terminal-brand-text'];

export function getTheme(id: string | null | undefined): ThemePreset {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

export function themesFor(mode: ThemeMode): ThemePreset[] {
  return THEMES.filter((t) => t.mode === mode);
}

function pick<T extends string>(value: unknown, options: readonly { id: T }[], fallback: T): T {
  return options.some((o) => o.id === value) ? (value as T) : fallback;
}

function themeOf(mode: ThemeMode, id: unknown, fallback: string): string {
  return THEMES.some((t) => t.id === id && t.mode === mode) ? (id as string) : fallback;
}

/** Fills gaps and drops unknown values, so a stale or hand-edited record is safe to apply. */
export function normalizeAppearance(raw: Partial<Record<keyof Appearance, unknown>>): Appearance {
  const d = DEFAULT_APPEARANCE;
  return {
    mode: raw.mode === 'dark' || raw.mode === 'light' || raw.mode === 'system' ? raw.mode : d.mode,
    darkTheme: themeOf('dark', raw.darkTheme, d.darkTheme),
    lightTheme: themeOf('light', raw.lightTheme, d.lightTheme),
    accent: pick(raw.accent, ACCENTS, d.accent),
    customAccent:
      typeof raw.customAccent === 'string' && /^#[0-9a-f]{6}$/i.test(raw.customAccent) ? raw.customAccent : d.customAccent,
    priceColors: pick(raw.priceColors, PRICE_COLORS, d.priceColors),
    radius: pick(raw.radius, RADII, d.radius),
    font: pick(raw.font, FONTS, d.font),
    scale: pick(raw.scale, SCALES, d.scale),
    grain: typeof raw.grain === 'boolean' ? raw.grain : d.grain,
  };
}

/**
 * Reads the stored appearance. Older versions stored one theme id: its mode
 * becomes the mode, and a palette other than the old defaults is kept.
 */
export function loadAppearance(): Appearance {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeAppearance(JSON.parse(stored));

    const legacyId = localStorage.getItem(LEGACY_THEME_ID_KEY) ?? localStorage.getItem(LEGACY_MODE_KEY);
    const legacy = THEMES.find((t) => t.id === legacyId);
    if (!legacy) {
      const retired = legacyId ? RETIRED_THEMES[legacyId] : undefined;
      return retired ? { ...DEFAULT_APPEARANCE, mode: retired } : { ...DEFAULT_APPEARANCE };
    }
    const keepPalette = legacy.id !== 'dark' && legacy.id !== 'light';
    return normalizeAppearance({
      mode: legacy.mode,
      darkTheme: keepPalette && legacy.mode === 'dark' ? legacy.id : undefined,
      lightTheme: keepPalette && legacy.mode === 'light' ? legacy.id : undefined,
    });
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearance(appearance: Appearance): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
    localStorage.removeItem(LEGACY_THEME_ID_KEY);
    localStorage.removeItem(LEGACY_MODE_KEY);
    for (const key of DROPPED_KEYS) localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable (private mode); the look still applies for this page.
  }
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true;
  }
}

export function resolveMode(mode: ColorMode, prefersDark = systemPrefersDark()): ThemeMode {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}

/** The palette shown for this appearance right now. */
export function resolveTheme(appearance: Appearance, prefersDark = systemPrefersDark()): ThemePreset {
  const mode = resolveMode(appearance.mode, prefersDark);
  return getTheme(mode === 'dark' ? appearance.darkTheme : appearance.lightTheme);
}

/** Applies an appearance to the document. Returns the palette in use. */
export function applyAppearance(appearance: Appearance): ThemePreset {
  const theme = resolveTheme(appearance);
  const root = document.documentElement;
  const data = root.dataset;

  data.theme = theme.id;
  root.classList.remove('dark', 'light');
  root.classList.add(theme.mode);
  root.style.colorScheme = theme.mode;

  const setData = (key: string, value: string | null) => {
    if (value === null) delete data[key];
    else data[key] = value;
  };
  setData('accent', appearance.accent === 'palette' || appearance.accent === 'custom' ? null : appearance.accent);
  setData('price', appearance.priceColors === 'classic' ? null : appearance.priceColors);
  setData('radius', appearance.radius === 'palette' ? null : appearance.radius);
  setData('font', appearance.font === 'default' ? null : appearance.font);
  setData('scale', appearance.scale === 'default' ? null : appearance.scale);
  setData('grain', appearance.grain ? 'on' : null);

  if (appearance.accent === 'custom') {
    const accent = customAccentTokens(appearance.customAccent, theme.mode);
    for (const [prop, value] of Object.entries(accent)) root.style.setProperty(prop, value);
  } else {
    for (const prop of CUSTOM_ACCENT_PROPS) root.style.removeProperty(prop);
  }

  // Older versions wrote the palette as inline styles, which would override the stylesheet.
  for (const token of TERMINAL_TOKENS) root.style.removeProperty(`--terminal-${token}`);

  return theme;
}

/** `#rrggbb` to the `h s% l%` channels the CSS variables hold. */
export function hexToHslChannels(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return null;
  const [r, g, b] = m.slice(1).map((c) => parseInt(c, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Brand tokens for a user-picked accent colour: the fill itself, readable ink
 * on top of it, and a text variant dark enough for light themes.
 */
export function customAccentTokens(hex: string, mode: ThemeMode): Record<string, string> {
  const hsl = hexToHslChannels(hex) ?? hexToHslChannels(DEFAULT_APPEARANCE.customAccent)!;
  const [h, s, l] = hsl;
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  const [r, g, b] = (m ? m.slice(1) : ['b9', 'f3', '4c']).map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const textL = mode === 'light' ? Math.min(l, 38) : Math.max(l, 62);
  return {
    '--terminal-brand': `${h} ${s}% ${l}%`,
    '--terminal-brand-ink': luminance > 0.4 ? '220 13% 5%' : '0 0% 100%',
    '--terminal-brand-text': `${h} ${s}% ${textL}%`,
  };
}
